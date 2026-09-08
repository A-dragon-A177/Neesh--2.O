import { useState, useCallback, useRef } from "react";
import apiClient from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

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
 * Deterministic PRNG seeded shuffle (Mulberry32)
 */
function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let s = seed >>> 0;
  const random = () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Fallback: Query published pitch reels directly from Supabase
 * Ensures 100% feed availability even if Render backend is sleeping or returns 404
 */
async function fetchPitchesFromSupabase(
  limit: number,
  offset: number,
  seed: number,
  excludeIds: Set<string>
): Promise<PitchFeedItem[]> {
  try {
    // 1. Fetch active blog promotions
    const { data: promotions } = await supabase
      .from("blog_promotions" as any)
      .select("*")
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false });

    // 2. Fetch blogs, projects with elevator pitch videos, and users
    const [blogsRes, projectsRes, usersRes] = await Promise.all([
      supabase.from("blogs" as any).select("id, heading, project_id, cover_image_url"),
      supabase.from("projects" as any).select("id, title, slug, one_line_summary, introduction, elevator_pitch_url, elevator_pitch_thumbnail, elevator_pitch_duration, owner_id").not("elevator_pitch_url", "is", null),
      supabase.from("users" as any).select("id, name, profile_image_url"),
    ]);

    const blogs: any[] = blogsRes.data || [];
    const projects: any[] = projectsRes.data || [];
    const users: any[] = usersRes.data || [];

    const blogMap = new Map(blogs.map(b => [b.id, b]));
    const projectMap = new Map(projects.map(p => [p.id, p]));
    const userMap = new Map(users.map(u => [u.id, u]));

    const seenProjectIds = new Set<string>();
    let items: PitchFeedItem[] = [];

    // Priority 1: Projects with active promotions
    for (const promo of (promotions || [])) {
      const blog = blogMap.get(promo.blog_id);
      if (!blog) continue;

      const project = projectMap.get(blog.project_id);
      if (!project || seenProjectIds.has(project.id) || excludeIds.has(project.id)) continue;
      if (!project.elevator_pitch_url || !project.elevator_pitch_url.trim()) continue;

      seenProjectIds.add(project.id);
      const user = userMap.get(promo.user_id) || (project.owner_id ? userMap.get(project.owner_id) : undefined);

      items.push({
        projectId: project.id,
        title: blog.heading || project.title || "Untitled Pitch",
        oneLineSummary: project.one_line_summary || project.introduction || null,
        slug: project.slug || project.id,
        elevatorPitchUrl: project.elevator_pitch_url,
        elevatorPitchThumbnail: project.elevator_pitch_thumbnail || null,
        elevatorPitchDuration: project.elevator_pitch_duration ? Number(project.elevator_pitch_duration) : null,
        coverImageUrl: blog.cover_image_url || null,
        authorName: user?.name || "Founder",
        authorProfileImageUrl: user?.profile_image_url || null,
      });
    }

    // Priority 2: Projects that have an elevator pitch video but no promo row yet
    for (const project of projects) {
      if (seenProjectIds.has(project.id) || excludeIds.has(project.id)) continue;
      if (!project.elevator_pitch_url || !project.elevator_pitch_url.trim()) continue;

      seenProjectIds.add(project.id);
      const user = project.owner_id ? userMap.get(project.owner_id) : undefined;

      items.push({
        projectId: project.id,
        title: project.title || "Untitled Pitch",
        oneLineSummary: project.one_line_summary || project.introduction || null,
        slug: project.slug || project.id,
        elevatorPitchUrl: project.elevator_pitch_url,
        elevatorPitchThumbnail: project.elevator_pitch_thumbnail || null,
        elevatorPitchDuration: project.elevator_pitch_duration ? Number(project.elevator_pitch_duration) : null,
        coverImageUrl: null,
        authorName: user?.name || "Founder",
        authorProfileImageUrl: user?.profile_image_url || null,
      });
    }

    if (seed) {
      items = seededShuffle(items, seed);
    }

    return items.slice(offset, offset + limit);
  } catch (err) {
    console.error("[usePitches] Direct Supabase pitch query error:", err);
    return [];
  }
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
      const excludeSet = new Set(excludeIds.split(",").filter(Boolean));

      let data: PitchFeedItem[] = [];
      let fetchSuccess = false;

      // 1. Attempt backend API first with 3.5s timeout to handle sleeping Render instance
      try {
        let url = `/api/public/pitches?limit=${LIMIT}&offset=0&seed=${seedRef.current}`;
        if (excludeIds) {
          url += `&exclude=${excludeIds}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        data = await apiClient.get<PitchFeedItem[]>(url, {
          skipAuth: true,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (Array.isArray(data) && data.length > 0) {
          fetchSuccess = true;
        }
      } catch (backendErr) {
        console.warn("[usePitches] Backend fetch failed or timed out, falling back to direct Supabase:", backendErr);
      }

      // 2. Direct Supabase fallback if backend fails or returns empty
      if (!fetchSuccess || data.length === 0) {
        data = await fetchPitchesFromSupabase(LIMIT, 0, seedRef.current, excludeSet);
      }

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
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, pitches]);

  const loadMore = () => fetchPitches(false);
  const refresh = () => fetchPitches(true);

  return { pitches, loading, hasMore, loadMore, refresh };
};

