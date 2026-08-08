package com.neeshai.backend.project;

import com.neeshai.backend.audience.AudienceDTOs;
import com.neeshai.backend.audience.AudienceService;
import com.neeshai.backend.blog.BlogDTOs;
import com.neeshai.backend.blog.BlogService;
import com.neeshai.backend.faq.FAQService;
import com.neeshai.backend.kb.DocumentRepository;
import com.neeshai.backend.projectlink.ProjectLinkService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Value;

import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.Arrays;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public/projects")
public class PublicProjectController {

    private static final Logger logger = LoggerFactory.getLogger(PublicProjectController.class);

    @Value("${ai.service.url:http://localhost:3000}")
    private String aiServiceUrl;

    @Value("${ai.service.internal-api-key}")
    private String aiServiceApiKey;

    private final ProjectService projectService;
    private final BlogService blogService;
    private final AudienceService audienceService;
    private final ProjectLinkService projectLinkService;
    private final FAQService faqService;
    private final DocumentRepository documentRepository;
    private final RestTemplate restTemplate;

    public PublicProjectController(ProjectService projectService, BlogService blogService,
            AudienceService audienceService, ProjectLinkService projectLinkService,
            FAQService faqService, DocumentRepository documentRepository) {
        this.projectService = projectService;
        this.blogService = blogService;
        this.audienceService = audienceService;
        this.projectLinkService = projectLinkService;
        this.faqService = faqService;
        this.documentRepository = documentRepository;
        this.restTemplate = new RestTemplate();
    }

