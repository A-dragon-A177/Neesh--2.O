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
        // Gold Case 1: High engagement (>= 50) and Priority 1 Tag
        AudienceMember m1 = Mockito.mock(AudienceMember.class);
        when(m1.getInterestTagLabel()).thenReturn("Premium Feature");
        when(m1.getInterestTagPriority()).thenReturn(1);
        when(m1.getEngagementScore()).thenReturn(65.0);
        assertEquals("GOLD", AudienceDTOs.computeValidationTier(m1));

        // Gold Case 2: High engagement (>= 50) and Priority 2 Tag
        AudienceMember m2 = Mockito.mock(AudienceMember.class);
        when(m2.getInterestTagLabel()).thenReturn("Advanced Analytics");
        when(m2.getInterestTagPriority()).thenReturn(2);
        when(m2.getEngagementScore()).thenReturn(50.0);
        assertEquals("GOLD", AudienceDTOs.computeValidationTier(m2));

        // Gold Case 3: High engagement (>= 50) and Priority is Null (explicit intent only)
        AudienceMember m3 = Mockito.mock(AudienceMember.class);
        when(m3.getHasExplicitIntent()).thenReturn(true);
        when(m3.getInterestTagPriority()).thenReturn(null);
        when(m3.getEngagementScore()).thenReturn(90.0);
        assertEquals("GOLD", AudienceDTOs.computeValidationTier(m3));
    }

    @Test
    void testComputeValidationTier_SilverCases() {
        // Silver Case 1: Low Priority Tag (Priority 4+) but High Engagement (>= 50)
        AudienceMember m1 = Mockito.mock(AudienceMember.class);
        when(m1.getInterestTagLabel()).thenReturn("Basic Feature");
        when(m1.getInterestTagPriority()).thenReturn(4);
        when(m1.getEngagementScore()).thenReturn(80.0);
        assertEquals("SILVER", AudienceDTOs.computeValidationTier(m1));

        // Silver Case 2: Medium Priority Tag (Priority 3) but Low/Mid Engagement
        AudienceMember m2 = Mockito.mock(AudienceMember.class);
        when(m2.getInterestTagLabel()).thenReturn("Dashboard Link");
        when(m2.getInterestTagPriority()).thenReturn(3);
        when(m2.getEngagementScore()).thenReturn(20.0);
        assertEquals("SILVER", AudienceDTOs.computeValidationTier(m2));

        // Silver Case 3: Priority 1 but Low Engagement (< 50)
        AudienceMember m3 = Mockito.mock(AudienceMember.class);
        when(m3.getInterestTagLabel()).thenReturn("Core Offer");
        when(m3.getInterestTagPriority()).thenReturn(1);
        when(m3.getEngagementScore()).thenReturn(40.0);
        assertEquals("SILVER", AudienceDTOs.computeValidationTier(m3));

        // Silver Case 4: Priority is Null but Mid Engagement (>= 30)
        AudienceMember m4 = Mockito.mock(AudienceMember.class);
        when(m4.getHasExplicitIntent()).thenReturn(true);
        when(m4.getInterestTagPriority()).thenReturn(null);
        when(m4.getEngagementScore()).thenReturn(45.0);
        assertEquals("SILVER", AudienceDTOs.computeValidationTier(m4));
    }

    @Test
    void testComputeValidationTier_BronzeCases() {
        // Bronze Case 1: Low Priority Tag (Priority 4) and Low Engagement (< 50)
        AudienceMember m1 = Mockito.mock(AudienceMember.class);
        when(m1.getInterestTagLabel()).thenReturn("Nice-to-have Option");
        when(m1.getInterestTagPriority()).thenReturn(4);
        when(m1.getEngagementScore()).thenReturn(25.0);
        assertEquals("BRONZE", AudienceDTOs.computeValidationTier(m1));

        // Bronze Case 2: Priority is Null and Low Engagement (< 30)
        AudienceMember m2 = Mockito.mock(AudienceMember.class);
        when(m2.getHasExplicitIntent()).thenReturn(true);
        when(m2.getInterestTagPriority()).thenReturn(null);
        when(m2.getEngagementScore()).thenReturn(15.0);
        assertEquals("BRONZE", AudienceDTOs.computeValidationTier(m2));
    }
}
