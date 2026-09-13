package com.neeshai.backend.blog;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.neeshai.backend.project.Project;
import com.neeshai.backend.project.ProjectRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class BlogService {

    private static final Logger log = LoggerFactory.getLogger(BlogService.class);

    private final BlogRepository blogRepository;
    private final ProjectRepository projectRepository;
    private final ObjectMapper objectMapper;

    public BlogService(BlogRepository blogRepository, ProjectRepository projectRepository, ObjectMapper objectMapper) {
        this.blogRepository = blogRepository;
        this.projectRepository = projectRepository;
        this.objectMapper = objectMapper;
    }

    public Optional<BlogDTOs.BlogContentDTO> getBlogContent(UUID projectId, UUID ownerId) {
        Optional<Project> projectOpt = projectRepository.findById(projectId);

        if (projectOpt.isEmpty()) {
            return Optional.empty();
        }

        // Only verify ownership if ownerId is provided (authenticated request)
        // If ownerId is null, allow public access
        if (ownerId != null && !projectOpt.get().getOwnerId().equals(ownerId)) {
            return Optional.empty();
        }

        Project project = projectOpt.get();
        Optional<Blog> blogOpt = blogRepository.findByProjectId(projectId);

        Blog blog;
        boolean isNew = false;
        if (blogOpt.isEmpty()) {
            blog = Blog.builder()
                    .project(project)
                    .heading(project.getTitle())
                    .introduction(project.getOneLineSummary() != null ? project.getOneLineSummary() : project.getIntroduction())
                    .content("")
                    .customFields("[]")
                    .interestTags("[]")
                    .build();
            isNew = true;
        } else {
            blog = blogOpt.get();
        }

        List<Map<String, Object>> currentCustomFields = parseCustomFields(blog.getCustomFields());
        List<Map<String, Object>> mergedCustomFields = mergeCustomFields(currentCustomFields, project.getValidationAnswers());

        boolean shouldSave = isNew;

        if (mergedCustomFields.size() != currentCustomFields.size() ||
                !serializeCustomFields(mergedCustomFields).equals(blog.getCustomFields())) {
            blog.setCustomFields(serializeCustomFields(mergedCustomFields));
            shouldSave = true;
        }

        if ((blog.getIntroduction() == null || blog.getIntroduction().isBlank()) &&
                (project.getOneLineSummary() != null || project.getIntroduction() != null)) {
            blog.setIntroduction(project.getOneLineSummary() != null ? project.getOneLineSummary() : project.getIntroduction());
            shouldSave = true;
        }

        if (shouldSave) {
            try {
                blog = blogRepository.save(blog);
                log.info("Auto-synced blog custom fields from validation answers for project {}", projectId);
            } catch (Exception e) {
                log.warn("Could not save auto-synced blog for project {}: {}", projectId, e.getMessage());
            }
        }

        List<Map<String, Object>> interestTags = parseCustomFields(blog.getInterestTags());
        log.debug("Retrieved blog content with {} custom fields and {} interest tags for project {}",
                mergedCustomFields.size(), interestTags.size(), projectId);

        String heading = (blog.getHeading() != null && !blog.getHeading().isBlank())
                ? blog.getHeading()
                : project.getTitle();

        return Optional.of(new BlogDTOs.BlogContentDTO(
                heading,
                blog.getCoverImageUrl(),
                blog.getIntroduction(),
                blog.getContent(),
                mergedCustomFields,
                interestTags));
    }

    @Transactional
    public void syncBlogWithValidationAnswers(Project project) {
        if (project == null || project.getId() == null) return;

        Optional<Blog> blogOpt = blogRepository.findByProjectId(project.getId());
        Blog blog = blogOpt.orElseGet(() -> Blog.builder()
                .project(project)
                .heading(project.getTitle())
                .introduction(project.getOneLineSummary() != null ? project.getOneLineSummary() : project.getIntroduction())
                .content("")
                .customFields("[]")
                .interestTags("[]")
                .build());

        List<Map<String, Object>> current = parseCustomFields(blog.getCustomFields());
        List<Map<String, Object>> merged = mergeCustomFields(current, project.getValidationAnswers());

        boolean updated = false;
        if (merged.size() != current.size() || !serializeCustomFields(merged).equals(blog.getCustomFields())) {
            blog.setCustomFields(serializeCustomFields(merged));
            updated = true;
        }

        if ((blog.getIntroduction() == null || blog.getIntroduction().isBlank()) &&
                (project.getOneLineSummary() != null || project.getIntroduction() != null)) {
            blog.setIntroduction(project.getOneLineSummary() != null ? project.getOneLineSummary() : project.getIntroduction());
            updated = true;
        }

        if (blog.getHeading() == null || blog.getHeading().isBlank()) {
            blog.setHeading(project.getTitle());
            updated = true;
        }

        if (updated || blog.getId() == null) {
            try {
                blogRepository.save(blog);
                log.info("Synced blog with validation answers for project: {}", project.getId());
            } catch (Exception e) {
                log.warn("Failed to sync blog with validation answers for project {}: {}", project.getId(), e.getMessage());
            }
        }
    }

    public List<Map<String, Object>> mergeCustomFields(List<Map<String, Object>> existingFields, String validationAnswersJson) {
        List<Map<String, Object>> generated = generateCustomFieldsFromAnswers(validationAnswersJson);
        if (existingFields == null || existingFields.isEmpty()) {
            return generated;
        }

        List<Map<String, Object>> result = new java.util.ArrayList<>();
        java.util.Set<String> handledTitles = new java.util.HashSet<>();

        for (Map<String, Object> field : existingFields) {
            if (field == null) continue;
            String title = (String) field.getOrDefault("sectionTitle", field.getOrDefault("title", ""));
            String value = (String) field.getOrDefault("value", field.getOrDefault("content", ""));

            // Filter out empty placeholder "Content" block
            if (title != null && title.equalsIgnoreCase("Content") && (value == null || value.trim().isEmpty())) {
                continue;
            }
            if ((title == null || title.trim().isEmpty()) && (value == null || value.trim().isEmpty())) {
                continue;
            }

            result.add(field);
            if (title != null && !title.isBlank()) {
                handledTitles.add(title.trim().toLowerCase().replaceAll("[^a-z0-9]", ""));
            }
        }

        int nextOrder = result.size() + 1;
        for (Map<String, Object> gen : generated) {
            String genTitle = (String) gen.get("sectionTitle");
            String normTitle = genTitle.toLowerCase().replaceAll("[^a-z0-9]", "");
            if (!handledTitles.contains(normTitle)) {
                Map<String, Object> newField = new java.util.HashMap<>(gen);
                newField.put("order", nextOrder++);
                result.add(newField);
                handledTitles.add(normTitle);
            }
        }

        return result;
    }

    public List<Map<String, Object>> generateCustomFieldsFromAnswers(String validationAnswersJson) {
        List<Map<String, Object>> fields = new java.util.ArrayList<>();
        if (validationAnswersJson == null || validationAnswersJson.trim().isEmpty()) {
            return fields;
        }

        try {
            com.fasterxml.jackson.databind.JsonNode answers = objectMapper.readTree(validationAnswersJson);
            if (answers == null || !answers.isObject()) {
                return fields;
            }

            int order = 1;

            java.util.function.Function<String[], String> getString = keys -> {
                for (String k : keys) {
                    if (answers.hasNonNull(k)) {
                        String v = answers.get(k).asText();
                        if (v != null && !v.trim().isEmpty()) {
                            return v.trim();
                        }
                    }
                }
                return "";
            };

            // 1. The Problem
            String problem = getString.apply(new String[]{"problem_story", "problem", "the_problem", "problemDescription"});
            if (!problem.isEmpty()) {
                fields.add(createSectionField("The Problem", problem, order++));
            }

            // 2. What We're Building
            String solution = getString.apply(new String[]{"our_solution", "solution", "what_building", "solutionDescription"});
            if (!solution.isEmpty()) {
                fields.add(createSectionField("What We're Building", solution, order++));
            }

            // 3. Value Advantage & Economics (CVP Reality Check)
            String cvpAlt = getString.apply(new String[]{"cvp_input_a"});
            String cvpMetric = getString.apply(new String[]{"cvp_input_b"});
            String cvpAltCost = getString.apply(new String[]{"cvp_input_c"});
            String cvpOurCost = getString.apply(new String[]{"cvp_input_d"});
            String cvpValidation = getString.apply(new String[]{"cvp_input_e"});

            if (!cvpAlt.isEmpty() || !cvpMetric.isEmpty() || !cvpAltCost.isEmpty() || !cvpOurCost.isEmpty()) {
                List<String> lines = new java.util.ArrayList<>();
                if (!cvpAlt.isEmpty()) lines.add("• Alternative Solution: " + cvpAlt);
                if (!cvpMetric.isEmpty()) lines.add("• Core Value Driver: " + cvpMetric);
                if (!cvpAltCost.isEmpty() && !cvpOurCost.isEmpty()) {
                    lines.add("• Cost Comparison: $" + cvpAltCost + " (Alternative) vs $" + cvpOurCost + " (Our Solution)");
                } else if (!cvpAltCost.isEmpty()) {
                    lines.add("• Alternative Cost: $" + cvpAltCost);
                } else if (!cvpOurCost.isEmpty()) {
                    lines.add("• Solution Cost: $" + cvpOurCost);
                }
                if (!cvpValidation.isEmpty()) lines.add("• Validation Status: " + cvpValidation);
                if (!lines.isEmpty()) {
                    fields.add(createSectionField("Value Advantage & Economics", String.join("\n", lines), order++));
                }
            }

            // 4. Who It's For
            String target = getString.apply(new String[]{"target_customer", "target_audience", "idealCustomer", "who_its_for"});
            if (!target.isEmpty()) {
                fields.add(createSectionField("Who It's For", target, order++));
            }

            // 5. Market Opportunity & Dynamics
            String marketHabit = getString.apply(new String[]{"market_input_a"});
            String marketSpend = getString.apply(new String[]{"market_input_b"});
            String marketPrice = getString.apply(new String[]{"market_input_c1"});
            String marketConcentration = getString.apply(new String[]{"market_input_c2"});
            String marketGeo = getString.apply(new String[]{"market_input_d"});

            if (!marketHabit.isEmpty() || !marketSpend.isEmpty() || !marketPrice.isEmpty() || !marketGeo.isEmpty() || !marketConcentration.isEmpty()) {
                List<String> lines = new java.util.ArrayList<>();
                if (!marketHabit.isEmpty()) lines.add("• Customer Urgency: " + marketHabit);
                if (!marketSpend.isEmpty()) lines.add("• Willingness to Pay: " + marketSpend);
                if (!marketPrice.isEmpty()) lines.add("• Target Pricing: $" + marketPrice + "/yr");
                if (!marketGeo.isEmpty() || !marketConcentration.isEmpty()) {
                    String geoPart = marketGeo + (!marketConcentration.isEmpty() ? " (" + marketConcentration + ")" : "");
                    lines.add("• Market Profile: " + geoPart.trim());
                }
                if (!lines.isEmpty()) {
                    fields.add(createSectionField("Market Opportunity & Dynamics", String.join("\n", lines), order++));
                }
            }

            // 6. The Hook
            String hook = getString.apply(new String[]{"the_hook", "hook", "keyInsight", "surprisingInsight"});
            if (!hook.isEmpty()) {
                fields.add(createSectionField("The Hook", hook, order++));
            }

            // 7. Customer Acquisition & Trust
            String acqAccess = getString.apply(new String[]{"acq_input_a"});
            String acqChannel = getString.apply(new String[]{"acq_input_b"});
            String acqRep = getString.apply(new String[]{"acq_input_c"});

            if (!acqAccess.isEmpty() || !acqChannel.isEmpty() || !acqRep.isEmpty()) {
                List<String> lines = new java.util.ArrayList<>();
                if (!acqAccess.isEmpty()) lines.add("• Customer Access: " + acqAccess);
                if (!acqChannel.isEmpty()) lines.add("• Growth Engine: " + acqChannel);
                if (!acqRep.isEmpty()) lines.add("• Industry Authority: " + acqRep);
                if (!lines.isEmpty()) {
                    fields.add(createSectionField("Customer Acquisition & Trust", String.join("\n", lines), order++));
                }
            }

            // 8. Defensibility & Moat
            String defMoat = getString.apply(new String[]{"def_input_a"});
            String defTech = getString.apply(new String[]{"def_input_b"});
            String defStrategy = getString.apply(new String[]{"def_input_c"});

            if (!defMoat.isEmpty() || !defTech.isEmpty() || !defStrategy.isEmpty()) {
                List<String> lines = new java.util.ArrayList<>();
                if (!defMoat.isEmpty()) lines.add("• Core Advantage: " + defMoat);
                if (!defTech.isEmpty()) lines.add("• Technical Barrier: " + defTech);
                if (!defStrategy.isEmpty()) lines.add("• Defense Strategy: " + defStrategy);
                if (!lines.isEmpty()) {
                    fields.add(createSectionField("Defensibility & Moat", String.join("\n", lines), order++));
                }
            }

            // 9. The Founder's Story
            String founder = getString.apply(new String[]{"founder_story", "founderStory", "motivation", "the_founders_story"});
            if (!founder.isEmpty()) {
                fields.add(createSectionField("The Founder's Story", founder, order++));
            }

            // 10. Execution & Build Readiness
            String buildStability = getString.apply(new String[]{"build_input_a"});
            String buildStage = getString.apply(new String[]{"build_input_b"});

            if (!buildStability.isEmpty() || !buildStage.isEmpty()) {
                List<String> lines = new java.util.ArrayList<>();
                if (!buildStability.isEmpty()) lines.add("• Team Execution Capacity: " + buildStability);
                if (!buildStage.isEmpty()) lines.add("• Current Milestone: " + buildStage);
                if (!lines.isEmpty()) {
                    fields.add(createSectionField("Execution & Build Readiness", String.join("\n", lines), order++));
                }
            }

            // 11. Our Vision
            String vision = getString.apply(new String[]{"vision", "longTermVision", "our_vision"});
            if (!vision.isEmpty()) {
                fields.add(createSectionField("Our Vision", vision, order++));
            }

            // 12. Get Involved
            String cta = getString.apply(new String[]{"call_to_action", "cta", "get_involved", "nextSteps"});
            if (!cta.isEmpty()) {
                fields.add(createSectionField("Get Involved", cta, order++));
            }

        } catch (Exception e) {
            log.warn("Error parsing validation answers for blog custom fields: {}", e.getMessage());
        }

        return fields;
    }

    private Map<String, Object> createSectionField(String sectionTitle, String value, int order) {
        Map<String, Object> field = new java.util.HashMap<>();
        field.put("id", UUID.randomUUID().toString());
        field.put("type", "spotlight_section");
        field.put("sectionTitle", sectionTitle);
        field.put("value", value);
        field.put("order", order);
        return field;
    }

    @Transactional
    public Optional<BlogDTOs.BlogContentDTO> updateBlogContent(UUID projectId, UUID ownerId,
            BlogDTOs.UpdateBlogRequest request) {

        log.debug("Updating blog content for project {} by user {}", projectId, ownerId);
        if (log.isTraceEnabled()) {
            log.trace("Update request - Heading: {}, Cover Image: {}, Custom Fields: {}",
                    request.heading(), request.coverImageUrl(),
                    request.customFields() != null ? request.customFields().size() : 0);
        }

        Optional<Project> projectOpt = projectRepository.findById(projectId);

        if (projectOpt.isEmpty() || !projectOpt.get().getOwnerId().equals(ownerId)) {
            log.warn("Project not found or unauthorized for project id: {} by user: {}", projectId, ownerId);
            return Optional.empty();
        }

        log.debug("Found project owned by: {} for request by user: {}", projectOpt.get().getOwnerId(), ownerId);

        Project project = projectOpt.get();
        Blog blog = blogRepository.findByProjectId(projectId)
                .orElse(Blog.builder()
                        .project(project)
                        .build());

        boolean isNewBlog = blog.getId() == null;
        log.debug("{} blog for project {}", isNewBlog ? "Creating new" : "Updating existing", projectId);

        blog.setHeading(request.heading());
        blog.setCoverImageUrl(request.coverImageUrl());
        blog.setIntroduction(request.introduction());
        blog.setContent(request.content());
        blog.setCustomFields(serializeCustomFields(request.customFields()));
        blog.setInterestTags(serializeCustomFields(request.interestTags()));

        Blog savedBlog = blogRepository.save(blog);
        log.debug("Successfully {} blog with id: {}", isNewBlog ? "created" : "updated", savedBlog.getId());

        return Optional.of(new BlogDTOs.BlogContentDTO(
                savedBlog.getHeading(),
                savedBlog.getCoverImageUrl(),
                savedBlog.getIntroduction(),
                savedBlog.getContent(),
                request.customFields(),
                request.interestTags()));
    }

    private List<Map<String, Object>> parseCustomFields(String json) {
        if (json == null || json.isEmpty()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {
            });
        } catch (JsonProcessingException e) {
            log.error("Error parsing custom fields JSON", e);
            return List.of();
        }
    }

    private String serializeCustomFields(List<Map<String, Object>> customFields) {
        if (customFields == null || customFields.isEmpty()) {
            return "[]";
        }
        try {
            return objectMapper.writeValueAsString(customFields);
        } catch (JsonProcessingException e) {
            log.error("Error serializing custom fields", e);
            return "[]";
        }
    }
}