    @GetMapping("/{slug}")
    public ResponseEntity<ProjectDTOs.PublicProjectDTO> getPublicProject(@PathVariable String slug) {
        return projectService.getPublicProject(slug)
                .map(ProjectDTOs.PublicProjectDTO::fromEntity)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/id/{projectId}")
    public ResponseEntity<ProjectDTOs.PublicProjectDTO> getPublicProjectById(@PathVariable UUID projectId) {
        return projectService.getPublicProjectById(projectId)
                .map(ProjectDTOs.PublicProjectDTO::fromEntity)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{projectId}/blog")
    public ResponseEntity<BlogDTOs.BlogContentDTO> getPublicBlog(@PathVariable UUID projectId) {
        // Get blog content without owner verification for public access
        return blogService.getBlogContent(projectId, null)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/blog/{slug}")
    public ResponseEntity<BlogDTOs.BlogContentDTO> getPublicBlogBySlug(@PathVariable String slug) {
        // Parse slug to extract project ID
        UUID projectId = extractProjectIdFromSlug(slug);
        if (projectId == null) {
            return ResponseEntity.notFound().build();
        }

        // Get blog content without owner verification for public access
        return blogService.getBlogContent(projectId, null)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    private UUID extractProjectIdFromSlug(String slug) {
        try {
            // Expected format: "some-title-uuid"
            // UUID format: 8-4-4-4-12 hex characters
            String uuidPattern = "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$";
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(uuidPattern, java.util.regex.Pattern.CASE_INSENSITIVE);
            java.util.regex.Matcher matcher = pattern.matcher(slug);

            if (matcher.find()) {
                return UUID.fromString(matcher.group(1));
            }
            return null;
        } catch (Exception e) {
            logger.warn("Failed to extract UUID from slug: {}", slug, e);
            return null;
        }
    }

    @PostMapping("/{projectId}/feedback")
    public ResponseEntity<AudienceDTOs.PublicFeedbackResponse> submitFeedback(
            @PathVariable UUID projectId,
            @RequestBody AudienceDTOs.PublicFeedbackRequest request) {
        return ResponseEntity.ok(audienceService.submitPublicFeedback(projectId, request));
    }

    @GetMapping("/{projectId}/comments")
    public ResponseEntity<List<Map<String, Object>>> getPublicComments(@PathVariable UUID projectId) {
        return ResponseEntity.ok(audienceService.getPublicComments(projectId));
    }

    @PostMapping("/{projectId}/chat")
    public ResponseEntity<Map<String, Object>> publicChat(
            @PathVariable UUID projectId,
            @RequestBody Map<String, String> request) {

        String query = request.get("query");
        String userName = request.get("userName");
        String userEmail = request.get("userEmail");
        String sessionId = request.get("sessionId");
        logger.info("[PublicChat] POST /api/public/projects/{}/chat - query length: {}",
                projectId, query != null ? query.length() : 0);

        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Query is required"));
        }

        try {
            List<UUID> linkedProjectIds = projectLinkService.getLinkedProjectIds(projectId);

            String url = aiServiceUrl + "/internal/chat";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Secret", aiServiceApiKey);

            Map<String, Object> body = new HashMap<>();
            body.put("projectId", projectId.toString());
            body.put("query", query);
            if (userName != null && !userName.isBlank()) {
                body.put("userName", userName);
            }
            if (userEmail != null && !userEmail.isBlank()) {
                body.put("userEmail", userEmail);
            }
            if (sessionId != null && !sessionId.isBlank()) {
                body.put("sessionId", sessionId);
            }
            if (!linkedProjectIds.isEmpty()) {
                body.put("linkedProjectIds", linkedProjectIds.stream()
                        .map(UUID::toString)
                        .collect(Collectors.toList()));
            }

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            logger.info("[PublicChat] AI service responded with status: {}", response.getStatusCode());

            // Save the chat interaction to audience_questions table
            try {
                String answer = null;
                if (response.getBody() != null && response.getBody().get("answer") != null) {
                    answer = response.getBody().get("answer").toString();
                }
                audienceService.recordChatInteraction(projectId,
                        new AudienceDTOs.ChatInteractionRequest(query, answer, userName, userEmail, sessionId));
            } catch (Exception e) {
                logger.warn("[PublicChat] Failed to record chat interaction: {}", e.getMessage());
                // Don't fail the chat response if recording fails
            }

            return ResponseEntity.ok(response.getBody());

        } catch (Exception e) {
            logger.warn("[PublicChat] AI service connection exception at {}: {}. Generating smart contextual answer.", aiServiceUrl, e.getMessage());
            String fallbackAnswer = generateFallbackChatAnswer(projectId, query);

            try {
                audienceService.recordChatInteraction(projectId,
                        new AudienceDTOs.ChatInteractionRequest(query, fallbackAnswer, userName, userEmail, sessionId));
            } catch (Exception recErr) {
                logger.warn("[PublicChat] Failed to record fallback chat interaction: {}", recErr.getMessage());
            }

            return ResponseEntity.ok(Map.of("answer", fallbackAnswer));
        }
    }

    private String generateFallbackChatAnswer(UUID projectId, String query) {
        try {
            Project project = projectService.getPublicProjectById(projectId).orElse(null);
            String title = project != null && project.getTitle() != null ? project.getTitle().trim() : "this project";
            String titleLower = title.toLowerCase();
            String queryLower = query != null ? query.toLowerCase().trim() : "";

            if (queryLower.isBlank()) {
                return "How can I help you today?";
            }

            // Extract search keywords (words longer than 2 chars excluding stop words)
            List<String> keywords = Arrays.stream(queryLower.split("[^a-zA-Z0-9]+"))
                    .filter(w -> w.length() > 2)
                    .filter(w -> !List.of("what", "when", "where", "which", "who", "whom", "whose", "why", "how", "this", "that", "does", "have", "with", "from", "your", "the", "and", "are", "for").contains(w))
                    .collect(Collectors.toList());

            // 1. Search Project FAQs (FAQService)
            try {
                if (faqService != null) {
                    var faqListResponse = faqService.getFAQsForProject(projectId);
                    if (faqListResponse != null && faqListResponse.faqs() != null) {
                        for (var faq : faqListResponse.faqs()) {
                            String qText = faq.question() != null ? faq.question().toLowerCase() : "";
                            String aText = faq.answer() != null ? faq.answer() : "";
                            if (!qText.isBlank() && !aText.isBlank()) {
                                if (qText.contains(queryLower) || queryLower.contains(qText)) {
                                    return aText;
                                }
                                if (!keywords.isEmpty() && keywords.stream().allMatch(qText::contains)) {
                                    return aText;
                                }
                                if (!keywords.isEmpty() && keywords.stream().anyMatch(qText::contains)) {
                                    return aText;
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                logger.warn("[PublicChat] FAQ search fallback error: {}", e.getMessage());
            }

            // 2. Search Project Blog Content (BlogService)
            try {
                if (blogService != null) {
                    var blogOpt = blogService.getBlogContent(projectId, null);
                    if (blogOpt.isPresent()) {
                        var blog = blogOpt.get();
                        String content = blog.content() != null ? blog.content() : "";
                        String intro = blog.introduction() != null ? blog.introduction() : "";

                        if (!keywords.isEmpty()) {
                            String fullBlogText = (intro + "\n" + content).trim();
                            if (!fullBlogText.isBlank()) {
                                String[] paragraphs = fullBlogText.split("(\r?\n){2,}");
                                for (String p : paragraphs) {
                                    String pLower = p.toLowerCase();
                                    if (keywords.stream().anyMatch(pLower::contains)) {
                                        return p.trim();
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                logger.warn("[PublicChat] Blog search fallback error: {}", e.getMessage());
            }

            // 3. Search Uploaded Knowledge Base Documents (DocumentRepository)
            try {
                if (documentRepository != null) {
                    var docs = documentRepository.findByProjectIdAndIsActiveTrue(projectId);
                    if (docs != null && !docs.isEmpty() && !keywords.isEmpty()) {
                        for (var doc : docs) {
                            String docText = doc.getContent() != null ? doc.getContent() : "";
                            if (!docText.isBlank()) {
                                String[] paragraphs = docText.split("(\r?\n){2,}");
                                for (String p : paragraphs) {
                                    String pLower = p.toLowerCase();
                                    if (keywords.stream().anyMatch(pLower::contains)) {
                                        return p.trim();
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                logger.warn("[PublicChat] Knowledge document search fallback error: {}", e.getMessage());
            }

            // 3. Pricing / Cost queries
            if (queryLower.contains("price") || queryLower.contains("cost") || queryLower.contains("pricing") || queryLower.contains("free") || queryLower.contains("pay") || queryLower.contains("discount") || queryLower.contains("tier") || queryLower.contains("how much")) {
                if (project != null && project.getEarlyAccessPrice() != null && project.getEarlyAccessPrice() > 0) {
                    return "For " + title + ", early access pricing is $" + String.format("%.2f", project.getEarlyAccessPrice()) + ". You can request early access or leave feedback right here on the Spotlight page!";
                } else {
                    return "Early access for " + title + " is currently free for pilot cohort members. Feel free to leave your feedback or submit your email to get early access!";
                }
            }

            // 4. Greeting queries ("hi", "hello", "hey", "greetings")
            if (queryLower.matches("^(hi|hello|hey|greetings|good morning|good afternoon|good evening)[!.,? ]*$")) {
                return "Hello! I am the AI Assistant for " + title + ". Feel free to ask me about what this product does, its key features, target audience, or early access pricing!";
            }

            // 5. Detailed Explanation queries ("explain", "detail", "more info", "tell me more", "how it works", "overview")
            if (queryLower.contains("explain") || queryLower.contains("detail") || queryLower.contains("more info") || queryLower.contains("tell me more") || queryLower.contains("how it works") || queryLower.contains("deep dive") || queryLower.contains("overview")) {
                StringBuilder sb = new StringBuilder();
                sb.append("Here is a detailed overview of ").append(title).append(":\n\n");

                boolean hasDetails = false;
                if (project != null && project.getOneLineSummary() != null && !project.getOneLineSummary().isBlank() && !project.getOneLineSummary().trim().equalsIgnoreCase(title)) {
                    sb.append("• Summary: ").append(project.getOneLineSummary().trim()).append("\n");
                    hasDetails = true;
                }
                if (project != null && project.getDescription() != null && !project.getDescription().isBlank() && !project.getDescription().trim().equalsIgnoreCase(title)) {
                    sb.append("• Description: ").append(project.getDescription().trim()).append("\n");
                    hasDetails = true;
                }
                if (project != null && project.getIntroduction() != null && !project.getIntroduction().isBlank() && !project.getIntroduction().trim().equalsIgnoreCase(title)) {
                    sb.append("• Introduction: ").append(project.getIntroduction().trim()).append("\n");
                    hasDetails = true;
                }
                if (project != null && project.getIndustry() != null && !project.getIndustry().isBlank()) {
                    sb.append("• Industry: ").append(project.getIndustry().trim()).append("\n");
                    hasDetails = true;
                }
                if (project != null && project.getStartupStage() != null && !project.getStartupStage().isBlank()) {
                    sb.append("• Stage: ").append(project.getStartupStage().trim()).append("\n");
                    hasDetails = true;
                }

                if (!hasDetails) {
                    sb.append(title).append(" is an innovative project created on Neesh AI. Feel free to ask any specific questions or share your feedback right here!");
                } else {
                    sb.append("\nFeel free to ask any specific questions about features, target users, or pricing!");
                }
                return sb.toString().trim();
            }

            // 6. "What is" / "About" queries SPECIFICALLY targeting the project/product itself
            boolean isProjectInquiry = queryLower.contains("this project") || queryLower.contains("this product")
                    || queryLower.contains("the product") || queryLower.contains("this app")
                    || (!titleLower.isBlank() && queryLower.contains(titleLower))
                    || queryLower.matches("^(what is|about|what does|summary)[!.,? ]*$");

            if (isProjectInquiry && (queryLower.contains("what is") || queryLower.contains("about") || queryLower.contains("what does") || queryLower.contains("summary"))) {
                String detail = "";
                if (project != null && project.getOneLineSummary() != null && !project.getOneLineSummary().isBlank() && !project.getOneLineSummary().trim().equalsIgnoreCase(title)) {
                    detail = project.getOneLineSummary().trim();
                } else if (project != null && project.getDescription() != null && !project.getDescription().isBlank() && !project.getDescription().trim().equalsIgnoreCase(title)) {
                    detail = project.getDescription().trim();
                }

                if (!detail.isBlank()) {
                    return title + " is " + detail + " Let me know if you would like a detailed explanation or have any feedback!";
                } else {
                    return title + " is an exciting new product on Neesh AI. Ask me anything about this product or share your thoughts!";
                }
            }

            // 7. Target Audience queries SPECIFICALLY targeting who the project is for
            if (queryLower.contains("audience") || queryLower.contains("target user") || queryLower.contains("target customer") || queryLower.contains("who is this for")) {
                if (project != null && project.getIndustry() != null && !project.getIndustry().isBlank()) {
                    return title + " operates in the " + project.getIndustry() + " space. Are you interested in learning more about how it works for this industry?";
                } else {
                    return title + " is designed for forward-thinking professionals, innovators, and early adopters looking for modern solutions.";
                }
            }

            // 8. Default Fallback for questions whose answer/detail is not in FAQs, Blog, or Project Knowledge
            return "I don't have that specific detail in my current knowledge base yet, but I have forwarded your question directly to the founder! We will notify you as soon as an update is available.";
        } catch (Exception e) {
            logger.warn("[PublicChat] Fallback answer error: {}", e.getMessage());
            return "I don't have that specific detail in my current knowledge base yet, but I have forwarded your question directly to the founder! We will notify you as soon as an update is available.";
        }
    }



    @PostMapping("/{projectId}/interest")
    public ResponseEntity<AudienceDTOs.InterestSubmitResponse> recordInterest(
            @PathVariable UUID projectId,
            @RequestBody AudienceDTOs.InterestSubmitRequest request) {
        return ResponseEntity.ok(audienceService.recordInterest(projectId, request));
    }

    @GetMapping("/{projectId}/interest-count")
    public ResponseEntity<Map<String, Object>> getInterestCount(@PathVariable UUID projectId) {
        int count = audienceService.getInterestCount(projectId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @GetMapping("/{projectId}/early-access-price")
    public ResponseEntity<Map<String, Object>> getEarlyAccessPrice(@PathVariable UUID projectId) {
        return projectService.getPublicProjectById(projectId)
                .map(project -> {
                    Map<String, Object> result = new HashMap<>();
                    result.put("earlyAccessPrice", project.getEarlyAccessPrice());
                    result.put("projectTitle", project.getTitle());
                    return ResponseEntity.ok(result);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{projectId}/check-interest")
    public ResponseEntity<AudienceDTOs.InterestCheckResponse> checkInterest(
            @PathVariable UUID projectId,
            @RequestParam String email) {
        return ResponseEntity.ok(audienceService.checkUserInterest(projectId, email));
    }

    @PostMapping("/{projectId}/record-pitch-view")
    public ResponseEntity<Void> recordPitchView(@PathVariable UUID projectId) {
        try {
            projectService.incrementPitchViewCount(projectId);
        } catch (Exception e) {
            logger.warn("Failed to record pitch view for project {}: {}", projectId, e.getMessage());
        }
        return ResponseEntity.ok().build();
    }

}
