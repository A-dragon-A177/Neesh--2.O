import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

export interface ValidatedBuyer {
  id: string;
  name: string;
  email: string;
  occupation: string | null;
  validationTier: "GOLD" | "SILVER" | "BRONZE";
  engagementScore: number | null;
  hasExplicitIntent: boolean;
  interestTagLabel?: string | null;
  interestTagPriority?: number | null;
  interestOtherText?: string | null;
  lastInteractionAt: string | null;
  inPilotCohort?: boolean;
  pilotEnrolledAt?: string | null;
}

export interface ValidatedBuyersData {
  buyers: ValidatedBuyer[];
  goldCount: number;
  silverCount: number;
  bronzeCount: number;
  totalValidated: number;
}

function computeClientValidationTier(m: any): "GOLD" | "SILVER" | "BRONZE" {
  const priority = m.interest_tag_priority ? Number(m.interest_tag_priority) : null;
  const engagement = m.engagement_score ? Number(m.engagement_score) : 0;
  const hasFeedback = Boolean(m.feedback_text && m.feedback_text.trim().length > 0);
  const hasExplicitIntent = Boolean(m.interested_at || m.has_explicit_intent);
  const hasOccupation = Boolean(m.occupation && m.occupation.trim().length > 0);
  const qCount = m.total_questions ? Number(m.total_questions) : 0;

  const isHighPriority = priority !== null && priority <= 2;
  const isMediumPriority = priority !== null && priority <= 3;

  // 1. GOLD TIER
  if (isHighPriority && hasExplicitIntent && hasFeedback && qCount >= 3) return "GOLD";
  if (hasExplicitIntent && hasFeedback && qCount >= 3 && hasOccupation) return "GOLD";

  // 2. SILVER TIER
  if (isHighPriority && hasExplicitIntent && (hasFeedback || qCount >= 2)) return "SILVER";
  if (isMediumPriority && hasExplicitIntent && hasFeedback && qCount >= 1) return "SILVER";
  if (engagement >= 65) return "SILVER";

  // 3. BRONZE TIER
  return "BRONZE";
}

export const useValidatedBuyers = (projectId: string | undefined) => {
  const [data, setData] = useState<ValidatedBuyersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    if (!opts?.silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await apiClient.get<ValidatedBuyersData>(
        `/api/projects/${projectId}/validated-buyers`
      );
      if (response && Array.isArray(response.buyers)) {
        setData(response);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn("[useValidatedBuyers] Backend fetch failed, falling back to direct Supabase query:", err);
    }

    // Direct Supabase fallback
    try {
      const { data: members, error: supaErr } = await supabase
        .from("audience_members" as any)
        .select("*")
        .eq("project_id", projectId)
        .order("last_interaction_at", { ascending: false });

      if (supaErr || !members) {
        throw supaErr || new Error("No members returned");
      }

      const buyers: ValidatedBuyer[] = members.map((m: any) => ({
        id: m.id,
        name: m.name || "Anonymous Member",
        email: m.email || "",
        occupation: m.occupation || null,
        validationTier: computeClientValidationTier(m),
        engagementScore: m.engagement_score || 50,
        hasExplicitIntent: Boolean(m.interested_at || m.has_explicit_intent),
        interestTagLabel: m.interest_tag_label || null,
        interestTagPriority: m.interest_tag_priority || null,
        interestOtherText: m.interest_other_text || null,
        lastInteractionAt: m.last_interaction_at || m.created_at,
        inPilotCohort: Boolean(m.in_pilot_cohort),
        pilotEnrolledAt: m.pilot_enrolled_at || null,
      }));

      const goldCount = buyers.filter((b) => b.validationTier === "GOLD").length;
      const silverCount = buyers.filter((b) => b.validationTier === "SILVER").length;
      const bronzeCount = buyers.filter((b) => b.validationTier === "BRONZE").length;

      setData({
        buyers,
        goldCount,
        silverCount,
        bronzeCount,
        totalValidated: buyers.length,
      });
    } catch (fallbackErr) {
      console.error("[useValidatedBuyers] Error in Supabase fallback:", fallbackErr);
      setData((prev) => prev || { buyers: [], goldCount: 0, silverCount: 0, bronzeCount: 0, totalValidated: 0 });
      setError(fallbackErr instanceof Error ? fallbackErr.message : "Failed to fetch validated buyers");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const togglePilotCohort = async (memberIds: string[], enroll: boolean) => {
    if (!projectId) return null;

    // Optimistically update local state so UI updates instantly
    setData((prev) => {
      if (!prev) return prev;
      const updatedBuyers = prev.buyers.map((b) =>
        memberIds.includes(b.id)
          ? { ...b, inPilotCohort: enroll, pilotEnrolledAt: enroll ? new Date().toISOString() : null }
          : b
      );
      return { ...prev, buyers: updatedBuyers };
    });

    try {
      const response = await apiClient.post<ValidatedBuyersData>(
        `/api/projects/${projectId}/validated-buyers/pilot-cohort`,
        { memberIds, enroll }
      );
      if (response && response.buyers) {
        setData(response);
      }
      return response;
    } catch (err) {
      console.warn("[useValidatedBuyers] Backend endpoint warning, persisting via Supabase directly:", err);
      try {
        await supabase
          .from("audience_members" as any)
          .update({
            in_pilot_cohort: enroll,
            pilot_enrolled_at: enroll ? new Date().toISOString() : null,
          })
          .in("id", memberIds);
      } catch (supaErr) {
        console.error("[useValidatedBuyers] Failed to update pilot cohort in Supabase:", supaErr);
      }
      return data;
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, togglePilotCohort };
};
