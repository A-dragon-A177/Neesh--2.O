package com.neeshai.backend.audience;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

class AudienceValidationTierTest {

    @Test
    void testComputeValidationTier_NoInterest() {
        AudienceMember member = Mockito.mock(AudienceMember.class);
        when(member.getInterestTagLabel()).thenReturn(null);
        when(member.getInterestOtherText()).thenReturn(null);
        when(member.getHasExplicitIntent()).thenReturn(false);

        String tier = AudienceDTOs.computeValidationTier(member);
        assertEquals("NONE", tier);
    }

    @Test
    void testComputeValidationTier_GoldCases() {
        // Gold Path A: High priority (1) + Explicit Intent + Written Feedback + 3+ Chatbot Questions
        AudienceMember m1 = Mockito.mock(AudienceMember.class);
        when(m1.getInterestTagLabel()).thenReturn("Pilot Users");
        when(m1.getInterestTagPriority()).thenReturn(1);
        when(m1.getHasExplicitIntent()).thenReturn(true);
        when(m1.getFeedbackText()).thenReturn("Great app idea!");
        when(m1.getQuestions()).thenReturn(java.util.List.of(
            Mockito.mock(AudienceQuestion.class),
            Mockito.mock(AudienceQuestion.class),
            Mockito.mock(AudienceQuestion.class)
        ));
        assertEquals("GOLD", AudienceDTOs.computeValidationTier(m1));

        // Gold Path A: High priority (2) + Explicit Intent + Written Feedback + 4 Chatbot Questions
        AudienceMember m2 = Mockito.mock(AudienceMember.class);
        when(m2.getInterestTagLabel()).thenReturn("Investment");
        when(m2.getInterestTagPriority()).thenReturn(2);
        when(m2.getHasExplicitIntent()).thenReturn(true);
        when(m2.getFeedbackText()).thenReturn("Send deck please");
        when(m2.getOccupation()).thenReturn(null);
        when(m2.getQuestions()).thenReturn(java.util.List.of(
            Mockito.mock(AudienceQuestion.class),
            Mockito.mock(AudienceQuestion.class),
            Mockito.mock(AudienceQuestion.class),
            Mockito.mock(AudienceQuestion.class)
        ));
        assertEquals("GOLD", AudienceDTOs.computeValidationTier(m2));

        // Gold Path B: Low priority (4) BUT has intent + feedback + 3Q + occupation
        AudienceMember m3 = Mockito.mock(AudienceMember.class);
        when(m3.getInterestTagLabel()).thenReturn("Join Team");
        when(m3.getInterestTagPriority()).thenReturn(4);
        when(m3.getHasExplicitIntent()).thenReturn(true);
        when(m3.getFeedbackText()).thenReturn("Want to join as lead dev");
        when(m3.getOccupation()).thenReturn("Software Engineer");
        when(m3.getQuestions()).thenReturn(java.util.List.of(
            Mockito.mock(AudienceQuestion.class),
            Mockito.mock(AudienceQuestion.class),
            Mockito.mock(AudienceQuestion.class)
        ));
        assertEquals("GOLD", AudienceDTOs.computeValidationTier(m3));
    }

    @Test
    void testComputeValidationTier_GoldRejections() {
        // NOT Gold: High priority + intent + feedback BUT only 2 questions (needs 3)
        AudienceMember m1 = Mockito.mock(AudienceMember.class);
        when(m1.getInterestTagLabel()).thenReturn("Pilot Users");
        when(m1.getInterestTagPriority()).thenReturn(1);
        when(m1.getHasExplicitIntent()).thenReturn(true);
        when(m1.getFeedbackText()).thenReturn("Looks great!");
        when(m1.getOccupation()).thenReturn(null);
        when(m1.getQuestions()).thenReturn(java.util.List.of(
            Mockito.mock(AudienceQuestion.class),
            Mockito.mock(AudienceQuestion.class)
        ));
        // Should be SILVER (Path A: high priority + intent + feedback), NOT Gold
        assertEquals("SILVER", AudienceDTOs.computeValidationTier(m1));

        // NOT Gold: High priority + intent + 1 question + feedback (old algo gave Gold)
        AudienceMember m3 = Mockito.mock(AudienceMember.class);
        when(m3.getInterestTagLabel()).thenReturn("Pilot Users");
        when(m3.getInterestTagPriority()).thenReturn(1);
        when(m3.getHasExplicitIntent()).thenReturn(true);
        when(m3.getFeedbackText()).thenReturn("Promising");
        when(m3.getOccupation()).thenReturn(null);
        when(m3.getQuestions()).thenReturn(java.util.List.of(Mockito.mock(AudienceQuestion.class)));
        // SILVER now (Path A: high priority + intent + feedback)
        assertEquals("SILVER", AudienceDTOs.computeValidationTier(m3));
    }

