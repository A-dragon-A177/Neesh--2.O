package com.neeshai.backend.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api")
public class NotificationController {

    private static final Logger log = LoggerFactory.getLogger(NotificationController.class);
    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * List question clusters for a project.
     * Query params: status (all|UNANSWERED|PARTIALLY_ANSWERED|ANSWERED), sort
     * (priority|recent|most_asked), search
     */
    private UUID getUserIdFromJwt(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }

    @GetMapping("/projects/{projectId}/notifications")
    public ResponseEntity<?> getClusters(
            @PathVariable UUID projectId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false, defaultValue = "priority") String sort,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false, defaultValue = "20") int limit,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = getUserIdFromJwt(jwt);
        if (cursor != null) {
            return ResponseEntity.ok(notificationService.getClustersCursor(projectId, userId, cursor, limit));
        }
        return ResponseEntity.ok(notificationService.getClusters(projectId, userId, status, sort, search));
    }

    @GetMapping("/projects/{projectId}/notifications/count")
    public ResponseEntity<NotificationDTOs.BadgeCountResponse> getBadgeCount(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = getUserIdFromJwt(jwt);
        long count = notificationService.getUnansweredCount(projectId, userId);
        return ResponseEntity.ok(new NotificationDTOs.BadgeCountResponse(count));
    }

    /**
     * Get cluster detail with audience list and reply history.
     */
    @GetMapping("/notifications/clusters/{clusterId}")
    public ResponseEntity<NotificationDTOs.ClusterDetailResponse> getClusterDetail(
            @PathVariable UUID clusterId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = getUserIdFromJwt(jwt);
        log.info("GET /notifications/clusters/{} by user {}", clusterId, userId);
        return ResponseEntity.ok(notificationService.getClusterDetail(clusterId, userId));
    }

    /**
     * Send reply to selected or all users in a cluster.
     */
    @PostMapping("/notifications/clusters/{clusterId}/reply")
    public ResponseEntity<NotificationDTOs.SendReplyResponse> sendReply(
            @PathVariable UUID clusterId,
            @RequestBody NotificationDTOs.SendReplyRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = getUserIdFromJwt(jwt);
        log.info("POST /notifications/clusters/{}/reply by user {}", clusterId, userId);
        return ResponseEntity.ok(notificationService.sendReply(clusterId, request, userId));
    }

    /**
     * Public endpoint: ingest a question from the chatbot.
     * This duplicates the question report flow but feeds into the clustering
     * engine.
     */
    @PostMapping("/public/projects/{projectId}/notifications/ingest")
    public ResponseEntity<NotificationDTOs.ClusterSummaryResponse> ingestQuestion(
            @PathVariable UUID projectId,
            @RequestBody IngestRequest request) {
        log.info("POST /public/projects/{}/notifications/ingest: '{}'", projectId, request.question());
        boolean answered = Boolean.TRUE.equals(request.isAnswered()) || (request.answer() != null && !request.answer().isBlank());
        QuestionCluster cluster = notificationService.ingestQuestion(
                projectId, request.question(), request.answer(), answered, request.userName(),
                request.userEmail(), request.persona(), request.source());
        if (cluster == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(NotificationDTOs.ClusterSummaryResponse.fromEntity(cluster));
    }

    public record IngestRequest(
            String question,
            String answer,
            Boolean isAnswered,
            String userName,
            String userEmail,
            String persona,
            String source) {
    }
}
