import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import apiClient from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

export interface Promotion {
  id: string;
  blogId: string;
  projectId: string;
  blogTitle: string;
  coverImageUrl: string | null;
  tags: string[];
  status: string;
  createdAt: string;
}

export interface SimilarBlog {
  projectId: string;
  title: string;
  oneLineSummary: string | null;
  coverImageUrl: string | null;
  slug: string;
  authorName: string;
  matchingTags: string[];
}

export const usePromotions = () => {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);

  // Guard against duplicate fetches
  const lastFetchedUserIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchPromotions = useCallback(async (force = false) => {
    if (!user) {
      setPromotions([]);
      lastFetchedUserIdRef.current = null;
      return;
    }

    if (!force && lastFetchedUserIdRef.current === user.id) {
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setLoading(true);
      let data: Promotion[] = [];
      let success = false;
      try {
        data = await apiClient.get<Promotion[]>('/api/promotions');
        success = true;
      } catch (backendErr) {
        console.warn("[usePromotions] Backend fetch failed, falling back to direct Supabase:", backendErr);
        const { data: promos } = await supabase
          .from("blog_promotions" as any)
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (promos && promos.length > 0) {
          const blogIds = promos.map((p: any) => p.blog_id).filter(Boolean);
          const { data: blogs } = await supabase
            .from("blogs" as any)
            .select("id, project_id, heading, cover_image_url")
            .in("id", blogIds);

          const blogMap = new Map((blogs || []).map((b: any) => [b.id, b]));
          data = promos.map((p: any) => {
            const b = blogMap.get(p.blog_id);
            return {
              id: p.id,
              blogId: p.blog_id,
              projectId: b?.project_id || "",
              blogTitle: b?.heading || "Untitled",
              coverImageUrl: b?.cover_image_url || null,
              tags: [],
              status: p.status,
              createdAt: p.created_at,
            };
          });
          success = true;
        } else if (promos && promos.length === 0) {
          data = [];
          success = true;
        }
      }
      if (success) {
        setPromotions(data);
        lastFetchedUserIdRef.current = user.id;
      }
    } catch (err) {
      console.error("[usePromotions] Error fetching promotions:", err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const submitPromotion = async (projectId: string): Promise<Promotion | null> => {
    try {
      let result: Promotion | null = null;
      try {
        result = await apiClient.post<Promotion>('/api/promotions', { projectId, tags: [] });
      } catch (backendErr) {
        console.warn("[usePromotions] Backend submit failed, submitting to Supabase directly:", backendErr);
        if (!user) throw backendErr;

        let { data: blog } = await supabase
          .from("blogs" as any)
          .select("id, heading, cover_image_url")
          .eq("project_id", projectId)
          .maybeSingle();

        if (!blog) {
          const { data: proj } = await supabase
            .from("projects" as any)
            .select("title, introduction, description")
            .eq("id", projectId)
            .single();

          const { data: newBlog } = await supabase
            .from("blogs" as any)
            .insert({
              project_id: projectId,
              heading: proj?.title || "Untitled",
              introduction: proj?.introduction,
              content: proj?.description
            })
            .select()
            .single();
          blog = newBlog;
        }

        if (blog) {
          const { data: existingPromo } = await supabase
            .from("blog_promotions" as any)
            .select("*")
            .eq("blog_id", blog.id)
            .maybeSingle();

          let promoData: any;
          if (existingPromo) {
            const { data: updated } = await supabase
              .from("blog_promotions" as any)
              .update({ status: "ACTIVE", updated_at: new Date().toISOString() })
              .eq("id", existingPromo.id)
              .select()
              .single();
            promoData = updated;
          } else {
            const { data: inserted } = await supabase
              .from("blog_promotions" as any)
              .insert({
                blog_id: blog.id,
                user_id: user.id,
                status: "ACTIVE",
              })
              .select()
              .single();
            promoData = inserted;
          }

          if (promoData) {
            result = {
              id: promoData.id,
              blogId: promoData.blog_id,
              projectId: projectId,
              blogTitle: blog.heading || "Untitled",
              coverImageUrl: blog.cover_image_url || null,
              tags: [],
              status: "ACTIVE",
              createdAt: promoData.created_at || new Date().toISOString(),
            };
          }
        }
      }

      if (result) {
        setPromotions(prev => {
          const exists = prev.some(p => p.id === result!.id || p.projectId === projectId);
          if (exists) {
            return prev.map(p => (p.id === result!.id || p.projectId === projectId) ? result! : p);
          }
          return [result!, ...prev];
        });
      }
      await fetchPromotions(true);
      return result;
    } catch (err) {
      console.error("[usePromotions] Error submitting promotion:", err);
      throw err;
    }
  };

  const removePromotion = async (promotionId: string): Promise<boolean> => {
    try {
      console.log(`[usePromotions] Attempting to remove promotion with ID: ${promotionId}`);
      let removeSuccess = false;
      try {
        await apiClient.delete(`/api/promotions/${promotionId}`);
        removeSuccess = true;
      } catch (backendErr) {
        console.warn("[usePromotions] Backend remove failed, updating Supabase directly:", backendErr);
        const { error } = await supabase
          .from("blog_promotions" as any)
          .update({ status: "REMOVED", updated_at: new Date().toISOString() })
          .eq("id", promotionId);
        if (!error) {
          removeSuccess = true;
        } else {
          console.error("[usePromotions] Direct Supabase update status=REMOVED failed:", error);
        }
      }

      if (removeSuccess) {
        setPromotions(prev => prev.filter(p => p.id !== promotionId));
        await fetchPromotions(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error("[usePromotions] Error removing promotion:", err);
      return false;
    }
  };

  return {
    promotions,
    loading,
    submitPromotion,
    removePromotion,
    refetch: fetchPromotions,
  };
};

/**
 * Hook to fetch similar blogs for "More Like This" section (public, no auth needed).
 */
export const useSimilarBlogs = (projectId: string | undefined) => {
  const [similarBlogs, setSimilarBlogs] = useState<SimilarBlog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const fetchSimilar = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get<SimilarBlog[]>(
          `/api/public/promotions/similar/${projectId}?limit=6`,
          { skipAuth: true }
        );
        setSimilarBlogs(data);
      } catch (err) {
        console.error("[useSimilarBlogs] Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilar();
  }, [projectId]);

  return { similarBlogs, loading };
};