    @Test
    void testComputeValidationTier_SilverCases() {
        // Silver Path A: Priority 1 + intent + feedback (no questions)
        AudienceMember m1 = Mockito.mock(AudienceMember.class);
        when(m1.getInterestTagLabel()).thenReturn("Pilot Users");
        when(m1.getInterestTagPriority()).thenReturn(1);
        when(m1.getHasExplicitIntent()).thenReturn(true);
        when(m1.getFeedbackText()).thenReturn("Looks promising");
        when(m1.getQuestions()).thenReturn(null);
        assertEquals("SILVER", AudienceDTOs.computeValidationTier(m1));

        // Silver Path A: Priority 2 + intent + 2 chatbot questions (no feedback)
        AudienceMember m2 = Mockito.mock(AudienceMember.class);
        when(m2.getInterestTagLabel()).thenReturn("Investment");
        when(m2.getInterestTagPriority()).thenReturn(2);
        when(m2.getHasExplicitIntent()).thenReturn(true);
        when(m2.getFeedbackText()).thenReturn(null);
        when(m2.getQuestions()).thenReturn(java.util.List.of(
            Mockito.mock(AudienceQuestion.class),
            Mockito.mock(AudienceQuestion.class)
        ));
        assertEquals("SILVER", AudienceDTOs.computeValidationTier(m2));

        // Silver Path B: Priority 3 + intent + feedback + 1 question
        AudienceMember m3 = Mockito.mock(AudienceMember.class);
        when(m3.getInterestTagLabel()).thenReturn("Crowdfunding");
        when(m3.getInterestTagPriority()).thenReturn(3);
        when(m3.getHasExplicitIntent()).thenReturn(true);
        when(m3.getFeedbackText()).thenReturn("Will pledge on Kickstarter");
        when(m3.getQuestions()).thenReturn(java.util.List.of(Mockito.mock(AudienceQuestion.class)));
        assertEquals("SILVER", AudienceDTOs.computeValidationTier(m3));

        // Silver Path C: Engagement score >= 65
        AudienceMember m4 = Mockito.mock(AudienceMember.class);
        when(m4.getInterestTagLabel()).thenReturn("Other");
        when(m4.getInterestTagPriority()).thenReturn(5);
        when(m4.getHasExplicitIntent()).thenReturn(true);
        when(m4.getFeedbackText()).thenReturn("Interesting concept");
        when(m4.getOccupation()).thenReturn("Designer");
        when(m4.getQuestions()).thenReturn(java.util.List.of(
            Mockito.mock(AudienceQuestion.class),
            Mockito.mock(AudienceQuestion.class)
        ));
        // Score = 20(intent) + 20(feedback) + 10(occupation) + 20(2Q) = 70 >= 65
        assertEquals("SILVER", AudienceDTOs.computeValidationTier(m4));
    }

    @Test
    void testComputeValidationTier_SilverRejections() {
        // NOT Silver: Priority 3 + feedback + 1 question BUT NO explicit intent
        AudienceMember m1 = Mockito.mock(AudienceMember.class);
        when(m1.getInterestTagLabel()).thenReturn("Crowdfunding");
        when(m1.getInterestTagPriority()).thenReturn(3);
        when(m1.getHasExplicitIntent()).thenReturn(false);
        when(m1.getInterestedAt()).thenReturn(null);
        when(m1.getFeedbackText()).thenReturn("Will pledge");
        when(m1.getOccupation()).thenReturn(null);
        when(m1.getQuestions()).thenReturn(java.util.List.of(Mockito.mock(AudienceQuestion.class)));
        // Score = 0(no intent) + 20(feedback) + 10(1Q) = 30 < 65
        assertEquals("BRONZE", AudienceDTOs.computeValidationTier(m1));

        // NOT Silver: Priority 2 + intent only (no feedback, no questions)
        AudienceMember m2 = Mockito.mock(AudienceMember.class);
        when(m2.getInterestTagLabel()).thenReturn("Investment");
        when(m2.getInterestTagPriority()).thenReturn(2);
        when(m2.getHasExplicitIntent()).thenReturn(true);
        when(m2.getFeedbackText()).thenReturn(null);
        when(m2.getOccupation()).thenReturn(null);
        when(m2.getQuestions()).thenReturn(null);
        // High priority + intent but NO feedback and NO 2+ questions
        assertEquals("BRONZE", AudienceDTOs.computeValidationTier(m2));
    }

