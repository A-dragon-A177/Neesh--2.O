package com.neeshai.backend.project;

import java.time.ZonedDateTime;
import java.util.UUID;

public class ProjectDTOs {

    public record CreateProjectRequest(
            String title,
            String oneLineSummary,
            String introduction,
            String description,
            String industry,
            String startupStage,
            String validationAnswers,
            Boolean onboardingCompleted) {
    }

    public record UpdateProjectRequest(
            String title,
            String oneLineSummary,
            String introduction,
            String description,
            String status,
            String industry,
            String startupStage,
            String validationAnswers,
            Boolean onboardingCompleted,
            String elevatorPitchUrl,
            String elevatorPitchThumbnail,
            Integer elevatorPitchDuration,
            Double earlyAccessPrice) {
    }

    // PRIVATE DTO (Owner access)
    public record PrivateProjectDTO(
            UUID id,
            String title,
            String slug,
            String oneLineSummary,
            String introduction,
            String description,
            String status,
            String industry,
            String startupStage,
            String validationAnswers,
            String validationReport,
            Boolean onboardingCompleted,
            String elevatorPitchUrl,
            String elevatorPitchThumbnail,
            Integer elevatorPitchDuration,
            Double earlyAccessPrice,
            ZonedDateTime timerDeadline,
            ZonedDateTime createdAt,
            ZonedDateTime updatedAt,
            Integer audienceViewCount) {
        public static PrivateProjectDTO fromEntity(Project project) {
            return fromEntity(project, 0);
        }

        public static PrivateProjectDTO fromEntity(Project project, int audienceCount) {
            int pitchViews = project.getPitchViewCount() != null ? project.getPitchViewCount() : 0;
            int totalAudienceViews = Math.max(pitchViews, audienceCount);
            return new PrivateProjectDTO(
                    project.getId(),
                    project.getTitle(),
                    project.getSlug(),
                    project.getOneLineSummary(),
                    project.getIntroduction(),
                    project.getDescription(),
                    project.getStatus(),
                    project.getIndustry(),
                    project.getStartupStage(),
                    project.getValidationAnswers(),
                    project.getValidationReport(),
                    project.getOnboardingCompleted() != null ? project.getOnboardingCompleted() : false,
                    project.getElevatorPitchUrl(),
                    project.getElevatorPitchThumbnail(),
                    project.getElevatorPitchDuration(),
                    project.getEarlyAccessPrice(),
                    project.getTimerDeadline() != null ? project.getTimerDeadline() : (project.getCreatedAt() != null ? project.getCreatedAt().plusDays(5) : null),
                    project.getCreatedAt(),
                    project.getUpdatedAt(),
                    totalAudienceViews);
        }
    }

    // PROJECT TIMER & AUDIENCE SPRINT STATUS DTO
    public record ProjectTimerStatusDTO(
            UUID projectId,
            String status,
            ZonedDateTime createdAt,
            ZonedDateTime timerDeadline,
            long secondsRemaining,
            boolean isExpired,
            boolean isLocked,
            boolean meetsRequirements,
            int goldCount,
            int goldTarget,
            int silverCount,
            int silverTarget,
            int bronzeCount,
            int bronzeTarget
    ) {
    }

    // PUBLIC DTO (Public access - Restricted fields)
    public record PublicProjectDTO(
            String title,
            String slug,
            String oneLineSummary,
            String introduction,
            String description,
            String industry,
            String startupStage,
            String elevatorPitchUrl,
            String elevatorPitchThumbnail,
            Integer elevatorPitchDuration,
            Double earlyAccessPrice,
            ZonedDateTime updatedAt) {
        public static PublicProjectDTO fromEntity(Project project) {
            return new PublicProjectDTO(
                    project.getTitle(),
                    project.getSlug(),
                    project.getOneLineSummary(),
                    project.getIntroduction(),
                    project.getDescription(),
                    project.getIndustry(),
                    project.getStartupStage(),
                    project.getElevatorPitchUrl(),
                    project.getElevatorPitchThumbnail(),
                    project.getElevatorPitchDuration(),
                    project.getEarlyAccessPrice(),
                    project.getUpdatedAt());
        }
    }
}
