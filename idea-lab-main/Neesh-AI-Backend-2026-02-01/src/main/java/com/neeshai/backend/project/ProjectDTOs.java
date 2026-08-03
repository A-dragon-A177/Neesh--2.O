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
            ZonedDateTime createdAt,
            ZonedDateTime updatedAt) {
        public static PrivateProjectDTO fromEntity(Project project) {
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
                    project.getCreatedAt(),
                    project.getUpdatedAt());
        }
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
