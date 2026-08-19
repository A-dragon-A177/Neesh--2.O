package com.neeshai.backend.notification;

import com.neeshai.backend.audience.AudienceQuestion;
import com.neeshai.backend.audience.AudienceQuestionRepository;
import com.neeshai.backend.project.Project;
import com.neeshai.backend.project.ProjectRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final double SIMILARITY_THRESHOLD = 0.6;

    private final QuestionClusterRepository clusterRepository;
    private final ClusterInstanceRepository instanceRepository;
    private final ClusterReplyRepository replyRepository;
    private final ProjectRepository projectRepository;
    private final AudienceQuestionRepository audienceQuestionRepository;

    private final com.neeshai.backend.email.EmailService emailService;

    public NotificationService(QuestionClusterRepository clusterRepository,
            ClusterInstanceRepository instanceRepository,
            ClusterReplyRepository replyRepository,
            ProjectRepository projectRepository,
            AudienceQuestionRepository audienceQuestionRepository,
            com.neeshai.backend.email.EmailService emailService) {
        this.clusterRepository = clusterRepository;
        this.instanceRepository = instanceRepository;
        this.replyRepository = replyRepository;
        this.projectRepository = projectRepository;
        this.audienceQuestionRepository = audienceQuestionRepository;
        this.emailService = emailService;
    }

    private static final java.util.regex.Pattern GREETING_PATTERN = java.util.regex.Pattern.compile(
            "^(hi|hello|hey|howdy|greetings|good\\s*(morning|afternoon|evening)|what'?s?\\s*up|sup|yo|hola|namaste|ok|okay|k|thanks|thank\\s*you|thx|ty|cool|great|nice|awesome|got\\s*it|understood|bye|goodbye|see\\s*ya|test|testing)[\\s!?.,]*$",
            java.util.regex.Pattern.CASE_INSENSITIVE);

    public static boolean isGreetingOrFiller(String text) {
        if (text == null || text.trim().isBlank()) {
            return true;
        }
        String clean = text.trim();
        if (clean.length() <= 2 && !clean.equalsIgnoreCase("ai") && !clean.equalsIgnoreCase("ui")) {
            return true;
        }
        return GREETING_PATTERN.matcher(clean).matches();
    }

    // ===== Question Intake =====

    @Transactional
    public QuestionCluster ingestQuestion(UUID projectId, String questionText,
            String userName, String userEmail,
            String persona, String source) {
        return ingestQuestion(projectId, questionText, null, false, userName, userEmail, persona, source);
    }

    @Transactional
    public QuestionCluster ingestQuestion(UUID projectId, String questionText,
            String answerText, boolean isAnswered,
            String userName, String userEmail,
            String persona, String source) {
        if (questionText == null || questionText.isBlank() || isGreetingOrFiller(questionText)) {
            log.info("Skipping question cluster ingestion for greeting/filler/empty: '{}'", questionText);
            return null;
        }

        log.info("Ingesting question for project {}: '{}' (answered={})", projectId, questionText, isAnswered);

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found: " + projectId));

        String normalized = normalize(questionText);

        // Synchronize on projectId to prevent concurrent thread race conditions creating duplicate clusters
        synchronized (projectId.toString().intern()) {
            // Try exact normalized match first
            QuestionCluster cluster = clusterRepository.findByProjectIdAndNormalizedQuestion(projectId, normalized);

            // If no exact match, try fuzzy matching against existing clusters
            if (cluster == null) {
                List<QuestionCluster> existingClusters = clusterRepository
                        .findByProjectIdOrderByPriorityScoreDesc(projectId);
                cluster = findSimilarCluster(normalized, existingClusters);
            }

            if (cluster == null) {
                // Create new cluster
                cluster = new QuestionCluster(project, questionText, normalized);
                cluster.setTotalAskCount(1);
                cluster.setStatus(isAnswered ? "ANSWERED" : "UNANSWERED");
                cluster.setFirstAskedAt(Instant.now());
                cluster.setLastAskedAt(Instant.now());
                cluster = clusterRepository.save(cluster);
                log.info("Created new cluster: {}", cluster.getId());
            } else {
                // Update existing cluster
                cluster.setTotalAskCount(cluster.getTotalAskCount() + 1);
                cluster.setLastAskedAt(Instant.now());
                cluster = clusterRepository.save(cluster);
                log.info("Added to existing cluster: {} (now {} asks)", cluster.getId(), cluster.getTotalAskCount());
            }

            // Create instance
            ClusterInstance instance = new ClusterInstance(cluster, questionText, source,
                    userName, userEmail, persona);
            if (isAnswered && answerText != null && !answerText.isBlank()) {
                instance.setStatus("ANSWERED");
                instance.setAnswerContent(answerText.trim());
                instance.setAnsweredAt(Instant.now());
            } else {
                instance.setStatus("UNANSWERED");
            }
            instanceRepository.save(instance);

            // Recompute cluster status based on instances
            long totalInstances = instanceRepository.countByClusterId(cluster.getId());
            long answeredInstances = instanceRepository.countAnsweredByClusterId(cluster.getId());
            if (answeredInstances >= totalInstances && totalInstances > 0) {
                cluster.setStatus("ANSWERED");
            } else if (answeredInstances > 0) {
                cluster.setStatus("PARTIALLY_ANSWERED");
            } else {
                cluster.setStatus("UNANSWERED");
            }
            clusterRepository.save(cluster);

            // Recompute priority and persona summary
            recomputeClusterMetadata(cluster);

            return cluster;
        }
    }

    // ===== Cluster Listing =====

    @Transactional
    public void deduplicateAndCleanupClusters(UUID projectId) {
        try {
            List<QuestionCluster> allClusters = clusterRepository.findByProjectIdOrderByPriorityScoreDesc(projectId);
            if (allClusters == null || allClusters.isEmpty()) {
                return;
            }

            // 1. Resolve greeting clusters so they don't clutter the inbox
            for (QuestionCluster c : allClusters) {
                if (isGreetingOrFiller(c.getCanonicalQuestion()) || isGreetingOrFiller(c.getNormalizedQuestion())) {
                    c.setStatus("RESOLVED");
                    clusterRepository.save(c);
                }
            }

            // 2. Deduplicate identical normalized questions
            Map<String, List<QuestionCluster>> grouped = allClusters.stream()
                    .filter(c -> !isGreetingOrFiller(c.getCanonicalQuestion()))
                    .collect(Collectors.groupingBy(QuestionCluster::getNormalizedQuestion));

            for (Map.Entry<String, List<QuestionCluster>> entry : grouped.entrySet()) {
                List<QuestionCluster> duplicates = entry.getValue();
                if (duplicates.size() > 1) {
                    QuestionCluster primary = duplicates.get(0);
                    for (int i = 1; i < duplicates.size(); i++) {
                        QuestionCluster dup = duplicates.get(i);
                        List<ClusterInstance> dupInstances = instanceRepository.findByClusterIdOrderByAskedAtDesc(dup.getId());
                        for (ClusterInstance inst : dupInstances) {
                            inst.setCluster(primary);
                            instanceRepository.save(inst);
                        }
                        List<ClusterReply> dupReplies = replyRepository.findByClusterIdOrderBySentAtDesc(dup.getId());
                        for (ClusterReply rep : dupReplies) {
                            rep.setCluster(primary);
                            replyRepository.save(rep);
                        }
                        clusterRepository.delete(dup);
                        log.info("Merged duplicate cluster {} into primary {}", dup.getId(), primary.getId());
                    }
                    long total = instanceRepository.countByClusterId(primary.getId());
                    primary.setTotalAskCount((int) total);
                    long answered = instanceRepository.countAnsweredByClusterId(primary.getId());
                    if (answered >= total && total > 0) {
                        primary.setStatus("ANSWERED");
                    } else if (answered > 0) {
                        primary.setStatus("PARTIALLY_ANSWERED");
                    } else {
                        primary.setStatus("UNANSWERED");
                    }
                    recomputeClusterMetadata(primary);
                }
            }
        } catch (Exception e) {
            log.warn("Cluster deduplication cleanup warning: {}", e.getMessage());
        }
    }

    @Transactional
    public NotificationDTOs.ClusterListResponse getClusters(UUID projectId, UUID userId, String status,
            String sort, String search) {
        Project project = projectRepository.findById(projectId)
                .filter(p -> !p.isDeleted())
                .filter(p -> p.getOwnerId().equals(userId))
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Project not found or unauthorized"));

        // Auto-heal duplicate clusters and greeting clusters
        deduplicateAndCleanupClusters(projectId);

        List<QuestionCluster> clusters;
        if (status != null && !status.isEmpty() && !"all".equalsIgnoreCase(status)) {
            clusters = clusterRepository.findByProjectIdAndStatusOrderByPriorityScoreDesc(projectId,
                    status.toUpperCase());
        } else {
            clusters = clusterRepository.findByProjectIdOrderByPriorityScoreDesc(projectId);
        }

        // Apply search filter
        if (search != null && !search.isEmpty()) {
            String searchLower = search.toLowerCase();
            clusters = clusters.stream()
                    .filter(c -> c.getCanonicalQuestion().toLowerCase().contains(searchLower))
                    .collect(Collectors.toList());
        }

        // Apply sorting
        if ("recent".equalsIgnoreCase(sort)) {
            clusters.sort(Comparator.comparing(QuestionCluster::getLastAskedAt).reversed());
        } else if ("most_asked".equalsIgnoreCase(sort)) {
            clusters.sort(Comparator.comparingInt(QuestionCluster::getTotalAskCount).reversed());
        }
        // default: priority (already sorted by priorityScore desc)

        long unansweredCount = clusterRepository.countUnansweredByProjectId(projectId);

        List<NotificationDTOs.ClusterSummaryResponse> summaries = clusters.stream()
                .map(NotificationDTOs.ClusterSummaryResponse::fromEntity)
                .collect(Collectors.toList());

        return new NotificationDTOs.ClusterListResponse(summaries, summaries.size(), unansweredCount);
    }

    /**
     * Cursor-only cluster listing (NO COUNT(*) query issued).
     */
    public com.neeshai.backend.util.CursorResponse<NotificationDTOs.ClusterSummaryResponse> getClustersCursor(
            UUID projectId, UUID userId, String cursor, int limit) {
        projectRepository.findById(projectId)
                .filter(p -> !p.isDeleted())
                .filter(p -> p.getOwnerId().equals(userId))
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Project not found or unauthorized"));

        int fetchSize = Math.min(Math.max(1, limit), 100);
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, fetchSize + 1);

        List<QuestionCluster> clusters = clusterRepository.findClustersByProjectIdCursor(projectId, pageable);
        boolean hasMore = clusters.size() > fetchSize;
        if (hasMore) {
            clusters = clusters.subList(0, fetchSize);
        }
        String nextCursor = hasMore ? clusters.get(clusters.size() - 1).getId().toString() : null;
        List<NotificationDTOs.ClusterSummaryResponse> summaries = clusters.stream()
                .map(NotificationDTOs.ClusterSummaryResponse::fromEntity)
                .collect(Collectors.toList());
        return new com.neeshai.backend.util.CursorResponse<>(summaries, nextCursor, hasMore);
    }

    // ===== Cluster Detail =====

    public NotificationDTOs.ClusterDetailResponse getClusterDetail(UUID clusterId, UUID userId) {
        QuestionCluster cluster = clusterRepository.findById(clusterId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Cluster not found"));

        projectRepository.findById(cluster.getProject().getId())
                .filter(p -> !p.isDeleted())
                .filter(p -> p.getOwnerId().equals(userId))
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Cluster not found or unauthorized"));

        List<ClusterInstance> instances = instanceRepository.findByClusterIdOrderByAskedAtDesc(clusterId);
        List<ClusterReply> replies = replyRepository.findByClusterIdOrderBySentAtDesc(clusterId);

        return new NotificationDTOs.ClusterDetailResponse(
                cluster.getId(),
                cluster.getCanonicalQuestion(),
                cluster.getTotalAskCount(),
                cluster.getStatus(),
                cluster.getPersonaSummary(),
                cluster.getPriorityScore(),
                cluster.getFirstAskedAt(),
                cluster.getLastAskedAt(),
                instances.stream().map(NotificationDTOs.ClusterInstanceDTO::fromEntity).toList(),
                replies.stream().map(NotificationDTOs.ReplyHistoryDTO::fromEntity).toList());
    }

    // ===== Send Reply =====

    @Transactional
    public NotificationDTOs.SendReplyResponse sendReply(UUID clusterId, NotificationDTOs.SendReplyRequest request,
            UUID userId) {
        QuestionCluster cluster = clusterRepository.findById(clusterId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Cluster not found"));

        projectRepository.findById(cluster.getProject().getId())
                .filter(p -> !p.isDeleted())
                .filter(p -> p.getOwnerId().equals(userId))
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Cluster not found or unauthorized"));

        List<ClusterInstance> toAnswer;
        if (request.sendToAll()) {
            toAnswer = instanceRepository.findByClusterIdAndStatus(clusterId, "UNANSWERED");
        } else {
            toAnswer = request.instanceIds().stream()
                    .map(id -> instanceRepository.findById(id)
                            .orElseThrow(() -> new RuntimeException("Instance not found: " + id)))
                    .filter(i -> "UNANSWERED".equals(i.getStatus()))
                    .collect(Collectors.toList());
        }

        Instant now = Instant.now();
        UUID projectId = cluster.getProject().getId();
        List<AudienceQuestion> audienceQuestions = audienceQuestionRepository.findByAudienceMemberProjectId(projectId);

        for (ClusterInstance instance : toAnswer) {
            instance.setStatus("ANSWERED");
            instance.setAnsweredAt(now);
            instance.setAnswerContent(request.answerText());
            instance.setAnsweredBy(userId);
            instanceRepository.save(instance);

            // Sync with AudienceQuestion entity so Audience Inbox marks it answered
            if (audienceQuestions != null && !audienceQuestions.isEmpty()) {
                for (AudienceQuestion q : audienceQuestions) {
                    if (q.getAudienceMember() != null && q.getQuestionText() != null) {
                        boolean emailMatch = instance.getUserEmail() != null && instance.getUserEmail().equalsIgnoreCase(q.getAudienceMember().getEmail());
                        boolean questionMatch = instance.getOriginalQuestion() != null && (q.getQuestionText().equalsIgnoreCase(instance.getOriginalQuestion()) || q.getQuestionText().contains(instance.getOriginalQuestion()) || instance.getOriginalQuestion().contains(q.getQuestionText()));
                        if (emailMatch || questionMatch) {
                            q.setCustomAdminAnswer(request.answerText().trim());
                            q.setStatus("answered");
                            q.setRespondedAt(now);
                            if (q.getAnsweredAt() == null) {
                                q.setAnsweredAt(now);
                            }
                            audienceQuestionRepository.save(q);
                        }
                    }
                }
            }

            // Send email
            if (instance.getUserEmail() != null && !instance.getUserEmail().isEmpty() && !instance.getUserEmail().endsWith("@chatbot")) {
                emailService.sendReply(instance.getUserEmail(), request.emailSubject(), request.answerText());
            } else {
                log.info("Skipping email for user '{}' (no email provided)", instance.getUserName());
            }
        }

        // Create reply audit log
        String recipientIdsJson = toAnswer.stream()
                .map(i -> "\"" + i.getId().toString() + "\"")
                .collect(Collectors.joining(",", "[", "]"));

        ClusterReply reply = new ClusterReply(cluster, request.answerText(),
                request.emailSubject(), recipientIdsJson, toAnswer.size(), userId);
        replyRepository.save(reply);

        // Recompute cluster status
        long totalInstances = instanceRepository.countByClusterId(clusterId);
        long answeredInstances = instanceRepository.countAnsweredByClusterId(clusterId);

        if (answeredInstances >= totalInstances) {
            cluster.setStatus("ANSWERED");
        } else if (answeredInstances > 0) {
            cluster.setStatus("PARTIALLY_ANSWERED");
        }
        clusterRepository.save(cluster);

        return new NotificationDTOs.SendReplyResponse(
                clusterId,
                toAnswer.size(),
                (int) totalInstances,
                cluster.getStatus());
    }

    // ===== Badge Count =====

    public long getUnansweredCount(UUID projectId, UUID userId) {
        projectRepository.findById(projectId)
                .filter(p -> !p.isDeleted())
                .filter(p -> p.getOwnerId().equals(userId))
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Project not found or unauthorized"));
        return clusterRepository.countUnansweredByProjectId(projectId);
    }

    // ===== Internal Helpers =====

    private void recomputeClusterMetadata(QuestionCluster cluster) {
        List<ClusterInstance> instances = instanceRepository.findByClusterIdOrderByAskedAtDesc(cluster.getId());

        // Persona summary
        Map<String, Long> personaCounts = instances.stream()
                .filter(i -> i.getUserPersona() != null && !i.getUserPersona().isEmpty())
                .collect(Collectors.groupingBy(ClusterInstance::getUserPersona, Collectors.counting()));

        StringBuilder sb = new StringBuilder("{");
        personaCounts.forEach((persona, count) -> {
            if (sb.length() > 1)
                sb.append(",");
            sb.append("\"").append(persona).append("\":").append(count);
        });
        sb.append("}");
        cluster.setPersonaSummary(sb.toString());

        // Priority score = frequency * recency_weight
        double frequency = cluster.getTotalAskCount();
        double hoursSinceLastAsk = (Instant.now().toEpochMilli() - cluster.getLastAskedAt().toEpochMilli()) / 3600000.0;
        double recencyWeight = Math.max(0.1, 1.0 / (1.0 + hoursSinceLastAsk / 24.0)); // decays over days
        cluster.setPriorityScore(frequency * recencyWeight);

        clusterRepository.save(cluster);
    }

    private String normalize(String text) {
        if (text == null)
            return "";
        return text.toLowerCase()
                .replaceAll("[^a-z0-9\\s]", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private QuestionCluster findSimilarCluster(String normalized, List<QuestionCluster> existing) {
        QuestionCluster bestMatch = null;
        double bestSimilarity = 0;

        for (QuestionCluster cluster : existing) {
            double similarity = computeSimilarity(normalized, cluster.getNormalizedQuestion());
            if (similarity > SIMILARITY_THRESHOLD && similarity > bestSimilarity) {
                bestMatch = cluster;
                bestSimilarity = similarity;
            }
        }

        if (bestMatch != null) {
            log.info("Fuzzy matched to cluster '{}' with similarity {}", bestMatch.getCanonicalQuestion(),
                    bestSimilarity);
        }

        return bestMatch;
    }

    /**
     * Simple token-overlap based similarity (Jaccard index).
     * Phase 2 will replace this with embedding-based similarity.
     */
    private double computeSimilarity(String a, String b) {
        Set<String> tokensA = new HashSet<>(Arrays.asList(a.split("\\s+")));
        Set<String> tokensB = new HashSet<>(Arrays.asList(b.split("\\s+")));

        // Remove stop words
        Set<String> stopWords = Set.of("a", "an", "the", "is", "are", "was", "were", "be",
                "been", "being", "have", "has", "had", "do", "does", "did", "will", "would",
                "could", "should", "may", "might", "can", "to", "of", "in", "for", "on",
                "with", "at", "by", "from", "as", "into", "about", "what", "how", "which",
                "who", "when", "where", "why", "i", "me", "my", "we", "you", "your", "it",
                "its", "this", "that", "these", "those");
        tokensA.removeAll(stopWords);
        tokensB.removeAll(stopWords);

        if (tokensA.isEmpty() || tokensB.isEmpty())
            return 0;

        Set<String> intersection = new HashSet<>(tokensA);
        intersection.retainAll(tokensB);

        Set<String> union = new HashSet<>(tokensA);
        union.addAll(tokensB);

        return (double) intersection.size() / union.size();
    }
}
