package com.neeshai.backend.audience;

import com.neeshai.backend.email.EmailService;
import com.neeshai.backend.notification.ClusterInstance;
import com.neeshai.backend.notification.ClusterInstanceRepository;
import com.neeshai.backend.notification.QuestionCluster;
import com.neeshai.backend.notification.QuestionClusterRepository;
import com.neeshai.backend.project.ProjectRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class AudienceService {

    private static final Logger log = LoggerFactory.getLogger(AudienceService.class);

    private final AudienceMemberRepository memberRepository;
    private final AudienceQuestionRepository questionRepository;
    private final ProjectRepository projectRepository;
    private final EmailService emailService;
    private final com.neeshai.backend.notification.NotificationService notificationService;
    private final ClusterInstanceRepository clusterInstanceRepository;
    private final QuestionClusterRepository questionClusterRepository;

    public AudienceService(AudienceMemberRepository memberRepository,
            AudienceQuestionRepository questionRepository,
            ProjectRepository projectRepository,
            EmailService emailService,
            com.neeshai.backend.notification.NotificationService notificationService,
            ClusterInstanceRepository clusterInstanceRepository,
            QuestionClusterRepository questionClusterRepository) {
        this.memberRepository = memberRepository;
        this.questionRepository = questionRepository;
        this.projectRepository = projectRepository;
        this.emailService = emailService;
        this.notificationService = notificationService;
        this.clusterInstanceRepository = clusterInstanceRepository;
        this.questionClusterRepository = questionClusterRepository;
    }

    /**
     * List all audience members for a project.
     */
    @Transactional(readOnly = true)
    public AudienceDTOs.AudienceMemberListResponse getAudienceMembers(UUID projectId, UUID ownerId) {
        projectRepository.findById(projectId)
                .filter(p -> !p.isDeleted())
                .filter(p -> p.getOwnerId().equals(ownerId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found or unauthorized"));

        List<AudienceMember> members = memberRepository.findRealAudienceByProjectId(projectId);
        List<AudienceDTOs.AudienceMemberSummary> summaries = members.stream()
                .map(AudienceDTOs.AudienceMemberSummary::fromEntity)
                .toList();
        return new AudienceDTOs.AudienceMemberListResponse(summaries, summaries.size());
    }

    /**
     * Cursor-only pagination (NO COUNT(*) query issued).
     */
    @Transactional(readOnly = true)
    public com.neeshai.backend.util.CursorResponse<AudienceDTOs.AudienceMemberSummary> getAudienceMembersCursor(
            UUID projectId, UUID ownerId, String cursor, int limit) {
        projectRepository.findById(projectId)
                .filter(p -> !p.isDeleted())
                .filter(p -> p.getOwnerId().equals(ownerId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found or unauthorized"));

        int fetchSize = Math.min(Math.max(1, limit), 100);
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, fetchSize + 1);
        
        List<AudienceMember> members = memberRepository.findRealAudienceByProjectIdCursor(projectId, pageable);
        boolean hasMore = members.size() > fetchSize;
        if (hasMore) {
            members = members.subList(0, fetchSize);
        }
        String nextCursor = hasMore ? members.get(members.size() - 1).getId().toString() : null;
        List<AudienceDTOs.AudienceMemberSummary> summaries = members.stream()
                .map(AudienceDTOs.AudienceMemberSummary::fromEntity)
                .toList();
        return new com.neeshai.backend.util.CursorResponse<>(summaries, nextCursor, hasMore);
    }

    /**
     * Get detailed audience member info with all their questions.
     */
    public AudienceDTOs.AudienceMemberDetail getMemberDetail(UUID memberId, UUID ownerId) {
        AudienceMember member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Audience member not found"));

        projectRepository.findById(member.getProject().getId())
                .filter(p -> !p.isDeleted())
                .filter(p -> p.getOwnerId().equals(ownerId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Audience member not found or unauthorized"));

        List<AudienceQuestion> questions = questionRepository.findByAudienceMemberIdOrderByAskedAtDesc(memberId);
        return AudienceDTOs.AudienceMemberDetail.fromEntity(member, questions);
    }

    /**
     * Answer a question (Reply & Notify flow).
     */
    @Transactional
    public AudienceDTOs.AnswerQuestionResponse answerQuestion(UUID questionId, String answerText, UUID ownerId) {
        if (answerText == null || answerText.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Answer cannot be empty");
        }

        AudienceQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));

        projectRepository.findById(question.getAudienceMember().getProject().getId())
                .filter(p -> !p.isDeleted())
                .filter(p -> p.getOwnerId().equals(ownerId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found or unauthorized"));

        Instant now = Instant.now();

        question.setCustomAdminAnswer(answerText.trim());
        question.setStatus("answered");
        question.setRespondedAt(now);
        if (question.getAnsweredAt() == null) {
            question.setAnsweredAt(now);
        }

        questionRepository.save(question);

        // Update last interaction timestamp on the audience member
        AudienceMember member = question.getAudienceMember();
        member.setLastInteractionAt(now);
        memberRepository.save(member);

        // Sync with ClusterInstances in Notification Service
        if (member != null && member.getProject() != null && clusterInstanceRepository != null) {
            try {
                UUID projId = member.getProject().getId();
                List<ClusterInstance> instances = clusterInstanceRepository.findByClusterProjectId(projId);
                if (instances != null && !instances.isEmpty()) {
                    for (ClusterInstance instance : instances) {
                        boolean emailMatch = instance.getUserEmail() != null && instance.getUserEmail().equalsIgnoreCase(member.getEmail());
                        boolean textMatch = instance.getOriginalQuestion() != null && question.getQuestionText() != null &&
                                (instance.getOriginalQuestion().equalsIgnoreCase(question.getQuestionText()) || instance.getOriginalQuestion().contains(question.getQuestionText()) || question.getQuestionText().contains(instance.getOriginalQuestion()));
                        if (emailMatch || textMatch) {
                            instance.setStatus("ANSWERED");
                            instance.setAnsweredAt(now);
                            instance.setAnswerContent(answerText.trim());
                            instance.setAnsweredBy(ownerId);
                            clusterInstanceRepository.save(instance);

                            if (instance.getCluster() != null) {
                                QuestionCluster qc = instance.getCluster();
                                long total = clusterInstanceRepository.countByClusterId(qc.getId());
                                long answered = clusterInstanceRepository.countAnsweredByClusterId(qc.getId());
                                if (answered >= total) {
                                    qc.setStatus("ANSWERED");
                                } else if (answered > 0) {
                                    qc.setStatus("PARTIALLY_ANSWERED");
                                }
                                questionClusterRepository.save(qc);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to sync answer with cluster instances: {}", e.getMessage());
            }
        }

        // Email notification stub
        sendEmailNotification(member, question, answerText);

        log.info("Question {} answered by owner {} at {}", questionId, ownerId, now);

        return new AudienceDTOs.AnswerQuestionResponse(questionId, "answered", now);
    }

    /**
     * Submit feedback from a public blog viewer (no auth required).
     */
    @Transactional
    public AudienceDTOs.PublicFeedbackResponse submitPublicFeedback(
            UUID projectId, AudienceDTOs.PublicFeedbackRequest request) {

        if (request.name() == null || request.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required");
        }
        if (request.email() == null || request.email().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }

        // Find the project
        com.neeshai.backend.project.Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        // Find existing member or create new one
        AudienceMember member = memberRepository
                .findByProjectIdAndEmail(projectId, request.email())
                .orElseGet(() -> {
                    AudienceMember newMember = new AudienceMember(project, request.name(), request.email());
                    return newMember;
                });

        // Update fields
        member.setName(request.name());
        if (request.occupation() != null && !request.occupation().isBlank()) {
            member.setOccupation(request.occupation());
        }
        if (request.feedbackText() != null && !request.feedbackText().isBlank()) {
            String newText = request.feedbackText().trim();
            if (member.getFeedbackText() != null && !member.getFeedbackText().isBlank()) {
                if (!member.getFeedbackText().contains(newText)) {
                    member.setFeedbackText(member.getFeedbackText() + "\n" + newText);
                }
            } else {
                member.setFeedbackText(newText);
            }
        }
        String source = (request.feedbackSource() != null && !request.feedbackSource().isBlank())
                ? request.feedbackSource()
                : "Form";
        member.setFeedbackSource(source);
        member.setFeedbackSubmittedAt(Instant.now());
        member.setLastInteractionAt(Instant.now());

        memberRepository.save(member);

        // Compute scores after feedback
        computeAndSetScores(member);
        memberRepository.save(member);

        log.info("Public feedback submitted for project {} by {} (source: {})", projectId, request.email(), source);

        return new AudienceDTOs.PublicFeedbackResponse(member.getId(), "Feedback submitted successfully!");
    }

    /**
     * Get public comments for a project (specifically submitted via comment section).
     */
    @Transactional(readOnly = true)
    public List<java.util.Map<String, Object>> getPublicComments(UUID projectId) {
        List<AudienceMember> members = memberRepository.findRealAudienceByProjectId(projectId);
        return members.stream()
                .filter(m -> m.getFeedbackText() != null && !m.getFeedbackText().isBlank())
                .filter(m -> "Comment".equalsIgnoreCase(m.getFeedbackSource()))
                .map(m -> {
                    java.util.Map<String, Object> map = new java.util.HashMap<>();
                    map.put("id", m.getId().toString());
                    map.put("name", m.getName() != null ? m.getName() : "Anonymous");
                    map.put("text", m.getFeedbackText());
                    map.put("timestamp", m.getFeedbackSubmittedAt() != null
                            ? m.getFeedbackSubmittedAt().toString()
                            : (m.getFirstInteractionAt() != null ? m.getFirstInteractionAt().toString() : java.time.Instant.now().toString()));
                    return map;
                })
                .collect(java.util.stream.Collectors.toList());
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

    public static boolean isUnanswerableFallback(String answer) {
        if (answer == null || answer.isBlank()) {
            return true;
        }
        String lower = answer.toLowerCase().trim();
        return lower.contains("as of now this needs to be discussed")
                || lower.contains("couldn't generate a response")
                || lower.contains("could not generate a response")
                || lower.contains("something went wrong")
                || lower.contains("i'm sorry, something went wrong");
    }

    /**
     * Record a chatbot interaction as an audience question.
     */
    @Transactional
    public void recordChatInteraction(UUID projectId, AudienceDTOs.ChatInteractionRequest request) {
        if (request.query() == null || request.query().isBlank()) {
            return; // Nothing to save
        }

        String userName = (request.userName() != null && !request.userName().isBlank())
                ? request.userName()
                : "Spotlight Visitor";
        String sessionId = request.sessionId() != null && !request.sessionId().isBlank() ? request.sessionId() : "";
        String userEmail = (request.userEmail() != null && !request.userEmail().isBlank())
                ? request.userEmail()
                : (!sessionId.isBlank() ? "visitor-" + sessionId + "@chatbot" : "anonymous-" + System.currentTimeMillis() + "@chatbot");

        // Find the project
        com.neeshai.backend.project.Project project = projectRepository.findById(projectId)
                .orElse(null);
        if (project == null) {
            log.warn("Cannot record chat interaction: project {} not found", projectId);
            return;
        }

        // If userEmail is real (not ending in @chatbot) and sessionId is present, merge temporary session visitor questions into the real user
        if (!userEmail.endsWith("@chatbot") && !sessionId.isBlank()) {
            String tempSessionEmail = "visitor-" + sessionId + "@chatbot";
            memberRepository.findByProjectIdAndEmail(projectId, tempSessionEmail).ifPresent(tempMember -> {
                log.info("Merging temporary session member {} into real member {}", tempSessionEmail, userEmail);
                AudienceMember realMember = memberRepository.findByProjectIdAndEmail(projectId, userEmail)
                        .orElseGet(() -> new AudienceMember(project, userName, userEmail));
                if (realMember.getName() == null || realMember.getName().startsWith("Spotlight") || realMember.getName().equals("Anonymous")) {
                    realMember.setName(userName);
                }
                realMember.setLastInteractionAt(Instant.now());
                memberRepository.save(realMember);

                List<AudienceQuestion> tempQuestions = tempMember.getQuestions();
                if (tempQuestions != null) {
                    for (AudienceQuestion q : tempQuestions) {
                        q.setAudienceMember(realMember);
                        questionRepository.save(q);
                    }
                }
                memberRepository.delete(tempMember);
            });
        }

        // Find or create audience member
        AudienceMember member = memberRepository
                .findByProjectIdAndEmail(projectId, userEmail)
                .orElseGet(() -> {
                    AudienceMember newMember = new AudienceMember(project, userName, userEmail);
                    newMember.setFeedbackSource("Chatbot");
                    return newMember;
                });

        if (userName != null && !userName.equals("Spotlight Visitor") && (member.getName() == null || member.getName().startsWith("Spotlight") || member.getName().equals("Anonymous"))) {
            member.setName(userName);
        }
        member.setLastInteractionAt(Instant.now());
        memberRepository.save(member);

        boolean isGreeting = isGreetingOrFiller(request.query());
        boolean hasValidAnswer = request.answer() != null && !request.answer().isBlank() && !isUnanswerableFallback(request.answer());
        boolean isAnswered = hasValidAnswer || isGreeting;

        // Create the question
        AudienceQuestion question = new AudienceQuestion(member, request.query().trim());
        if (request.answer() != null && !request.answer().isBlank()) {
            question.setChatbotAnswer(request.answer().trim());
            question.setAnsweredAt(Instant.now());
        }
        question.setStatus(isAnswered ? "answered" : "unanswered");
        questionRepository.save(question);

        // Ingest into NotificationService for Question Clusters (Notification Tab)
        // Skip conversational greetings and fillers from creating cluster tickets
        if (!isGreeting) {
            try {
                if (notificationService != null) {
                    notificationService.ingestQuestion(projectId, request.query().trim(), request.answer(), isAnswered, userName, userEmail, member.getOccupation(), "Spotlight Chatbot");
                }
            } catch (Exception e) {
                log.warn("Failed to ingest question into NotificationService: {}", e.getMessage());
            }
        }

        // Recompute scores
        computeAndSetScores(member);
        memberRepository.save(member);

        log.info("Chat interaction recorded for project {} by {} (answered={})", projectId, userEmail, isAnswered);
    }

    /**
     * Record audience interest selection from Spotlight "Interested" button.
     */
    @Transactional
    public AudienceDTOs.InterestSubmitResponse recordInterest(
            UUID projectId, AudienceDTOs.InterestSubmitRequest request) {

        if (request.name() == null || request.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required");
        }
        if (request.email() == null || request.email().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }

        com.neeshai.backend.project.Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        // Find existing member or create new one
        AudienceMember member = memberRepository
                .findByProjectIdAndEmail(projectId, request.email())
                .orElseGet(() -> {
                    AudienceMember newMember = new AudienceMember(project, request.name(), request.email());
                    return newMember;
                });

        boolean alreadySubmitted = (member.getInterestedAt() != null);

        member.setName(request.name());
        member.setHasExplicitIntent(true);
        if (member.getExplicitIntentAt() == null) {
            member.setExplicitIntentAt(Instant.now());
        }
        member.setInterestTagId(request.tagId());
        member.setInterestTagLabel(request.tagLabel());
        member.setInterestTagPriority(request.tagPriority());
        member.setInterestOtherText(request.otherText());
        member.setInterestedAt(Instant.now());
        member.setLastInteractionAt(Instant.now());
        memberRepository.save(member);

        // Recompute scores
        computeAndSetScores(member);
        memberRepository.save(member);

        String tier = AudienceDTOs.computeValidationTier(member);
        log.info("Interest recorded for project {} by {} — tag: {}, tier: {}", projectId, request.email(), request.tagLabel(), tier);

        return new AudienceDTOs.InterestSubmitResponse(
                member.getId(), 
                tier, 
                alreadySubmitted ? "Interest updated successfully!" : "Interest recorded successfully!", 
                alreadySubmitted
        );
    }

    /**
     * Get interest / Neeshed count for a project.
     * Only counts users who actually clicked the Interested button and submitted.
     */
    @Transactional(readOnly = true)
    public int getInterestCount(UUID projectId) {
        return (int) memberRepository.countInterestedByProjectId(projectId);
    }

    /**
     * Check if a user (by email) has already submitted interest for a project.
     */
    @Transactional(readOnly = true)
    public AudienceDTOs.InterestCheckResponse checkUserInterest(UUID projectId, String email) {
        return memberRepository.findByProjectIdAndEmail(projectId, email)
                .filter(m -> m.getInterestedAt() != null)
                .map(m -> new AudienceDTOs.InterestCheckResponse(true, m.getInterestTagLabel()))
                .orElse(new AudienceDTOs.InterestCheckResponse(false, null));
    }

    /**
     * Get spotlight analytics for the project dashboard (Stage 2).
     */
    @Transactional(readOnly = true)
    public AudienceDTOs.SpotlightAnalyticsResponse getSpotlightAnalytics(UUID projectId) {
        // Get pitch view count from project
        int pitchViews = projectRepository.findById(projectId)
                .map(p -> p.getPitchViewCount() != null ? p.getPitchViewCount() : 0)
                .orElse(0);

        List<AudienceMember> members = memberRepository.findRealAudienceByProjectId(projectId);

        long questionCount = questionRepository.countByAudienceMemberProjectId(projectId);

        int spotlightOpens = Math.max(pitchViews, Math.max(members.size(), (int) questionCount));

        int chatbotInteractions = (int) questionCount;

        int interestClicks = (int) members.stream()
                .filter(m -> m.getInterestedAt() != null)
                .count();

        int feedbackSubmissions = (int) members.stream()
                .filter(m -> m.getFeedbackSubmittedAt() != null)
                .count();

        return new AudienceDTOs.SpotlightAnalyticsResponse(
                pitchViews, spotlightOpens, chatbotInteractions, interestClicks, feedbackSubmissions);
    }

    /**
     * Get all validated buyers (Gold/Silver/Bronze) for a project.
     */
    @Transactional(readOnly = true)
    public AudienceDTOs.ValidatedBuyersResponse getValidatedBuyers(UUID projectId) {
        List<AudienceMember> allMembers = memberRepository.findRealAudienceByProjectId(projectId);

        List<AudienceDTOs.ValidatedBuyerSummary> buyers = allMembers.stream()
                .filter(m -> !"NONE".equals(AudienceDTOs.computeValidationTier(m)))
                .map(AudienceDTOs.ValidatedBuyerSummary::fromEntity)
                .toList();

        int gold = (int) buyers.stream().filter(b -> "GOLD".equals(b.validationTier())).count();
        int silver = (int) buyers.stream().filter(b -> "SILVER".equals(b.validationTier())).count();
        int bronze = (int) buyers.stream().filter(b -> "BRONZE".equals(b.validationTier())).count();

        return new AudienceDTOs.ValidatedBuyersResponse(buyers, gold, silver, bronze, buyers.size());
    }

    /**
     * Compute and set confidence + engagement scores on an audience member.
     *
     * confidenceScore (0.0–1.0): How confident we are in persona detection
     * - Has occupation: +0.3
     * - Has feedback: +0.3
     * - Has asked questions: +0.1 per question, max +0.4
     *
     * engagementScore (0–100): How engaged the user is
     * - Each question: +10 points
     * - Submitted feedback: +20 points
     * - Has occupation set: +10 points
     * - Capped at 100
     */
    private void computeAndSetScores(AudienceMember member) {
        long questionCount = questionRepository.findByAudienceMemberIdOrderByAskedAtDesc(member.getId()).size();

        // Confidence score
        double confidence = 0.0;
        if (member.getOccupation() != null && !member.getOccupation().isBlank()) {
            confidence += 0.3;
        }
        if (member.getFeedbackText() != null && !member.getFeedbackText().isBlank()) {
            confidence += 0.3;
        }
        confidence += Math.min(0.4, questionCount * 0.1);
        member.setConfidenceScore(Math.min(1.0, confidence));

        // Engagement score
        double engagement = AudienceDTOs.calculateDynamicEngagementScore(member);
        member.setEngagementScore(engagement);
    }

    /**
     * Send email notification to audience member with the admin's reply.
     * Skips sending for anonymous/chatbot-generated email addresses.
     */
    private void sendEmailNotification(AudienceMember member, AudienceQuestion question, String answer) {
        String email = member.getEmail();

        // Skip anonymous chatbot users who never provided a real email
        if (email == null || email.isBlank() || email.contains("@chatbot")) {
            log.warn("Skipping reply email for user '{}' — no real email provided (email: {})",
                    member.getName(), email);
            return;
        }

        String projectName = member.getProject().getTitle();
        String subject = "Re: Your question about " + projectName;

        String htmlBody = """
            <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; background: #ffffff;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #1a1a2e; font-size: 24px; font-weight: 700; margin: 0;">Neesh AI</h1>
                    <p style="color: #666; font-size: 14px; margin: 4px 0 0;">Reply to your question</p>
                </div>

                <p style="color: #333; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
                    Hi <strong>%s</strong>,
                </p>

                <p style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
                    You asked a question on <strong>%s</strong>, and the project owner has replied:
                </p>

                <div style="background: #f8f9fa; border-left: 4px solid #667eea; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                    <p style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Your Question</p>
                    <p style="color: #333; font-size: 14px; line-height: 1.5; margin: 0;">%s</p>
                </div>

                <div style="background: linear-gradient(135deg, #667eea11, #764ba211); border-left: 4px solid #764ba2; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                    <p style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Reply</p>
                    <p style="color: #333; font-size: 14px; line-height: 1.5; margin: 0;">%s</p>
                </div>

                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                    This email was sent by the <strong>%s</strong> team via Neesh AI.
                </p>
            </div>
            """.formatted(
                member.getName(),
                projectName,
                question.getQuestionText(),
                answer.replace("\n", "<br>"),
                projectName
            );

        try {
            emailService.sendReply(email, subject, htmlBody);
            log.info("Reply email sent to '{}' <{}> for project '{}'", member.getName(), email, projectName);
        } catch (Exception e) {
            log.error("Failed to send reply email to '{}' <{}>: {}", member.getName(), email, e.getMessage());
        }
    }

    @Transactional
    public AudienceDTOs.ValidatedBuyersResponse updatePilotCohortStatus(UUID projectId, List<UUID> memberIds, boolean enroll) {
        if (memberIds != null && !memberIds.isEmpty()) {
            List<AudienceMember> members = memberRepository.findAllById(memberIds);
            for (AudienceMember m : members) {
                if (m.getProject() != null && m.getProject().getId().equals(projectId)) {
                    m.setInPilotCohort(enroll);
                    m.setPilotEnrolledAt(enroll ? Instant.now() : null);
                    memberRepository.save(m);
                }
            }
        }
        return getValidatedBuyers(projectId);
    }
}

