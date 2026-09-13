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

    public static boolean isExcludedDataSection(String titleOrVal) {
        if (titleOrVal == null || titleOrVal.trim().isEmpty()) return false;
        String t = titleOrVal.toLowerCase();
        return t.contains("value advantage") ||
               t.contains("cvp") ||
               t.contains("cost comparison") ||
               t.contains("market opportunity") ||
               t.contains("market sizing") ||
               t.contains("market dynamics") ||
               t.contains("customer urgency") ||
               t.contains("target pricing") ||
               t.contains("customer acquisition") ||
               t.contains("acquisition data") ||
               t.contains("growth engine") ||
               t.contains("defensibility & moat") ||
               t.contains("defensibility") ||
               t.contains("moat data") ||
               t.contains("core advantage") ||
               t.contains("technical barrier") ||
               t.contains("defense strategy") ||
               t.contains("execution & build") ||
               t.contains("build readiness") ||
               t.contains("buildability") ||
               t.contains("team execution") ||
               t.contains("current milestone");
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

            // Filter out the 5 math and data sections (only typed narrative answers allowed)
            if (isExcludedDataSection(title) || isExcludedDataSection(value)) {
                continue;
            }

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

            // 1. The Problem (Typed Answer)
            String problem = getString.apply(new String[]{"problem_story", "problem", "the_problem", "problemDescription"});
            if (!problem.isEmpty()) {
                fields.add(createSectionField("The Problem", problem, order++));
            }

            // 2. What We're Building (Typed Answer)
            String solution = getString.apply(new String[]{"our_solution", "solution", "what_building", "solutionDescription"});
            if (!solution.isEmpty()) {
                fields.add(createSectionField("What We're Building", solution, order++));
            }

            // 3. Who It's For (Typed Answer)
            String target = getString.apply(new String[]{"target_customer", "target_audience", "idealCustomer", "who_its_for"});
            if (!target.isEmpty()) {
                fields.add(createSectionField("Who It's For", target, order++));
            }

            // 4. The Hook (Typed Answer)
            String hook = getString.apply(new String[]{"the_hook", "hook", "keyInsight", "surprisingInsight"});
            if (!hook.isEmpty()) {
                fields.add(createSectionField("The Hook", hook, order++));
            }

            // 5. The Founder's Story (Typed Answer)
            String founder = getString.apply(new String[]{"founder_story", "founderStory", "motivation", "the_founders_story"});
            if (!founder.isEmpty()) {
                fields.add(createSectionField("The Founder's Story", founder, order++));
            }

            // 6. Our Vision (Typed Answer)
            String vision = getString.apply(new String[]{"vision", "longTermVision", "our_vision"});
            if (!vision.isEmpty()) {
                fields.add(createSectionField("Our Vision", vision, order++));
            }

            // 7. Get Involved (Typed Answer)
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
