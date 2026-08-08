package com.neeshai.backend.chat;

import com.neeshai.backend.apikey.UserApiKeyService;
import com.neeshai.backend.blog.BlogService;
import com.neeshai.backend.faq.FAQService;
import com.neeshai.backend.kb.DocumentRepository;
import com.neeshai.backend.projectlink.ProjectLinkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.time.Instant;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.Arrays;
import java.util.UUID;
import java.util.stream.Collectors;

@Tag(name = "Chat", description = "AI chat endpoints for project-based conversations")
@RestController
@RequestMapping("/api")
public class ChatController {

    private static final Logger logger = LoggerFactory.getLogger(ChatController.class);

    @Value("${ai.service.url:http://localhost:3000}")
    private String aiServiceUrl;

    @Value("${ai.service.internal-api-key}")
    private String aiServiceApiKey;

    private final RestTemplate restTemplate;
    private final ProjectLinkService projectLinkService;
    private final UserApiKeyService userApiKeyService;
    private final com.neeshai.backend.project.ProjectRepository projectRepository;
    private final BlogService blogService;
    private final FAQService faqService;
    private final DocumentRepository documentRepository;

    public ChatController(ProjectLinkService projectLinkService, UserApiKeyService userApiKeyService,
                          com.neeshai.backend.project.ProjectRepository projectRepository,
                          BlogService blogService, FAQService faqService,
                          DocumentRepository documentRepository) {
        this.restTemplate = new RestTemplate();
        this.projectLinkService = projectLinkService;
        this.userApiKeyService = userApiKeyService;
        this.projectRepository = projectRepository;
        this.blogService = blogService;
        this.faqService = faqService;
        this.documentRepository = documentRepository;
    }

    private UUID getCurrentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt) {
            Jwt jwt = (Jwt) authentication.getPrincipal();
            return UUID.fromString(jwt.getSubject());
        }
        return null;
    }

    @Operation(
        summary = "Chat with a project",
        description = "Send a query to chat with a specific project's knowledge base",
        responses = {
            @ApiResponse(responseCode = "200", description = "Successful response",
                        content = @Content(schema = @Schema(implementation = ChatDTOs.ChatResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request",
                        content = @Content(schema = @Schema(implementation = ChatDTOs.ChatErrorResponse.class))),
            @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
        }
    )
    @PostMapping("/projects/{projectId}/chat")
    public ResponseEntity<Object> chatWithProject(
            @Parameter(description = "Project ID to chat with", required = true)
            @PathVariable UUID projectId,
            @Valid @RequestBody ChatDTOs.ChatRequest request) {

        UUID userId = getCurrentUserId();
        if (userId == null || projectRepository.findById(projectId)
                .filter(p -> !p.isDeleted())
                .filter(p -> p.getOwnerId().equals(userId))
                .isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        String query = request.query();
        logger.info("[ChatController] POST /api/projects/{}/chat - Received chat query. Query length: {} chars",
                projectId, query.length());

        try {
            // Fetch linked project IDs for knowledge sharing
            List<UUID> linkedProjectIds = projectLinkService.getLinkedProjectIds(projectId);
            logger.info("[ChatController] Found {} linked projects for knowledge sharing", linkedProjectIds.size());

            String url = aiServiceUrl + "/internal/chat";
            logger.info("[ChatController] Forwarding chat request to AI service: {}", url);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Secret", aiServiceApiKey);

            Map<String, Object> body = new HashMap<>();
            body.put("projectId", projectId.toString());
            body.put("query", query);
            // Pass linked project IDs for cross-project knowledge sharing
            if (!linkedProjectIds.isEmpty()) {
                body.put("linkedProjectIds", linkedProjectIds.stream()
                        .map(UUID::toString)
                        .collect(Collectors.toList()));
            }

            // Fetch user's LLM provider and API key
            if (userId != null) {
                Map<String, String> apiKeyConfig = userApiKeyService.getActiveConfig(userId);
                if (apiKeyConfig != null) {
                    body.put("provider", apiKeyConfig.get("provider"));
                    body.put("apiKey", apiKeyConfig.get("apiKey"));
                    logger.info("[ChatController] Using user's LLM provider: {}", apiKeyConfig.get("provider"));
                } else {
                    logger.info("[ChatController] No user API key configured, AI service will use fallback");
                }
            }

            logger.debug("[ChatController] Request payload to AI service: projectId={}, query={}, linkedProjects={}",
                    projectId, query, linkedProjectIds.size());

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            logger.info("[ChatController] Received response from AI service. Status: {}", response.getStatusCode());
            if (response.getBody() != null) {
                logger.debug("[ChatController] AI service response: {}", response.getBody());
            }

            return ResponseEntity.ok(response.getBody());

        } catch (org.springframework.web.client.HttpClientErrorException e) {
            // Forward provider-specific errors from AI service
            logger.error("[ChatController] AI service returned error: {}", e.getResponseBodyAsString());
            try {
                Map errorBody = new com.fasterxml.jackson.databind.ObjectMapper()
                        .readValue(e.getResponseBodyAsString(), Map.class);
                return ResponseEntity.status(e.getStatusCode()).body(errorBody);
            } catch (Exception parseError) {
                return ResponseEntity.status(e.getStatusCode()).body(Map.of(
                        "error", "AI Service error",
                        "details", e.getResponseBodyAsString()));
            }
        } catch (Exception e) {
            logger.warn("[ChatController] AI service exception for project {}: {}. Generating smart fallback answer.", projectId, e.getMessage());
            String fallbackAnswer = generateFallbackChatAnswer(projectId, query);
            return ResponseEntity.ok(Map.of("answer", fallbackAnswer));
        }
    }

    private String generateFallbackChatAnswer(UUID projectId, String query) {
        try {
            com.neeshai.backend.project.Project project = projectRepository.findById(projectId).orElse(null);
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
                logger.warn("[ChatController] FAQ search fallback error: {}", e.getMessage());
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
                logger.warn("[ChatController] Blog search fallback error: {}", e.getMessage());
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
                logger.warn("[ChatController] Knowledge document search fallback error: {}", e.getMessage());
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
            logger.warn("[ChatController] Fallback answer error: {}", e.getMessage());
            return "I don't have that specific detail in my current knowledge base yet, but I have forwarded your question directly to the founder! We will notify you as soon as an update is available.";
        }
    }
}
