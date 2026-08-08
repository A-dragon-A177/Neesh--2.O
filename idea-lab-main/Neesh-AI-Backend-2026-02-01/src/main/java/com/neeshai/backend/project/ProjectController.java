package com.neeshai.backend.project;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

import com.neeshai.backend.audience.AudienceDTOs;
import com.neeshai.backend.audience.AudienceService;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private static final Logger log = LoggerFactory.getLogger(ProjectController.class);

    private final ProjectService projectService;
    private final com.neeshai.backend.blog.BlogService blogService;
    private final AudienceService audienceService;

    public ProjectController(ProjectService projectService, com.neeshai.backend.blog.BlogService blogService,
            AudienceService audienceService) {
        this.projectService = projectService;
        this.blogService = blogService;
        this.audienceService = audienceService;
    }

    private UUID getUserIdFromJwt(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException e) {
            log.error("Failed to parse UUID from JWT subject: {}", jwt.getSubject());
            throw e;
        }
    }

    @PostMapping
    public ResponseEntity<ProjectDTOs.PrivateProjectDTO> createProject(
            @RequestBody ProjectDTOs.CreateProjectRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        log.info("Project creation attempt by: {} - title: {}", jwt.getSubject(), request.title());
        UUID ownerId = getUserIdFromJwt(jwt);

        // Ensure introduction is not null if missing from request
        ProjectDTOs.CreateProjectRequest processedRequest = request;
        if (request.introduction() == null) {
            processedRequest = new ProjectDTOs.CreateProjectRequest(
                    request.title(),
                    request.oneLineSummary(),
                    "",
                    request.description(),
                    request.industry(),
                    request.startupStage(),
                    request.validationAnswers(),
                    request.onboardingCompleted());
        }

        Project project = projectService.createProject(ownerId, processedRequest);
        log.info("Project created successfully with ID: {}", project.getId());
        return ResponseEntity.ok(ProjectDTOs.PrivateProjectDTO.fromEntity(project));
    }

    @GetMapping
    public ResponseEntity<?> getMyProjects(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false, defaultValue = "20") int size,
            @AuthenticationPrincipal Jwt jwt) {
        UUID ownerId = getUserIdFromJwt(jwt);
        if (page != null) {
            org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                    Math.max(0, page), Math.min(Math.max(1, size), 100),
                    org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt")
            );
            return ResponseEntity.ok(projectService.getMyProjects(ownerId, pageable));
        }
        List<ProjectDTOs.PrivateProjectDTO> projects = projectService.getMyProjects(ownerId)
                .stream()
                .map(ProjectDTOs.PrivateProjectDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectDTOs.PrivateProjectDTO> getProject(@PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID ownerId = getUserIdFromJwt(jwt);
        return projectService.getProject(id, ownerId)
                .map(ProjectDTOs.PrivateProjectDTO::fromEntity)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectDTOs.PrivateProjectDTO> updateProject(
            @PathVariable UUID id,
            @RequestBody ProjectDTOs.UpdateProjectRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID ownerId = getUserIdFromJwt(jwt);
        return projectService.updateProject(id, ownerId, request)
                .map(ProjectDTOs.PrivateProjectDTO::fromEntity)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        UUID ownerId = getUserIdFromJwt(jwt);
        boolean deleted = projectService.deleteProject(id, ownerId);
        if (deleted) {
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping(value = "/{id}/pitch-video", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<java.util.Map<String, String>> uploadPitchVideo(
            @PathVariable UUID id,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @AuthenticationPrincipal Jwt jwt) {
        UUID ownerId = getUserIdFromJwt(jwt);
        if (projectService.getProject(id, ownerId).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        String publicUrl = projectService.uploadPitchVideo(id, file);
        return ResponseEntity.ok(java.util.Map.of("publicUrl", publicUrl));
    }

    // Blog Endpoints
    @GetMapping("/{id}/blog")
    public ResponseEntity<com.neeshai.backend.blog.BlogDTOs.BlogContentDTO> getBlogContent(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID ownerId = getUserIdFromJwt(jwt);
        return blogService.getBlogContent(id, ownerId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/blog")
    public ResponseEntity<com.neeshai.backend.blog.BlogDTOs.BlogContentDTO> updateBlogContent(
            @PathVariable UUID id,
            @RequestBody com.neeshai.backend.blog.BlogDTOs.UpdateBlogRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID ownerId = getUserIdFromJwt(jwt);
        return blogService.updateBlogContent(id, ownerId, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Spotlight Analytics Endpoint (Stage 2 Dashboard)
    @GetMapping("/{id}/spotlight-analytics")
    public ResponseEntity<AudienceDTOs.SpotlightAnalyticsResponse> getSpotlightAnalytics(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        // Verify ownership
        UUID ownerId = getUserIdFromJwt(jwt);
        return projectService.getProject(id, ownerId)
                .map(project -> ResponseEntity.ok(audienceService.getSpotlightAnalytics(id)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{projectId}/validated-buyers")
    public ResponseEntity<AudienceDTOs.ValidatedBuyersResponse> getValidatedBuyers(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID ownerId = getUserIdFromJwt(jwt);
        return projectService.getProject(projectId, ownerId)
                .map(project -> ResponseEntity.ok(audienceService.getValidatedBuyers(projectId)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{projectId}/validated-buyers/pilot-cohort")
    public ResponseEntity<AudienceDTOs.ValidatedBuyersResponse> updatePilotCohort(
            @PathVariable UUID projectId,
            @RequestBody AudienceDTOs.BatchPilotEnrollRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID ownerId = getUserIdFromJwt(jwt);
        return projectService.getProject(projectId, ownerId)
                .map(project -> ResponseEntity.ok(audienceService.updatePilotCohortStatus(projectId, request.memberIds(), request.enroll())))
                .orElse(ResponseEntity.notFound().build());
    }
}
