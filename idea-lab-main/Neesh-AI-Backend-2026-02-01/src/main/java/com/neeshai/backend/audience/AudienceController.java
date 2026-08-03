package com.neeshai.backend.audience;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api")
public class AudienceController {

    private final AudienceService audienceService;

    public AudienceController(AudienceService audienceService) {
        this.audienceService = audienceService;
    }

    private UUID getUserIdFromJwt(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }

    /**
     * GET /api/projects/{projectId}/audience
     * List all audience members for a project.
     */
    @GetMapping("/projects/{projectId}/audience")
    public ResponseEntity<?> getAudienceMembers(
            @PathVariable UUID projectId,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false, defaultValue = "20") int limit,
            @AuthenticationPrincipal Jwt jwt) {
        UUID ownerId = getUserIdFromJwt(jwt);
        if (cursor != null || limit != 20) {
            return ResponseEntity.ok(audienceService.getAudienceMembersCursor(projectId, ownerId, cursor, limit));
        }
        return ResponseEntity.ok(audienceService.getAudienceMembers(projectId, ownerId));
    }

    /**
     * GET /api/audience/{memberId}
     * Get detailed audience member profile with questions.
     */
    @GetMapping("/audience/{memberId}")
    public ResponseEntity<AudienceDTOs.AudienceMemberDetail> getMemberDetail(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID ownerId = getUserIdFromJwt(jwt);
        return ResponseEntity.ok(audienceService.getMemberDetail(memberId, ownerId));
    }

    /**
     * PUT /api/audience/questions/{questionId}/answer
     * Answer a question (Reply & Notify).
     */
    @PutMapping("/audience/questions/{questionId}/answer")
    public ResponseEntity<AudienceDTOs.AnswerQuestionResponse> answerQuestion(
            @PathVariable UUID questionId,
            @RequestBody AudienceDTOs.AnswerQuestionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID ownerId = getUserIdFromJwt(jwt);
        return ResponseEntity.ok(audienceService.answerQuestion(questionId, request.answer(), ownerId));
    }
}
