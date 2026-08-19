import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/api";

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
      setData(response);
    } catch (err) {
      console.error("[useValidatedBuyers] Error:", err);
      setData((prev) => prev || { buyers: [], goldCount: 0, silverCount: 0, bronzeCount: 0, totalValidated: 0 });
      setError(err instanceof Error ? err.message : "Failed to fetch validated buyers");
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
      console.warn("[useValidatedBuyers] Backend endpoint warning (retaining optimistic state):", err);
      return data;
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, togglePilotCohort };
};
