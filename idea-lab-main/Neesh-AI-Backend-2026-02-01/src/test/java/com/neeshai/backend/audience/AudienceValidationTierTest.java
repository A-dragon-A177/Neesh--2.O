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
        // Gold Case 1: High priority + Explicit Intent + Written Feedback + Chatbot Question
        AudienceMember m1 = Mockito.mock(AudienceMember.class);
        when(m1.getInterestTagLabel()).thenReturn("Pilot Users");
        when(m1.getInterestTagPriority()).thenReturn(1);
        when(m1.getHasExplicitIntent()).thenReturn(true);
        when(m1.getFeedbackText()).thenReturn("Great app idea!");
        when(m1.getQuestions()).thenReturn(java.util.List.of(Mockito.mock(AudienceQuestion.class)));
        assertEquals("GOLD", AudienceDTOs.computeValidationTier(m1));

        // Gold Case 2: High priority + Explicit Intent + 2 Chatbot Questions
        AudienceMember m2 = Mockito.mock(AudienceMember.class);
        when(m2.getInterestTagLabel()).thenReturn("Investment");
        when(m2.getInterestTagPriority()).thenReturn(2);
        when(m2.getHasExplicitIntent()).thenReturn(true);
        when(m2.getFeedbackText()).thenReturn(null);
        when(m2.getQuestions()).thenReturn(java.util.List.of(
            Mockito.mock(AudienceQuestion.class),
            Mockito.mock(AudienceQuestion.class)
        ));
        assertEquals("GOLD", AudienceDTOs.computeValidationTier(m2));

        // Gold Case 3: Ultra-high multi-signal engagement (score = 20 + 20 + 10 + 25 = 75 >= 70)
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
    void testComputeValidationTier_SilverCases() {
        // Silver Case 1: Priority 1 tag ("Pilot Users") + written feedback (score = 15+15 = 30)
        AudienceMember m1 = Mockito.mock(AudienceMember.class);
        when(m1.getInterestTagLabel()).thenReturn("Pilot Users");
        when(m1.getInterestTagPriority()).thenReturn(1);
        when(m1.getHasExplicitIntent()).thenReturn(true);
        when(m1.getFeedbackText()).thenReturn("Looks promising");
        when(m1.getQuestions()).thenReturn(null);
        assertEquals("SILVER", AudienceDTOs.computeValidationTier(m1));

        // Silver Case 2: Priority 2 tag ("Investment") + written feedback
        AudienceMember m2 = Mockito.mock(AudienceMember.class);
        when(m2.getInterestTagLabel()).thenReturn("Investment");
        when(m2.getInterestTagPriority()).thenReturn(2);
        when(m2.getHasExplicitIntent()).thenReturn(true);
        when(m2.getFeedbackText()).thenReturn("Send deck please");
        when(m2.getQuestions()).thenReturn(null);
        assertEquals("SILVER", AudienceDTOs.computeValidationTier(m2));

        // Silver Case 3: Priority 3 tag ("Crowdfunding") + written feedback
        AudienceMember m3 = Mockito.mock(AudienceMember.class);
        when(m3.getInterestTagLabel()).thenReturn("Crowdfunding");
        when(m3.getInterestTagPriority()).thenReturn(3);
        when(m3.getHasExplicitIntent()).thenReturn(true);
        when(m3.getFeedbackText()).thenReturn("Will pledge on Kickstarter");
        when(m3.getQuestions()).thenReturn(null);
        assertEquals("SILVER", AudienceDTOs.computeValidationTier(m3));
    }

    @Test
    void testComputeValidationTier_BronzeCases() {
        // Bronze Case 1: Priority 1 tag ("Pilot Users") but ONLY clicked interest button (no feedback, no questions)
        AudienceMember m1 = Mockito.mock(AudienceMember.class);
        when(m1.getInterestTagLabel()).thenReturn("Pilot Users");
        when(m1.getInterestTagPriority()).thenReturn(1);
        when(m1.getHasExplicitIntent()).thenReturn(true);
        when(m1.getFeedbackText()).thenReturn(null);
        when(m1.getQuestions()).thenReturn(null);
        assertEquals("BRONZE", AudienceDTOs.computeValidationTier(m1));

        // Bronze Case 2: Priority 2 tag ("Investment") but ONLY clicked interest button
        AudienceMember m2 = Mockito.mock(AudienceMember.class);
        when(m2.getInterestTagLabel()).thenReturn("Investment");
        when(m2.getInterestTagPriority()).thenReturn(2);
        when(m2.getHasExplicitIntent()).thenReturn(true);
        when(m2.getFeedbackText()).thenReturn(null);
        when(m2.getQuestions()).thenReturn(null);
        assertEquals("BRONZE", AudienceDTOs.computeValidationTier(m2));

        // Bronze Case 3: Priority 3 tag ("Crowdfunding") without feedback
        AudienceMember m3 = Mockito.mock(AudienceMember.class);
        when(m3.getInterestTagLabel()).thenReturn("Crowdfunding");
        when(m3.getInterestTagPriority()).thenReturn(3);
        when(m3.getHasExplicitIntent()).thenReturn(true);
        when(m3.getFeedbackText()).thenReturn(null);
        when(m3.getQuestions()).thenReturn(null);
        assertEquals("BRONZE", AudienceDTOs.computeValidationTier(m3));

        // Bronze Case 4: Priority 4 tag ("Join Team") or custom text without questions/high engagement
        AudienceMember m4 = Mockito.mock(AudienceMember.class);
        when(m4.getInterestTagLabel()).thenReturn("Join Team");
        when(m4.getInterestTagPriority()).thenReturn(4);
        when(m4.getHasExplicitIntent()).thenReturn(true);
        when(m4.getFeedbackText()).thenReturn("Just browsing");
        when(m4.getQuestions()).thenReturn(null);
        assertEquals("BRONZE", AudienceDTOs.computeValidationTier(m4));
    }
}
