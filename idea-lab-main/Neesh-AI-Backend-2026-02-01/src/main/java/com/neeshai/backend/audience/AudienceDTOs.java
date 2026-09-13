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
                        if ((summary == null || summary.isBlank()) && m.getQuestions() != null && !m.getQuestions().isEmpty()) {
                                String lastQ = m.getQuestions().get(m.getQuestions().size() - 1).getQuestionText();
                                summary = "Asked: " + (lastQ.length() > 80 ? lastQ.substring(0, 80) + "..." : lastQ);
                        }
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
                        String feedbackText,
                        String feedbackSource) {
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
                        String userEmail,
                        String sessionId) {
                public ChatInteractionRequest(String query, String answer, String userName, String userEmail) {
                        this(query, answer, userName, userEmail, null);
                }
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
                                        calculateDynamicEngagementScore(m),
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

        // ===== Shared Dynamic Scoring & Tier Computation =====

        public static double calculateDynamicEngagementScore(AudienceMember m) {
                double score = 0.0;
                // 1. Explicit purchase intent / clicked "I'm Interested": +20 pts
                if (m.getInterestedAt() != null || (m.getHasExplicitIntent() != null && m.getHasExplicitIntent())) {
                        score += 20.0;
                }
                // 2. Submitted written feedback / form comments: +20 pts
                if (m.getFeedbackText() != null && !m.getFeedbackText().isBlank()) {
                        score += 20.0;
                }
                // 3. Provided occupation: +10 pts
                if (m.getOccupation() != null && !m.getOccupation().isBlank()) {
                        score += 10.0;
                }
                // 4. Asked chatbot questions: 1st Q (+10 pts), 2nd Q (+10 pts), 3rd+ Q (+5 pts) -> max 25 pts
                int qCount = m.getQuestions() != null ? m.getQuestions().size() : 0;
                if (qCount >= 1) score += 10.0;
                if (qCount >= 2) score += 10.0;
                if (qCount >= 3) score += 5.0;

                return Math.min(100.0, score);
        }

        public static String computeValidationTier(AudienceMember m) {
                boolean hasInterest = m.getInterestTagLabel() != null 
                        || (m.getInterestOtherText() != null && !m.getInterestOtherText().isBlank())
                        || (m.getHasExplicitIntent() != null && m.getHasExplicitIntent());

                if (!hasInterest) return "NONE";

                Integer priority = m.getInterestTagPriority();
                double engagement = calculateDynamicEngagementScore(m);
                boolean hasFeedback = m.getFeedbackText() != null && !m.getFeedbackText().isBlank();
                int qCount = m.getQuestions() != null ? m.getQuestions().size() : 0;
                boolean hasExplicitIntent = m.getInterestedAt() != null || (m.getHasExplicitIntent() != null && m.getHasExplicitIntent());
                boolean hasOccupation = m.getOccupation() != null && !m.getOccupation().isBlank();

                boolean isHighPriority = priority != null && priority <= 2;
                boolean isMediumPriority = priority != null && priority <= 3;

                // ===== 1. GOLD TIER (Hardest — No score-only shortcut) =====
                // Path A: High-priority tag (1 or 2) + explicit intent + written feedback + 3+ chatbot questions
                if (isHighPriority && hasExplicitIntent && hasFeedback && qCount >= 3) {
                        return "GOLD";
                }
                // Path B: Any priority + explicit intent + written feedback + 3+ chatbot questions + occupation
                if (hasExplicitIntent && hasFeedback && qCount >= 3 && hasOccupation) {
                        return "GOLD";
                }

                // ===== 2. SILVER TIER (Requires explicit intent in all paths) =====
                // Path A: High priority (1 or 2) + explicit intent + (written feedback OR 2+ chatbot questions)
                if (isHighPriority && hasExplicitIntent && (hasFeedback || qCount >= 2)) {
                        return "SILVER";
                }
                // Path B: Medium priority (1, 2, or 3) + explicit intent + written feedback + 1+ chatbot questions
                if (isMediumPriority && hasExplicitIntent && hasFeedback && qCount >= 1) {
                        return "SILVER";
                }
                // Path C: Engagement score >= 65 (requires 4+ distinct signals)
                if (engagement >= 65.0) {
                        return "SILVER";
                }

                // ===== 3. BRONZE TIER (Easy catch-all) =====
                // Any audience member who expressed interest but doesn't meet Silver criteria
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
                        String tagLabel,
                        String tagId,
                        String otherText,
                        String feedbackText,
                        String feedbackSubmittedAt,
                        String occupation,
                        String name,
                        boolean hasFeedback) {
        }
}
