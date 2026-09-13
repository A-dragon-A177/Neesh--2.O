import { useState } from "react";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import apiClient from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

export interface CustomField {
  id: string;
  type: string;
  value?: string;
  order?: number;
  // Feedback form fields - allow any additional properties
  title?: string;
  description?: string;
  fields?: any[];
  [key: string]: any;
}

export interface InterestTag {
  id: string;
  label: string;
  priority: number;
  color?: string;
}

export interface Blog {
  id: string;
  project_id: string;
  heading: string | null;
  cover_image_url: string | null;
  introduction: string | null;
  content: string | null;
  custom_fields: CustomField[];
  interest_tags?: InterestTag[];
  chatbot_name?: string | null;
  welcome_message?: string | null;
  primary_color?: string | null;
  botAvatarUrl?: string | null;
  bot_avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateBlogInput {
  heading?: string;
  cover_image_url?: string;
  introduction?: string;
  content?: string;
  custom_fields?: CustomField[];
  interest_tags?: InterestTag[];
}

// Backend DTO matches
interface BackendBlogContent {
  heading: string;
  coverImageUrl: string;
  introduction: string;
  content: string;
  customFields: CustomField[];
  interestTags?: InterestTag[];
  chatbotName?: string;
  welcomeMessage?: string;
  primaryColor?: string;
  botAvatarUrl?: string;
}

export const useBlogs = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transformBlog = (projectId: string, backendData: BackendBlogContent): Blog => {
    return {
      id: projectId, // Using project ID as proxy since simplified DTO doesn't return blog ID
      project_id: projectId,
      heading: backendData.heading,
      cover_image_url: backendData.coverImageUrl,
      introduction: backendData.introduction,
      content: backendData.content,
      custom_fields: backendData.customFields || [],
      interest_tags: backendData.interestTags || [],
      chatbot_name: backendData.chatbotName || null,
      welcome_message: backendData.welcomeMessage || null,
      primary_color: backendData.primaryColor || null,
      bot_avatar_url: backendData.botAvatarUrl || null,
      created_at: new Date().toISOString(), // Mocked
      updated_at: new Date().toISOString(), // Mocked
    };
  };

  const transformInput = (input: UpdateBlogInput): BackendBlogContent => {
    return {
      heading: input.heading || "",
      coverImageUrl: input.cover_image_url || "",
      introduction: input.introduction || "",
      content: input.content || "",
      customFields: input.custom_fields || [],
      interestTags: input.interest_tags || [],
    };
  };

