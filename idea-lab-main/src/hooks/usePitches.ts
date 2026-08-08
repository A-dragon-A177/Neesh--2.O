import { useState, useCallback, useRef } from "react";
import apiClient from "@/lib/api";

export interface PitchFeedItem {
  projectId: string;
  title: string;
  oneLineSummary: string | null;
  slug: string;
  elevatorPitchUrl: string;
  elevatorPitchThumbnail: string | null;
  elevatorPitchDuration: number | null;
  coverImageUrl: string | null;
  authorName: string;
  authorProfileImageUrl: string | null;
}

/**
 * Generate a per-session seed for deterministic shuffling.
 * Same seed → same ordering within a session.
 * Different users/sessions → different ordering.
 */
function getSessionSeed(): number {
  const key = "neesh_feed_seed";
  const stored = sessionStorage.getItem(key);
  if (stored) return parseInt(stored, 10);

  // Generate a random seed for this browser session
  const seed = Math.floor(Math.random() * 2147483647); // max int32
  sessionStorage.setItem(key, seed.toString());
  return seed;
}

export const usePitches = () => {
  const [pitches, setPitches] = useState<PitchFeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 20;

  // Session seed for personalized ordering
  const seedRef = useRef<number>(getSessionSeed());

  const fetchPitches = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      // Build exclude list from already-loaded pitches (prevents repeats)
      const currentPitches = reset ? [] : pitches;
      const excludeIds = currentPitches.map(p => p.projectId).join(",");

      let url = `/api/public/pitches?limit=${LIMIT}&offset=0&seed=${seedRef.current}`;
      if (excludeIds) {
        url += `&exclude=${excludeIds}`;
      }

      const data = await apiClient.get<PitchFeedItem[]>(url, { skipAuth: true });

      if (reset) {
        // Generate a fresh seed on explicit refresh
        const newSeed = Math.floor(Math.random() * 2147483647);
        sessionStorage.setItem("neesh_feed_seed", newSeed.toString());
        seedRef.current = newSeed;
        setPitches(data);
      } else {
        setPitches(prev => [...prev, ...data]);
      }
      setHasMore(data.length === LIMIT);
    } catch (err) {
      console.error("[usePitches] Error fetching pitch feed:", err);
      setHasMore(false); // Prevent infinite loops if API fails
    } finally {
      setLoading(false);
    }
  }, [loading, pitches]);

  const loadMore = () => fetchPitches(false);
  const refresh = () => fetchPitches(true);

  return { pitches, loading, hasMore, loadMore, refresh };
};
