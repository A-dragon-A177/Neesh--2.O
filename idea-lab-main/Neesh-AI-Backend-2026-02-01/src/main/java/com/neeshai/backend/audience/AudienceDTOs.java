package com.neeshai.backend.audience;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class AudienceDTOs {

        // ===== Member DTOs =====

        public record AudienceMemberSummary(
                        UUID id,
                        String name,
                        String email,
                        String occupation,
                        String personaType,
                        Double confidenceScore,
                        Double engagementScore,
                        String feedbackSummary,
                        Instant firstInteractionAt,
                        Instant lastInteractionAt,
                        int questionCount,
                        String validationTier,
                        boolean hasExplicitIntent) {
                public static AudienceMemberSummary fromEntity(AudienceMember m) {
                        String summary = m.getFeedbackText();
                        if (summary != null && summary.length() > 100) {
                                summary = summary.substring(0, 100) + "...";
                        }
                        int qCount = m.getQuestions() != null ? m.getQuestions().size() : 0;
                        return new AudienceMemberSummary(
                                        m.getId(), m.getName(), m.getEmail(), m.getOccupation(),
                                        m.getPersonaType(), m.getConfidenceScore(), m.getEngagementScore(),
                                        summary, m.getFirstInteractionAt(), m.getLastInteractionAt(), qCount,
                                        computeValidationTier(m),
                                        m.getHasExplicitIntent() != null ? m.getHasExplicitIntent() : false);
                }
        }

        public record AudienceMemberDetail(
                        UUID id,
                        String name,
                        String email,
                        String occupation,
                        String personaType,
                        Double confidenceScore,
                        Double engagementScore,
                        String feedbackText,
                        String feedbackSource,
                        Instant feedbackSubmittedAt,
                        Instant firstInteractionAt,
                        Instant lastInteractionAt,
                        List<AudienceQuestionDTO> questions) {
                public static AudienceMemberDetail fromEntity(AudienceMember m, List<AudienceQuestion> questions) {
                        List<AudienceQuestionDTO> qDtos = questions.stream()
                                        .map(AudienceQuestionDTO::fromEntity)
                                        .toList();
                        return new AudienceMemberDetail(
                                        m.getId(), m.getName(), m.getEmail(), m.getOccupation(),
                                        m.getPersonaType(), m.getConfidenceScore(), m.getEngagementScore(),
                                        m.getFeedbackText(), m.getFeedbackSource(), m.getFeedbackSubmittedAt(),
                                        m.getFirstInteractionAt(), m.getLastInteractionAt(), qDtos);
                }
        }

        public record AudienceMemberListResponse(
                        List<AudienceMemberSummary> members,
                        int count) {
        }

        // ===== Question DTOs =====

        public record AudienceQuestionDTO(
                        UUID id,
                        String questionText,
                        String chatbotAnswer,
                        String customAdminAnswer,
                        String status,
                        Instant askedAt,
                        Instant answeredAt,
                        Instant respondedAt) {
                public static AudienceQuestionDTO fromEntity(AudienceQuestion q) {
                        return new AudienceQuestionDTO(
                                        q.getId(), q.getQuestionText(), q.getChatbotAnswer(),
                                        q.getCustomAdminAnswer(), q.getStatus(),
                                        q.getAskedAt(), q.getAnsweredAt(), q.getRespondedAt());
                }
        }

        public record AnswerQuestionRequest(
                        String answer) {
        }

        public record AnswerQuestionResponse(
                        UUID questionId,
                        String status,
                        Instant respondedAt) {
        }

        // ===== Public Feedback DTOs =====

        public record PublicFeedbackRequest(
                        String name,
                        String email,
                        String occupation,
                        String feedbackText) {
        }

        public record PublicFeedbackResponse(
                        UUID memberId,
                        String message) {
        }

        // ===== Chat Interaction DTOs =====

        public record ChatInteractionRequest(
                        String query,
                        String answer,
                        String userName,
                        String userEmail) {
        }

        // ===== Interest Intent DTOs =====

        public record InterestSubmitRequest(
                        String name,
                        String email,
                        String tagId,
                        String tagLabel,
                        Integer tagPriority,
                        String otherText) {
        }

        public record InterestSubmitResponse(
                        UUID memberId,
                        String validationTier,
                        String message,
                        boolean alreadySubmitted) {
        }

        // ===== Validated Buyers Summary =====

        public record ValidatedBuyerSummary(
                        UUID id,
                        String name,
                        String email,
                        String occupation,
                        String validationTier,
                        Double engagementScore,
                        boolean hasExplicitIntent,
                        String interestTagLabel,
                        Integer interestTagPriority,
                        String interestOtherText,
                        Instant lastInteractionAt,
                        boolean inPilotCohort,
                        Instant pilotEnrolledAt) {
                public static ValidatedBuyerSummary fromEntity(AudienceMember m) {
                        return new ValidatedBuyerSummary(
                                        m.getId(), m.getName(), m.getEmail(), m.getOccupation(),
                                        computeValidationTier(m),
                                        m.getEngagementScore(),
                                        m.getHasExplicitIntent() != null ? m.getHasExplicitIntent() : false,
                                        m.getInterestTagLabel(),
                                        m.getInterestTagPriority(),
                                        m.getInterestOtherText(),
                                        m.getLastInteractionAt(),
                                        m.getInPilotCohort() != null ? m.getInPilotCohort() : false,
                                        m.getPilotEnrolledAt());
                }
        }

        public record BatchPilotEnrollRequest(
                        List<UUID> memberIds,
                        boolean enroll) {
        }

        public record ValidatedBuyersResponse(
                        List<ValidatedBuyerSummary> buyers,
                        int goldCount,
                        int silverCount,
                        int bronzeCount,
                        int totalValidated) {
        }

        // ===== Shared Tier Computation =====

        public static String computeValidationTier(AudienceMember m) {
                boolean hasInterest = m.getInterestTagLabel() != null 
                        || (m.getInterestOtherText() != null && !m.getInterestOtherText().isBlank())
                        || (m.getHasExplicitIntent() != null && m.getHasExplicitIntent());

                if (!hasInterest) return "NONE";

                Integer priority = m.getInterestTagPriority();
                double engagement = m.getEngagementScore() != null ? m.getEngagementScore() : 0.0;
                boolean hasFeedback = m.getFeedbackText() != null && !m.getFeedbackText().isBlank();
                int qCount = m.getQuestions() != null ? m.getQuestions().size() : 0;

                // 1. GOLD TIER:
                // Requires high interest eligibility (Priority 1 or 2) AND active engagement (feedback, questions, or engagement >= 35)
                if (engagement >= 45) {
                        return "GOLD";
                }
                if ((priority == null || priority <= 2) && (hasFeedback || qCount > 0 || engagement >= 35)) {
                        return "GOLD";
                }

                // 2. SILVER TIER:
                // Moderate priority or active interaction without full Gold criteria
                if (priority != null && priority <= 3) {
                        return "SILVER";
                }
                if (engagement >= 20 || hasFeedback || qCount > 0) {
                        return "SILVER";
                }

                // 3. BRONZE TIER: Minimal interaction fallback
                return "BRONZE";
        }

        // ===== Spotlight Analytics =====

        public record SpotlightAnalyticsResponse(
                        int pitchViews,
                        int spotlightOpens,
                        int chatbotInteractions,
                        int interestClicks,
                        int feedbackSubmissions) {
        }

        // ===== Interest Check =====

        public record InterestCheckResponse(
                        boolean alreadySubmitted,
                        String tagLabel) {
        }
}
