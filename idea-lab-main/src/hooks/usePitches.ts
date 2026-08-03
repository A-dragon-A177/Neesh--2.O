import { useState, useCallback } from "react";
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
}

export const usePitches = () => {
  const [pitches, setPitches] = useState<PitchFeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 20;

  const fetchPitches = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const currentOffset = reset ? 0 : offset;
      const data = await apiClient.get<PitchFeedItem[]>(
        `/api/public/pitches?limit=${LIMIT}&offset=${currentOffset}`,
        { skipAuth: true }
      );
      if (reset) {
        setPitches(data);
        setOffset(data.length);
      } else {
        setPitches(prev => [...prev, ...data]);
        setOffset(prev => prev + data.length);
      }
      setHasMore(data.length === LIMIT);
    } catch (err) {
      console.error("[usePitches] Error fetching pitch feed:", err);
      setHasMore(false); // Prevent infinite loops if API fails
    } finally {
      setLoading(false);
    }
  }, [loading, offset]);

  const loadMore = () => fetchPitches(false);
  const refresh = () => fetchPitches(true);

  return { pitches, loading, hasMore, loadMore, refresh };
};