  const getBlog = async (projectId: string): Promise<Blog | null> => {
    try {
      setLoading(true);
      setError(null);

      console.log(`[useBlogs] Fetching blog for project ${projectId}`);
      try {
        const backendData = await apiClient.get<BackendBlogContent>(`/api/projects/${projectId}/blog`);
        if (backendData && (backendData.heading || backendData.customFields?.length > 0 || backendData.introduction)) {
          console.log("[useBlogs] Received blog data from backend:", backendData);
          return transformBlog(projectId, backendData);
        }
      } catch (backendErr) {
        console.warn("[useBlogs] Backend getBlog error, attempting Supabase fallback:", backendErr);
      }

      // Supabase direct fallback
      const { data: supaBlog } = await supabase
        .from("blogs" as any)
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (supaBlog) {
        let customFields = [];
        if (supaBlog.custom_fields) {
          try {
            customFields = typeof supaBlog.custom_fields === "string" ? JSON.parse(supaBlog.custom_fields) : supaBlog.custom_fields;
          } catch (e) {
            customFields = [];
          }
        }
        let interestTags = [];
        if (supaBlog.interest_tags) {
          try {
            interestTags = typeof supaBlog.interest_tags === "string" ? JSON.parse(supaBlog.interest_tags) : supaBlog.interest_tags;
          } catch (e) {
            interestTags = [];
          }
        }
        return {
          id: supaBlog.id || projectId,
          project_id: projectId,
          heading: supaBlog.heading,
          cover_image_url: supaBlog.cover_image_url,
          introduction: supaBlog.introduction,
          content: supaBlog.content,
          custom_fields: Array.isArray(customFields) ? customFields : [],
          interest_tags: Array.isArray(interestTags) ? interestTags : [],
          chatbot_name: supaBlog.chatbot_name || null,
          welcome_message: supaBlog.welcome_message || null,
          primary_color: supaBlog.primary_color || null,
          bot_avatar_url: supaBlog.bot_avatar_url || null,
          created_at: supaBlog.created_at || new Date().toISOString(),
          updated_at: supaBlog.updated_at || new Date().toISOString(),
        };
      }

      return null;
    } catch (err) {
      console.warn("[useBlogs] Blog likely not found or error:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const upsertBlog = async (projectId: string, input: UpdateBlogInput): Promise<Blog | null> => {
    if (!user) {
      toast.error("You must be logged in to update a blog");
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`[useBlogs] Saving blog for project ${projectId}`);
      const backendInput = transformInput(input);

      try {
        const backendData = await apiClient.put<BackendBlogContent>(`/api/projects/${projectId}/blog`, backendInput);
        console.log("[useBlogs] Blog saved successfully via backend:", backendData);
        return transformBlog(projectId, backendData);
      } catch (backendErr) {
        console.warn("[useBlogs] Backend save failed, saving to Supabase directly:", backendErr);
        const { data: existing } = await supabase
          .from("blogs" as any)
          .select("id")
          .eq("project_id", projectId)
          .maybeSingle();

        const blogData: any = {
          project_id: projectId,
          heading: input.heading || "",
          cover_image_url: input.cover_image_url || "",
          introduction: input.introduction || "",
          content: input.content || "",
          custom_fields: JSON.stringify(input.custom_fields || []),
          interest_tags: JSON.stringify(input.interest_tags || []),
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          await supabase.from("blogs" as any).update(blogData).eq("project_id", projectId);
        } else {
          await supabase.from("blogs" as any).insert({ ...blogData, id: crypto.randomUUID(), created_at: new Date().toISOString() });
        }

        return {
          id: existing?.id || projectId,
          project_id: projectId,
          heading: input.heading || "",
          cover_image_url: input.cover_image_url || "",
          introduction: input.introduction || "",
          content: input.content || "",
          custom_fields: input.custom_fields || [],
          interest_tags: input.interest_tags || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save blog";
      setError(message);
      toast.error(message);
      console.error("[useBlogs] Error saving blog:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getPublicBlog = async (projectId: string): Promise<Blog | null> => {
    try {
      console.log(`[useBlogs] Fetching public blog for ${projectId}`);
      try {
        const backendData = await apiClient.get<BackendBlogContent>(`/api/public/projects/${projectId}/blog`, { skipAuth: true });
        if (backendData && (backendData.heading || backendData.customFields?.length > 0)) {
          return transformBlog(projectId, backendData);
        }
      } catch (backendErr) {
        console.warn("[useBlogs] Backend public blog failed, querying Supabase directly:", backendErr);
      }

      const { data: supaBlog } = await supabase
        .from("blogs" as any)
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (supaBlog) {
        let customFields = [];
        if (supaBlog.custom_fields) {
          try {
            customFields = typeof supaBlog.custom_fields === "string" ? JSON.parse(supaBlog.custom_fields) : supaBlog.custom_fields;
          } catch (e) {
            customFields = [];
          }
        }
        let interestTags = [];
        if (supaBlog.interest_tags) {
          try {
            interestTags = typeof supaBlog.interest_tags === "string" ? JSON.parse(supaBlog.interest_tags) : supaBlog.interest_tags;
          } catch (e) {
            interestTags = [];
          }
        }
        return {
          id: supaBlog.id || projectId,
          project_id: projectId,
          heading: supaBlog.heading,
          cover_image_url: supaBlog.cover_image_url,
          introduction: supaBlog.introduction,
          content: supaBlog.content,
          custom_fields: Array.isArray(customFields) ? customFields : [],
          interest_tags: Array.isArray(interestTags) ? interestTags : [],
          chatbot_name: supaBlog.chatbot_name || null,
          welcome_message: supaBlog.welcome_message || null,
          primary_color: supaBlog.primary_color || null,
          bot_avatar_url: supaBlog.bot_avatar_url || null,
          created_at: supaBlog.created_at || new Date().toISOString(),
          updated_at: supaBlog.updated_at || new Date().toISOString(),
        };
      }
      return null;
    } catch (err) {
      console.error("[useBlogs] Error fetching public blog:", err);
      return null;
    }
  };

  const getPublicBlogBySlug = async (slug: string): Promise<Blog | null> => {
    try {
      console.log(`[useBlogs] Fetching public blog by slug: ${slug}`);
      try {
        const backendData = await apiClient.get<BackendBlogContent>(`/api/public/projects/blog/${slug}`, { skipAuth: true });
        if (backendData && (backendData.heading || backendData.customFields?.length > 0)) {
          const projectId = extractProjectIdFromSlug(slug);
          if (projectId) {
            return transformBlog(projectId, backendData);
          }
        }
      } catch (backendErr) {
        console.warn("[useBlogs] Backend public blog by slug failed, querying Supabase directly:", backendErr);
      }

      const projectId = extractProjectIdFromSlug(slug);
      if (projectId) {
        return getPublicBlog(projectId);
      }

      const { data: proj } = await supabase
        .from("projects" as any)
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (proj?.id) {
        return getPublicBlog(proj.id);
      }

      return null;
    } catch (err) {
      console.error("[useBlogs] Error fetching public blog by slug:", err);
      return null;
    }
  };

  const extractProjectIdFromSlug = (slug: string): string | null => {
    try {
      // Expected format: "some-title-uuid"
      // UUID format: 8-4-4-4-12 hex characters
      const uuidPattern = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
      const match = slug.match(uuidPattern);

      if (match && match[1]) {
        return match[1];
      }
      return null;
    } catch (e) {
      console.error("Failed to extract UUID from slug:", slug, e);
      return null;
    }
  };

  return {
    loading,
    error,
    getBlog,
    upsertBlog,
    getPublicBlog,
    getPublicBlogBySlug,
  };
};
