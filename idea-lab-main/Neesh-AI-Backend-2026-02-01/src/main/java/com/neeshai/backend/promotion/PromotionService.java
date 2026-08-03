package com.neeshai.backend.promotion;

import com.neeshai.backend.blog.Blog;
import com.neeshai.backend.blog.BlogRepository;
import com.neeshai.backend.project.Project;
import com.neeshai.backend.user.User;
import com.neeshai.backend.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class PromotionService {

    private static final Logger log = LoggerFactory.getLogger(PromotionService.class);
    private static final int MAX_TAGS = 5;

    private final BlogPromotionRepository promotionRepository;
    private final PromotionTagRepository tagRepository;
    private final BlogRepository blogRepository;
    private final UserRepository userRepository;

    public PromotionService(BlogPromotionRepository promotionRepository,
                            PromotionTagRepository tagRepository,
                            BlogRepository blogRepository,
                            UserRepository userRepository) {
        this.promotionRepository = promotionRepository;
        this.tagRepository = tagRepository;
        this.blogRepository = blogRepository;
        this.userRepository = userRepository;
    }

    /**
     * Submit a blog for promotion (Pro users only).
     */
    @Transactional
    public PromotionDTOs.PromotionDTO submitForPromotion(UUID userId, UUID projectId, List<String> tags) {
        // Validate user is Pro
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String plan = user.getSubscriptionPlan();
        if (plan == null || "FREE".equalsIgnoreCase(plan)) {
            throw new IllegalArgumentException("Only Pro or Enterprise users can promote blogs. Please upgrade your plan.");
        }

        // Find blog for this project
        Blog blog = blogRepository.findByProjectId(projectId)
                .orElseThrow(() -> new IllegalArgumentException("No blog found for this project. Create a blog first."));

        List<String> normalizedTags = new ArrayList<>();
        if (tags != null) {
            normalizedTags = tags.stream()
                    .map(t -> t.toLowerCase().trim())
                    .filter(t -> !t.isEmpty())
                    .distinct()
                    .collect(Collectors.toList());
        }

        if (normalizedTags.isEmpty()) {
            String industry = blog.getProject().getIndustry();
            if (industry != null && !industry.isBlank()) {
                normalizedTags.add(industry.toLowerCase().trim());
            } else {
                normalizedTags.add("startup");
            }
        }

        if (normalizedTags.size() > MAX_TAGS) {
            throw new IllegalArgumentException("Maximum " + MAX_TAGS + " tags allowed per promotion.");
        }

        // Check if already promoted
        Optional<BlogPromotion> existing = promotionRepository.findByBlogId(blog.getId());
        if (existing.isPresent()) {
            BlogPromotion promo = existing.get();
            if ("ACTIVE".equals(promo.getStatus())) {
                // Update tags instead
                tagRepository.deleteByPromotionId(promo.getId());
                normalizedTags.forEach(tag -> tagRepository.save(new PromotionTag(promo.getId(), tag)));
                log.info("Updated promotion tags for blog: {} by user: {}", blog.getId(), userId);
                return toDTO(promo, blog, normalizedTags);
            } else {
                // Re-activate
                promo.setStatus("ACTIVE");
                promotionRepository.save(promo);
                tagRepository.deleteByPromotionId(promo.getId());
                normalizedTags.forEach(tag -> tagRepository.save(new PromotionTag(promo.getId(), tag)));
                log.info("Re-activated promotion for blog: {} by user: {}", blog.getId(), userId);
                return toDTO(promo, blog, normalizedTags);
            }
        }

        // Create new promotion
        BlogPromotion promotion = new BlogPromotion(blog.getId(), userId);
        promotionRepository.save(promotion);

        normalizedTags.forEach(tag -> tagRepository.save(new PromotionTag(promotion.getId(), tag)));

        log.info("Blog promoted: {} with tags: {} by user: {}", blog.getId(), normalizedTags, userId);
        return toDTO(promotion, blog, normalizedTags);
    }

    /**
     * Get all promotions for a user.
     */
    public List<PromotionDTOs.PromotionDTO> getUserPromotions(UUID userId) {
        List<BlogPromotion> promotions = promotionRepository.findByUserId(userId);
        return promotions.stream().map(promo -> {
            Blog blog = blogRepository.findById(promo.getBlogId()).orElse(null);
            List<String> tags = tagRepository.findByPromotionId(promo.getId())
                    .stream().map(PromotionTag::getTag).collect(Collectors.toList());
            return toDTO(promo, blog, tags);
        }).collect(Collectors.toList());
    }

    /**
     * Remove a promotion.
     */
    @Transactional
    public void removePromotion(UUID userId, UUID promotionId) {
        BlogPromotion promo = promotionRepository.findById(promotionId)
                .orElseThrow(() -> new IllegalArgumentException("Promotion not found"));

        if (!promo.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Not authorized to remove this promotion");
        }

        promo.setStatus("REMOVED");
        promotionRepository.save(promo);
        log.info("Promotion removed: {} by user: {}", promotionId, userId);
    }

    /**
     * Get similar blogs for "More Like This" section — PUBLIC endpoint.
     * Falls back to recent active promotions when no tag-based matches are found.
     */
    public List<PromotionDTOs.SimilarBlogDTO> getSimilarBlogs(UUID projectId, int limit) {
        // Find the blog for this project
        Optional<Blog> blogOpt = blogRepository.findByProjectId(projectId);

        // Find the promotion for this blog (if it exists and is active)
        Optional<BlogPromotion> promoOpt = Optional.empty();
        if (blogOpt.isPresent()) {
            promoOpt = promotionRepository.findByBlogIdAndStatus(blogOpt.get().getId(), "ACTIVE");
        }

        List<BlogPromotion> similar;
        List<String> currentTags = Collections.emptyList();

        if (promoOpt.isPresent()) {
            // Try tag-based similarity first
            similar = promotionRepository.findSimilarPromotions(promoOpt.get().getId(), limit);
            currentTags = tagRepository.findByPromotionId(promoOpt.get().getId())
                    .stream().map(PromotionTag::getTag).collect(Collectors.toList());
        } else {
            similar = Collections.emptyList();
        }

        // Fallback: if no tag matches found, return recent active promotions (excluding current project)
        if (similar.isEmpty()) {
            List<BlogPromotion> allActive = promotionRepository.findActivePromotions();
            similar = allActive.stream()
                    .filter(p -> {
                        Blog b = blogRepository.findById(p.getBlogId()).orElse(null);
                        if (b == null || b.getProject() == null) return false;
                        return !b.getProject().getId().equals(projectId);
                    })
                    .limit(limit)
                    .collect(Collectors.toList());
        }

        final List<String> finalCurrentTags = currentTags;
        return similar.stream().map(simPromo -> {
            Blog simBlog = blogRepository.findById(simPromo.getBlogId()).orElse(null);
            if (simBlog == null) return null;

            Project simProject = simBlog.getProject();
            if (simProject == null) return null;

            User owner = userRepository.findById(simPromo.getUserId()).orElse(null);

            List<String> simTags = tagRepository.findByPromotionId(simPromo.getId())
                    .stream().map(PromotionTag::getTag).collect(Collectors.toList());

            // Find matching tags
            List<String> matchingTags = simTags.stream()
                    .filter(finalCurrentTags::contains)
                    .collect(Collectors.toList());

            return new PromotionDTOs.SimilarBlogDTO(
                    simProject.getId(),
                    simBlog.getHeading() != null ? simBlog.getHeading() : simProject.getTitle(),
                    simProject.getOneLineSummary(),
                    simBlog.getCoverImageUrl(),
                    simProject.getSlug(),
                    owner != null ? owner.getName() : "Unknown",
                    matchingTags
            );
        }).filter(Objects::nonNull).collect(Collectors.toList());
    }

    /**
     * Get pitch feed — all active promotions that have an elevator pitch video.
     * PUBLIC endpoint, powers the Reels / short-form pitch feed.
     */
    public List<PromotionDTOs.PitchFeedItemDTO> getPitchFeed(int limit, int offset) {
        List<BlogPromotion> activePromotions = promotionRepository.findActivePromotions();

        return activePromotions.stream()
                .map(promo -> {
                    Blog blog = blogRepository.findById(promo.getBlogId()).orElse(null);
                    if (blog == null) return null;

                    com.neeshai.backend.project.Project project = blog.getProject();
                    if (project == null) return null;

                    User owner = userRepository.findById(promo.getUserId()).orElse(null);
                    String authorName = owner != null ? owner.getName() : "Unknown";

                    return new PromotionDTOs.PitchFeedItemDTO(
                            project.getId(),
                            blog.getHeading() != null ? blog.getHeading() : project.getTitle(),
                            project.getOneLineSummary(),
                            project.getSlug(),
                            project.getElevatorPitchUrl(),
                            project.getElevatorPitchThumbnail(),
                            project.getElevatorPitchDuration(),
                            blog.getCoverImageUrl(),
                            authorName
                    );
                })
                .filter(Objects::nonNull)
                .skip(offset)
                .limit(limit)
                .collect(Collectors.toList());
    }

    /**
     * Get promotion stats for a user (used in admin).
     */
    public long getPromotionCountForUser(UUID userId) {
        return promotionRepository.countByUserId(userId);
    }

    public List<String> getTagsForUser(UUID userId) {
        List<BlogPromotion> promotions = promotionRepository.findByUserId(userId);
        List<UUID> promoIds = promotions.stream().map(BlogPromotion::getId).collect(Collectors.toList());
        if (promoIds.isEmpty()) return Collections.emptyList();
        return tagRepository.findByPromotionIdIn(promoIds)
                .stream().map(PromotionTag::getTag).distinct().collect(Collectors.toList());
    }

    private PromotionDTOs.PromotionDTO toDTO(BlogPromotion promo, Blog blog, List<String> tags) {
        return new PromotionDTOs.PromotionDTO(
                promo.getId(),
                promo.getBlogId(),
                blog != null ? blog.getProject().getId() : null,
                blog != null ? (blog.getHeading() != null ? blog.getHeading() : "Untitled") : "Unknown",
                blog != null ? blog.getCoverImageUrl() : null,
                tags,
                promo.getStatus(),
                promo.getCreatedAt()
        );
    }

    /**
     * Get branding info for a blog's public page.
     * Returns subscription plan, custom logo/text, and whether to show Neesh AI branding.
     */
    public PromotionDTOs.BlogBrandingDTO getBlogBranding(UUID projectId) {
        Optional<Blog> blogOpt = blogRepository.findByProjectId(projectId);
        if (blogOpt.isEmpty()) {
            return new PromotionDTOs.BlogBrandingDTO("FREE", null, null, true);
        }

        Blog blog = blogOpt.get();
        UUID ownerId = blog.getProject().getOwnerId();
        User owner = userRepository.findById(ownerId).orElse(null);

        if (owner == null) {
            return new PromotionDTOs.BlogBrandingDTO("FREE", null, null, true);
        }

        String plan = owner.getSubscriptionPlan() != null ? owner.getSubscriptionPlan() : "FREE";
        boolean isFree = "FREE".equalsIgnoreCase(plan);

        return new PromotionDTOs.BlogBrandingDTO(
                plan,
                isFree ? null : owner.getCustomLogoUrl(),
                isFree ? null : owner.getCustomBrandingText(),
                isFree // show Neesh AI branding for free users
        );
    }
}