    @Test
    void testComputeValidationTier_BronzeCases() {
        // Bronze: Priority 1 but ONLY clicked interest button (no feedback, no questions)
        AudienceMember m1 = Mockito.mock(AudienceMember.class);
        when(m1.getInterestTagLabel()).thenReturn("Pilot Users");
        when(m1.getInterestTagPriority()).thenReturn(1);
        when(m1.getHasExplicitIntent()).thenReturn(true);
        when(m1.getFeedbackText()).thenReturn(null);
        when(m1.getOccupation()).thenReturn(null);
        when(m1.getQuestions()).thenReturn(null);
        assertEquals("BRONZE", AudienceDTOs.computeValidationTier(m1));

        // Bronze: Priority 4 + feedback but no intent (score = 20 < 65)
        AudienceMember m2 = Mockito.mock(AudienceMember.class);
        when(m2.getInterestTagLabel()).thenReturn("Join Team");
        when(m2.getInterestTagPriority()).thenReturn(4);
        when(m2.getHasExplicitIntent()).thenReturn(false);
        when(m2.getInterestedAt()).thenReturn(null);
        when(m2.getFeedbackText()).thenReturn("Just browsing");
        when(m2.getOccupation()).thenReturn(null);
        when(m2.getQuestions()).thenReturn(null);
        assertEquals("BRONZE", AudienceDTOs.computeValidationTier(m2));

        // Bronze: Priority 2 + intent + 1 question only (no feedback)
        AudienceMember m3 = Mockito.mock(AudienceMember.class);
        when(m3.getInterestTagLabel()).thenReturn("Investment");
        when(m3.getInterestTagPriority()).thenReturn(2);
        when(m3.getHasExplicitIntent()).thenReturn(true);
        when(m3.getFeedbackText()).thenReturn(null);
        when(m3.getOccupation()).thenReturn(null);
        when(m3.getQuestions()).thenReturn(java.util.List.of(Mockito.mock(AudienceQuestion.class)));
        // High priority + intent + 1Q, but Silver Path A needs feedback OR 2+Q
        assertEquals("BRONZE", AudienceDTOs.computeValidationTier(m3));

        // Bronze: Priority 5 + intent + feedback + 2 questions but no occupation (score = 60 < 65)
        AudienceMember m4 = Mockito.mock(AudienceMember.class);
        when(m4.getInterestTagLabel()).thenReturn("Custom Tag");
        when(m4.getInterestTagPriority()).thenReturn(5);
        when(m4.getHasExplicitIntent()).thenReturn(true);
        when(m4.getFeedbackText()).thenReturn("Cool");
        when(m4.getOccupation()).thenReturn(null);
        when(m4.getQuestions()).thenReturn(java.util.List.of(
            Mockito.mock(AudienceQuestion.class),
            Mockito.mock(AudienceQuestion.class)
        ));
        // Score = 20(intent) + 20(feedback) + 20(2Q) = 60 < 65
        assertEquals("BRONZE", AudienceDTOs.computeValidationTier(m4));
    }

    @Test
    void testComputeValidationTier_ScoreThreshold65Boundary() {
        // Score = 60: intent(20) + feedback(20) + occupation(10) + 1Q(10) = 60 < 65
        AudienceMember m1 = Mockito.mock(AudienceMember.class);
        when(m1.getInterestTagLabel()).thenReturn("Other");
        when(m1.getInterestTagPriority()).thenReturn(99);
        when(m1.getHasExplicitIntent()).thenReturn(true);
        when(m1.getFeedbackText()).thenReturn("Good");
        when(m1.getOccupation()).thenReturn("Manager");
        when(m1.getQuestions()).thenReturn(java.util.List.of(Mockito.mock(AudienceQuestion.class)));
        // Score = 20+20+10+10 = 60 < 65
        assertEquals("BRONZE", AudienceDTOs.computeValidationTier(m1));

        // Score = 70: intent(20) + feedback(20) + occupation(10) + 2Q(20) = 70 >= 65
        AudienceMember m2 = Mockito.mock(AudienceMember.class);
        when(m2.getInterestTagLabel()).thenReturn("Other");
        when(m2.getInterestTagPriority()).thenReturn(99);
        when(m2.getHasExplicitIntent()).thenReturn(true);
        when(m2.getFeedbackText()).thenReturn("Feedback");
        when(m2.getOccupation()).thenReturn("Designer");
        when(m2.getQuestions()).thenReturn(java.util.List.of(
            Mockito.mock(AudienceQuestion.class),
            Mockito.mock(AudienceQuestion.class)
        ));
        // Score = 20+20+10+20 = 70 >= 65
        assertEquals("SILVER", AudienceDTOs.computeValidationTier(m2));
    }
}
