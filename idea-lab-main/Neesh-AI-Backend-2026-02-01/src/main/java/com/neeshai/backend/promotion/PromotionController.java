package com.neeshai.backend.promotion;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class PromotionController {

    private final PromotionService promotionService;

    public PromotionController(PromotionService promotionService) {
        this.promotionService = promotionService;
    }

    // ─── Authenticated endpoints ───

    @PostMapping("/api/promotions")
    public ResponseEntity<?> submitForPromotion(
            @RequestBody PromotionDTOs.SubmitPromotionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        try {
            PromotionDTOs.PromotionDTO result = promotionService.submitForPromotion(
                    userId, request.projectId(), request.tags());
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/api/promotions")
    public ResponseEntity<List<PromotionDTOs.PromotionDTO>> getUserPromotions(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(promotionService.getUserPromotions(userId));
    }

    @DeleteMapping("/api/promotions/{id}")
    public ResponseEntity<?> removePromotion(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        try {
            promotionService.removePromotion(userId, id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ─── Public endpoint (for "More Like This") ───

    @GetMapping("/api/public/promotions/similar/{projectId}")
    public ResponseEntity<List<PromotionDTOs.SimilarBlogDTO>> getSimilarBlogs(
            @PathVariable UUID projectId,
            @RequestParam(defaultValue = "6") int limit) {
        List<PromotionDTOs.SimilarBlogDTO> similar = promotionService.getSimilarBlogs(projectId, limit);
        return ResponseEntity.ok(similar);
    }

    @GetMapping("/api/public/blog-branding/{projectId}")
    public ResponseEntity<PromotionDTOs.BlogBrandingDTO> getBlogBranding(@PathVariable UUID projectId) {
        PromotionDTOs.BlogBrandingDTO branding = promotionService.getBlogBranding(projectId);
        return ResponseEntity.ok(branding);
    }

    /** Public Reels/Pitches feed — no auth required. */
    @GetMapping("/api/public/pitches")
    public ResponseEntity<List<PromotionDTOs.PitchFeedItemDTO>> getPitchFeed(
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(required = false) Long seed,
            @RequestParam(required = false) String exclude) {
        // Parse comma-separated exclude IDs (project IDs already loaded by frontend)
        java.util.Set<UUID> excludeIds = null;
        if (exclude != null && !exclude.isBlank()) {
            excludeIds = java.util.Arrays.stream(exclude.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(UUID::fromString)
                    .collect(java.util.stream.Collectors.toSet());
        }
        return ResponseEntity.ok(promotionService.getPitchFeed(limit, offset, seed, excludeIds));
    }
}
