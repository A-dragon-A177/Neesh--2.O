import { useParams, Link } from "react-router-dom";
import { getSpotlightTitle } from "@/lib/spotlightTitles";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Image, Share2, Clock, Send, MessageCircle, Copy, Check, Link2, Loader2, Sparkles, Volume2, VolumeX, ArrowRight, Clapperboard, Play, X, Flame, Star, Upload, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { NeeshLogo } from "@/components/NeeshLogo";
import ReactMarkdown from 'react-markdown';
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import defaultChatbotAvatar from "@/assets/chatbot-avatar.png";
import { toast } from "@/hooks/use-toast";
import { generateShareableUrl } from "@/lib/slugify";
import { useBlogs, type Blog, type CustomField } from "@/hooks/useBlogs";
import { useProjects } from "@/hooks/useProjects";
import { useCoverImage } from "@/hooks/useCoverImage";
import { supabase } from "@/integrations/supabase/client";
import { usePublicFAQs } from "@/hooks/useFAQs";
import CommentSection from "@/components/project/CommentSection";
import { useQuestions } from "@/hooks/useQuestions";
import apiClient from "@/lib/api";
import MoreLikeThis from "@/components/project/MoreLikeThis";

import BlogMetaTags from "@/components/BlogMetaTags";
import { useAuth } from "@/hooks/useAuth";
import neeshLogo from "@/assets/neesh-logo.png";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface FeedbackFormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
}

interface Section {
  id: string;
  title: string;
  content: string;
  type: string;
  // For feedback sections
  feedbackTitle?: string;
  feedbackDescription?: string;
  feedbackFields?: FeedbackFormField[];
}

interface BlogData {
  title: string;
  coverImage?: string;
  sections: Section[];
  elevatorPitchUrl?: string | null;
  elevatorPitchThumbnail?: string | null;
  elevatorPitchDuration?: number | null;
  chatbot_name?: string;
  bot_avatar_url?: string;
  welcome_message?: string;
  earlyAccessPrice?: number | null;
  interestTags?: Array<{ id: string; label: string; priority: number; color?: string }>;
}

interface ChatMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: Date;
}

interface BlogPreviewProps {
  publicId?: string;
  defaultView?: "pitch" | "blog";
}

const BlogPreview = ({ publicId, defaultView }: BlogPreviewProps) => {
  const { id: paramId } = useParams();
  const id = publicId || paramId;
  const { getPublicBlog } = useBlogs();
  const { user, loading: authLoading, signIn, signInWithGoogle, signInWithGithub } = useAuth();
  const [showSignInGate, setShowSignInGate] = useState(false);

  // Inline Email & Password Sign-In State for Spotlight Modal
  const [inlineEmail, setInlineEmail] = useState("");
  const [inlinePassword, setInlinePassword] = useState("");
  const [showInlinePassword, setShowInlinePassword] = useState(false);
  const [inlineSubmitting, setInlineSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Auto-close sign-in modal if user becomes authenticated
  useEffect(() => {
    if (user) {
      setShowSignInGate(false);
      setInlineError(null);
    }
  }, [user]);

  const handleInlinePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineEmail.trim() || !inlinePassword.trim()) {
      setInlineError("Please enter both email and password.");
      return;
    }
    try {
      setInlineSubmitting(true);
      setInlineError(null);
      const { data, error } = await signIn(inlineEmail.trim(), inlinePassword.trim());
      if (error) {
        setInlineError(error.message || "Invalid email or password.");
      } else {
        toast({
          title: "Signed In Successfully! 🎉",
          description: `Welcome, ${data?.user?.user_metadata?.full_name || data?.user?.email || "User"}! You can now interact and submit feedback.`,
        });
        setShowSignInGate(false);
        setInlineEmail("");
        setInlinePassword("");
      }
    } catch (err: any) {
      setInlineError(err?.message || "Sign-in failed. Please check your credentials.");
    } finally {
      setInlineSubmitting(false);
    }
  };

  const handleSignIn = async (provider: 'google' | 'github') => {
    try {
      const currentUrl = window.location.href.split('#')[0];
      try {
        sessionStorage.setItem('post_login_redirect', currentUrl);
      } catch {}
      if (provider === 'google') {
        await signInWithGoogle(currentUrl);
      } else {
        await signInWithGithub(currentUrl);
      }
    } catch (e) {
      console.error(e);
    }
  };
  const { getProject } = useProjects();
  const { coverImage } = useCoverImage(id);
  const { faqs, loading: faqsLoading } = usePublicFAQs(id);
  const { reportQuestion } = useQuestions(id);

  const [blogData, setBlogData] = useState<BlogData | null>(null);
  const [activeView, setActiveView] = useState<"pitch" | "blog">("blog");
  const [pitchMuted, setPitchMuted] = useState(false);
  const [pitchPlaying, setPitchPlaying] = useState(true);
  const touchStartRef = useRef<number | null>(null);

  // Chatbot settings derived from blogData
  const botName = blogData?.chatbot_name || 'Health Blog Assistant';
  const chatbotAvatar = blogData?.bot_avatar_url || defaultChatbotAvatar;
  const initialWelcomeMessage = blogData?.welcome_message || "Hello! 👋 I'm here to help answer any questions you have about this blog post. Feel free to ask me anything!";
  const [chatPopupOpen, setChatPopupOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadStartTime] = useState(() => Date.now());
  const [slowLoad, setSlowLoad] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [readingProgress, setReadingProgress] = useState(0);
  const [coverImageBroken, setCoverImageBroken] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Re-initialize welcome message when blogData changes
  useEffect(() => {
    setChatMessages([{
      id: "1",
      role: "bot",
      content: initialWelcomeMessage,
      timestamp: new Date(),
    }]);
  }, [initialWelcomeMessage]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [feedbackValues, setFeedbackValues] = useState<Record<string, any>>({});

  // Auto-populate logged-in user email and name into the feedback form fields
  useEffect(() => {
    if (user) {
      const userEmail = user.email || '';
      const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '';
      setFeedbackValues(prev => {
        const next = { ...prev };
        if (!next['__email__']) next['__email__'] = userEmail;
        if (!next['__name__']) next['__name__'] = userName;

        if (blogData?.sections) {
          const feedbackSection = blogData.sections.find(s => s.type === "feedback");
          if (feedbackSection?.feedbackFields) {
            feedbackSection.feedbackFields.forEach(f => {
              const labelLower = (f.label || "").toLowerCase();
              if ((f.id === "1" || labelLower.includes("name")) && !next[f.id]) {
                next[f.id] = userName;
              }
              if ((f.id === "2" || f.type === "email" || labelLower.includes("email")) && !next[f.id]) {
                next[f.id] = userEmail;
              }
            });
          }
        }
        return next;
      });
    }
  }, [user, blogData?.sections]);

  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<{ id: string; label: string; priority: number } | null>(null);
  const [otherInterestText, setOtherInterestText] = useState("");
  const [isSubmittingInterest, setIsSubmittingInterest] = useState(false);
  const [hasSubmittedInterest, setHasSubmittedInterest] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [isUpdateSubmission, setIsUpdateSubmission] = useState(false);
  const [neeshCount, setNeeshCount] = useState<number>(0);

  const fetchNeeshCount = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiClient.get<{ count: number }>(`/api/public/projects/${id}/interest-count`, { skipAuth: true });
      if (res && typeof res.count === "number") {
        setNeeshCount(res.count);
      }
    } catch (e) {
      console.warn("Error fetching interest count:", e);
    }
  }, [id]);

  useEffect(() => {
    fetchNeeshCount();
  }, [fetchNeeshCount]);

  // Check if logged-in user has already submitted interest
  useEffect(() => {
    if (!id || !user?.email) return;
    apiClient.get<{ alreadySubmitted: boolean; tagLabel: string | null }>(
      `/api/public/projects/${id}/check-interest?email=${encodeURIComponent(user.email)}`,
      { skipAuth: true }
    ).then(res => {
      if (res?.alreadySubmitted) {
        setHasSubmittedInterest(true);
        if (res.tagLabel && blogData?.interestTags) {
          const match = blogData.interestTags.find(t => t.label === res.tagLabel);
          if (match) {
            setSelectedTag(match);
          }
        }
      }
    }).catch(() => {});
  }, [id, user?.email, blogData?.interestTags]);

  const handleInterestSubmit = async () => {
    if (!user) {
      setShowSignInGate(true);
      return;
    }
    if (!selectedTag && !otherInterestText.trim()) {
      toast({
        title: "Selection required",
        description: "Please select an interest option or specify custom details.",
        variant: "destructive",
      });
      return;
    }

    const wasAlreadySubmitted = hasSubmittedInterest;

    try {
      setIsSubmittingInterest(true);
      const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User";
      const userEmail = user.email || "";

      const res = await apiClient.post<{ alreadySubmitted?: boolean }>(`/api/public/projects/${id}/interest`, {
        name: displayName,
        email: userEmail,
        tagId: selectedTag?.id || "other",
        tagLabel: selectedTag ? selectedTag.label : "Other",
        tagPriority: selectedTag ? selectedTag.priority : 99,
        otherText: otherInterestText.trim() || undefined,
      }, { skipAuth: true });

      const isUpdate = Boolean(res?.alreadySubmitted || wasAlreadySubmitted);
      setIsUpdateSubmission(isUpdate);
      setHasSubmittedInterest(true);
      setJustSubmitted(true);
      fetchNeeshCount();
      toast({
        title: isUpdate ? "Interest Updated! ✅" : "Interest Submitted! 🎉",
        description: isUpdate 
          ? "Your interest tag selection has been updated." 
          : "Thank you for supporting this startup! The founder will see your interest in their dashboard.",
      });
    } catch (err) {
      console.error("Error submitting interest:", err);
      toast({
        title: "Submission failed",
        description: "Could not record interest. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingInterest(false);
    }
  };
  const [branding, setBranding] = useState<{
    subscriptionPlan: string;
    customLogoUrl: string | null;
    customBrandingText: string | null;
    showNeeshBranding: boolean;
  } | null>(null);

  // Generate a stable session ID once per page load for grouping anonymous chat questions
  const sessionIdRef = useRef<string>(
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15)
  );

  const updateFeedbackValue = useCallback((fieldId: string, value: any) => {
    if (authLoading) return;
    if (!user) {
      setShowSignInGate(true);
      return;
    }
    setFeedbackValues(prev => ({ ...prev, [fieldId]: value }));
  }, [user, authLoading]);

  const handleFeedbackSubmit = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setShowSignInGate(true);
      return;
    }
    if (!id || submittingFeedback) return;

    // Find feedback section fields
    const feedbackSection = blogData?.sections.find(s => s.type === "feedback");
    const fields = feedbackSection?.feedbackFields || [];

    const getVal = (f?: FeedbackFormField) => {
      if (!f) return "";
      return feedbackValues[f.id] !== undefined ? String(feedbackValues[f.id]).trim() : "";
    };

    const nameField = fields.find(f => f.id === "1" || (f.label || "").toLowerCase().includes("name"));
    const emailField = fields.find(f => f.id === "2" || f.type === "email" || (f.label || "").toLowerCase().includes("email"));
    const occupationField = fields.find(f => f.id === "3" || f.type === "occupation" || (f.label || "").toLowerCase().includes("occupation") || (f.label || "").toLowerCase().includes("role"));

    const name = (getVal(nameField) || feedbackValues['__name__'] || user.user_metadata?.full_name || user.user_metadata?.name || '').trim();
    const email = (getVal(emailField) || feedbackValues['__email__'] || user.email || '').trim();
    const occupation = (getVal(occupationField) || feedbackValues['__occupation__'] || '').trim();

    if (!name) {
      toast({ title: "Name Required", description: "Please fill in your name before submitting feedback.", variant: "destructive" });
      return;
    }

    if (!email) {
      toast({ title: "Email Required", description: "Please fill in your email address before submitting feedback.", variant: "destructive" });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    // Check all required fields from form builder
    for (const field of fields) {
      if (field.required) {
        const val = feedbackValues[field.id];
        const isFilled = val !== undefined && val !== null && val !== "" && (!Array.isArray(val) || val.length > 0);
        if (!isFilled) {
          toast({
            title: "Required Field Missing",
            description: `Please answer "${field.label}" before submitting.`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Build feedback text with readable question labels (excluding identity fields)
    const feedbackParts: string[] = [];
    for (const field of fields) {
      if (
        field.id === "1" ||
        field.id === "2" ||
        field.id === "3" ||
        field.type === "email" ||
        field.type === "occupation" ||
        (field.label || "").toLowerCase().includes("name") ||
        (field.label || "").toLowerCase().includes("email") ||
        ((field.label || "").toLowerCase().includes("occupation") && field.id !== "rating")
      ) {
        continue;
      }

      const val = feedbackValues[field.id];
      if (val !== undefined && val !== null && val !== "") {
        let displayVal = "";
        if (typeof val === "boolean") {
          displayVal = val ? "Yes" : "No";
        } else if (Array.isArray(val)) {
          displayVal = val.join(", ");
        } else if (field.type === "rating" || field.type === "star_rating" || (field.label || "").toLowerCase().includes("rate")) {
          displayVal = `${val} Star${Number(val) > 1 ? "s" : ""}`;
        } else {
          displayVal = String(val);
        }
        feedbackParts.push(`${field.label}: ${displayVal}`);
      }
    }

    // Catch any loose feedback values not in defined fields (e.g. standalone ratings/comments)
    for (const [key, val] of Object.entries(feedbackValues)) {
      if (key.startsWith('__') || fields.some(f => f.id === key) || key === "1" || key === "2" || key === "3") continue;
      if (val !== undefined && val !== null && val !== "") {
        feedbackParts.push(`${key}: ${val}`);
      }
    }

    setSubmittingFeedback(true);
    try {
      await apiClient.post(`/api/public/projects/${id}/feedback`, {
        name,
        email,
        occupation: occupation || undefined,
        feedbackText: feedbackParts.join('\n') || 'Feedback submitted via blog spotlight',
        feedbackSource: 'Form',
      }, { skipAuth: true });

      toast({ title: "Thank you! 🎉", description: "Your feedback has been submitted successfully." });
      setFeedbackSubmitted(true);
      setTimeout(() => {
        setFeedbackSubmitted(false);
      }, 4000);
    } catch (err) {
      console.error('Feedback submission error:', err);
      toast({ title: "Submission failed", description: "Please try again later.", variant: "destructive" });
    } finally {
      setSubmittingFeedback(false);
    }
  }, [id, feedbackValues, submittingFeedback, user, authLoading, blogData?.sections]);

  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const commentSectionRef = useRef<HTMLDivElement>(null);

  // Show "taking longer than usual" after 5 seconds (Render cold start)
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setSlowLoad(true), 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  // Fetch blog data from the database — only depends on `id`, NOT `coverImage`
  // coverImage from localStorage is used as a fallback at render time, not as a trigger.
  useEffect(() => {
    const loadBlogData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // For public access (shared link), only fetch blog data via public endpoint
        // For owner preview, also fetch project data for additional context
        const blog = await getPublicBlog(id);

        const project = publicId 
          ? await apiClient.get<any>(`/api/public/projects/id/${id}`, { skipAuth: true }).catch(() => null)
          : await getProject(id).catch(() => null);
        const projectIndustry: string | null = project?.industry ?? null;

        if (blog || project) {
          // Build sections from blog data
          const sections: Section[] = [];

          if (blog?.introduction) {
            sections.push({
              id: "intro",
              title: "Introduction",
              content: blog.introduction,
              type: "text",
            });
          }

          if (blog?.content) {
            sections.push({
              id: "content",
              title: "Content",
              content: blog.content,
              type: "text",
            });
          }

          // Add custom fields as sections
          const FEEDBACK_TYPES = [
            "short_text", "long_text", "multiple_choice", "checkboxes", "dropdown",
            "linear_scale", "scale", "date", "time", "file_upload", "rating", "star_rating",
            "number", "email", "phone", "url", "toggle", "occupation", "feedback_field"
          ];
          const standaloneFeedbackFields: FeedbackFormField[] = [];
          let feedbackFormTitle = "Feedback Form";
          let feedbackFormDesc = "We'd love to hear your thoughts! Please fill out this form.";

          if (blog?.custom_fields && Array.isArray(blog.custom_fields)) {
            blog.custom_fields.forEach((field: any, idx: number) => {
              if (field.type === "feedback") {
                // Feedback form section
                feedbackFormTitle = field.title || feedbackFormTitle;
                feedbackFormDesc = field.description || feedbackFormDesc;
                sections.push({
                  id: field.id || `feedback-${idx}`,
                  title: field.title || "Feedback Form",
                  content: field.description || "",
                  type: "feedback",
                  feedbackTitle: field.title,
                  feedbackDescription: field.description,
                  feedbackFields: field.fields || [],
                });
              } else if (
                FEEDBACK_TYPES.includes(field.type) ||
                (field.label && field.type !== "image" && field.type !== "video" && field.type !== "text" && field.type !== "spotlight_section")
              ) {
                // Standalone feedback field
                standaloneFeedbackFields.push({
                  id: field.id || String(idx + 1),
                  type: field.type || "short_text",
                  label: field.label || field.title || `Question ${idx + 1}`,
                  placeholder: field.placeholder || "",
                  required: Boolean(field.required),
                  options: field.options,
                  scaleMin: field.scaleMin,
                  scaleMax: field.scaleMax,
                  scaleMinLabel: field.scaleMinLabel,
                  scaleMaxLabel: field.scaleMaxLabel,
                });
              } else if (
                field.type === "image" ||
                field.imageUrl ||
                (typeof field.value === "string" &&
                  (field.value.includes("/image/") ||
                    field.value.startsWith("data:image/") ||
                    field.value.match(/\.(webp|png|jpg|jpeg|gif|svg)(\?.*)?$/i)))
              ) {
                // Image section
                const imgUrl = field.imageUrl || field.value || "";
                sections.push({
                  id: field.id || `image-${idx}`,
                  title: field.sectionTitle || field.title || `Image ${field.order !== undefined ? field.order + 1 : idx + 1}`,
                  content: "",
                  type: "image",
                  imageUrl: imgUrl,
                });
              } else if (
                field.type === "video" ||
                field.videoUrl ||
                (typeof field.value === "string" &&
                  (field.value.includes("/video/") ||
                    field.value.startsWith("blob:") ||
                    field.value.startsWith("data:video/") ||
                    field.value.includes("/pitch-videos/") ||
                    field.value.match(/\.(mp4|webm|mov|ogg)(\?.*)?$/i)))
              ) {
                // Video section
                const vidUrl = field.videoUrl || field.value || "";
                sections.push({
                  id: field.id || `video-${idx}`,
                  title: field.sectionTitle || field.title || `Video ${field.order !== undefined ? field.order + 1 : idx + 1}`,
                  content: "",
                  type: "video",
                  videoUrl: vidUrl,
                });
              } else if (field.value) {
                // Content/text section — resolve industry-specific heading
                const resolvedTitle = field.type === "spotlight_section" && field.sectionTitle
                  ? getSpotlightTitle(field.sectionTitle, projectIndustry)
                  : field.sectionTitle || field.title || `Section ${field.order !== undefined ? field.order + 1 : idx + 1}`;
                sections.push({
                  id: field.id || `section-${idx}`,
                  title: resolvedTitle,
                  content: field.value,
                  type: field.type || "text",
                });
              }
            });
          }

          // If standalone feedback fields were gathered and no feedback section exists yet, create one!
          if (standaloneFeedbackFields.length > 0 && !sections.some(s => s.type === "feedback")) {
            sections.push({
              id: "feedback-form",
              title: feedbackFormTitle,
              content: feedbackFormDesc,
              type: "feedback",
              feedbackTitle: feedbackFormTitle,
              feedbackDescription: feedbackFormDesc,
              feedbackFields: standaloneFeedbackFields,
            });
          }




          // Use DB image if available and non-empty, otherwise try localStorage fallback
          const dbCoverImage = blog?.cover_image_url && blog.cover_image_url.length > 10 ? blog.cover_image_url : null;
          const finalCoverImage = dbCoverImage || coverImage || undefined;

          const pitchUrl = project?.elevatorPitchUrl || project?.elevator_pitch_url || null;
          const pitchThumbnail = project?.elevatorPitchThumbnail || project?.elevator_pitch_thumbnail || null;
          // Use ?? for duration since || would drop duration=0 (valid short video)
          const pitchDuration = project?.elevatorPitchDuration ?? project?.elevator_pitch_duration ?? null;

          setBlogData({
            title: blog?.heading || project?.title || "Untitled",
            coverImage: finalCoverImage,
            sections,
            elevatorPitchUrl: pitchUrl,
            elevatorPitchThumbnail: pitchThumbnail,
            elevatorPitchDuration: pitchDuration,
            earlyAccessPrice: project?.earlyAccessPrice ?? project?.early_access_price ?? null,
            interestTags: blog?.interest_tags && blog.interest_tags.length > 0 ? blog.interest_tags : [
              { id: "1", label: "Pilot Users", priority: 1, color: "#FFD700" },
              { id: "2", label: "Investment", priority: 2, color: "#C0C0C0" },
              { id: "3", label: "Crowdfunding", priority: 3, color: "#CD7F32" },
              { id: "4", label: "Join Team", priority: 4, color: "#94A3B8" },
            ],
          });

          if (defaultView) {
            setActiveView(defaultView);
          } else if (pitchUrl) {
            setActiveView("pitch");
          } else {
            setActiveView("blog");
          }
        }
      } catch (err) {
        console.error("Error loading blog data:", err);
      } finally {
        setLoading(false);
        setSlowLoad(false);
      }
    };

    loadBlogData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fetch branding info for the blog
  useEffect(() => {
    if (!id) return;
    const fetchBranding = async () => {
      try {
        const data = await apiClient.get<{
          subscriptionPlan: string;
          customLogoUrl: string | null;
          customBrandingText: string | null;
          showNeeshBranding: boolean;
        }>(`/api/public/blog-branding/${id}`, { skipAuth: true });
        setBranding(data);
      } catch (err) {
        console.error("[BlogPreview] Error fetching branding:", err);
        setBranding({ subscriptionPlan: "FREE", customLogoUrl: null, customBrandingText: null, showNeeshBranding: true });
      }
    };
    fetchBranding();
  }, [id]);

  // Scroll and reading progress effect - MUST be before any conditional returns
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);

      // Calculate reading progress
      if (contentRef.current) {
        const contentTop = contentRef.current.offsetTop;
        const contentHeight = contentRef.current.scrollHeight;
        const windowHeight = window.innerHeight;
        const scrolled = window.scrollY - contentTop + windowHeight;
        const progress = Math.min(100, Math.max(0, (scrolled / contentHeight) * 100));
        setReadingProgress(progress);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Intersection observer for section visibility
  useEffect(() => {
    if (!blogData) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionId = entry.target.getAttribute("data-section-id");
          if (sectionId) {
            setVisibleSections((prev) => {
              const newSet = new Set(prev);
              if (entry.isIntersecting) {
                newSet.add(sectionId);
                setActiveSection(sectionId);
              }
              return newSet;
            });
          }
        });
      },
      { threshold: 0.3, rootMargin: "-20% 0px -60% 0px" }
    );

    sectionRefs.current.forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [blogData]);



  // Scroll chat to bottom when new messages arrive, but only if user is near bottom
  useEffect(() => {
    if (!chatContainerRef.current) return;
    
    const container = chatContainerRef.current;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
    
    if (isAtBottom) {
      // Use scrollTo on the container instead of scrollIntoView on the element
      // to avoid jumping the whole page viewport
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [chatMessages, isTyping]);

  // Calculate reading time
  const readingTime = useMemo(() => {
    if (!blogData) return 0;
    const totalWords = blogData.sections.reduce((acc, section) => {
      return acc + (section.content?.split(/\s+/).length || 0) + (section.title?.split(/\s+/).length || 0);
    }, 0) + (blogData.title?.split(/\s+/).length || 0);
    return Math.max(1, Math.ceil(totalWords / 200));
  }, [blogData]);

  // FAQ chips for quick questions
  const defaultChips = [
    "Summarize this blog",
    "What's the main takeaway?",
    "Explain in simple terms",
    "Related topics?",
  ];

  const faqChips = useMemo(() => {
    if (faqs && faqs.length > 0) {
      return faqs.map(f => f.question);
    }
    return defaultChips;
  }, [faqs]);

  const shareableUrl = useMemo(() => {
    if (!blogData || !id) return "";
    return generateShareableUrl(id, blogData.title);
  }, [blogData, id]);

  // Render feedback form field based on type
  const renderFeedbackField = (field: FeedbackFormField) => {
    const value = feedbackValues[field.label] ?? '';
    switch (field.type) {
      case "short_text":
      case "email":
      case "phone":
      case "url":
      case "number":
        return (
          <Input
            type={field.type === "number" ? "number" : field.type === "email" ? "email" : "text"}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            className="w-full"
            value={value}
            onChange={(e) => updateFeedbackValue(field.label, field.type === "number" ? Number(e.target.value) : e.target.value)}
          />
        );
      case "long_text":
        return (
          <textarea
            placeholder={field.placeholder || "Enter your response..."}
            className="w-full min-h-[120px] px-3 py-2 border border-border rounded-lg bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            value={value}
            onChange={(e) => updateFeedbackValue(field.label, e.target.value)}
          />
        );
      case "rating":
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => updateFeedbackValue(field.label, star)}
                className={`w-10 h-10 rounded-lg border transition-colors text-lg ${value >= star
                  ? 'bg-primary/20 border-primary shadow-sm'
                  : 'border-border hover:bg-primary/10 hover:border-primary'
                  }`}
              >
                ⭐
              </button>
            ))}
          </div>
        );
      case "multiple_choice":
        return (
          <div className="space-y-2">
            {field.options?.map((option, idx) => (
              <label key={idx} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${value === option ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/30'
                }`}>
                <input type="radio" name={field.id} className="w-10 h-10" checked={value === option}
                  onChange={() => updateFeedbackValue(field.label, option)} />
                <span className="text-foreground">{option}</span>
              </label>
            ))}
          </div>
        );
      case "checkboxes": {
        const checkedValues: string[] = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {field.options?.map((option, idx) => (
              <label key={idx} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${checkedValues.includes(option) ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/30'
                }`}>
                <input type="checkbox" className="w-10 h-10" checked={checkedValues.includes(option)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...checkedValues, option]
                      : checkedValues.filter(v => v !== option);
                    updateFeedbackValue(field.label, newValues);
                  }} />
                <span className="text-foreground">{option}</span>
              </label>
            ))}
          </div>
        );
      }
      case "dropdown":
        return (
          <select className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            value={value}
            onChange={(e) => updateFeedbackValue(field.label, e.target.value)}>
            <option value="">Select an option</option>
            {field.options?.map((option, idx) => (
              <option key={idx} value={option}>{option}</option>
            ))}
          </select>
        );
      case "linear_scale":
        return (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{field.scaleMinLabel || field.scaleMin}</span>
            <div className="flex gap-2">
              {Array.from({ length: (field.scaleMax || 5) - (field.scaleMin || 1) + 1 }, (_, i) => (field.scaleMin || 1) + i).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => updateFeedbackValue(field.label, num)}
                  className={`w-10 h-10 rounded-lg border transition-colors font-medium ${value === num
                    ? 'bg-primary/20 border-primary shadow-sm'
                    : 'border-border hover:bg-primary/10 hover:border-primary'
                    }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">{field.scaleMaxLabel || field.scaleMax}</span>
          </div>
        );
      case "date":
        return <Input type="date" className="w-full" value={value} onChange={(e) => updateFeedbackValue(field.label, e.target.value)} />;
      case "time":
        return <Input type="time" className="w-full" value={value} onChange={(e) => updateFeedbackValue(field.label, e.target.value)} />;
      case "toggle":
        return (
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-12 h-12" checked={!!value}
              onChange={(e) => updateFeedbackValue(field.label, e.target.checked)} />
            <span className="text-foreground">{field.placeholder || "Toggle"}</span>
          </label>
        );
      case "occupation":
        return <Input placeholder={field.placeholder || "e.g. Developer, Designer, Student..."} className="w-full" value={value}
          onChange={(e) => updateFeedbackValue(field.label, e.target.value)} />;
      default:
        return <Input placeholder={field.placeholder} className="w-full" value={value}
          onChange={(e) => updateFeedbackValue(field.label, e.target.value)} />;
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Skeleton Hero */}
        <div className="relative h-[80vh] overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-background">
          <div className="absolute inset-0">
            <div className="absolute w-64 h-64 rounded-full bg-primary/10 blur-3xl animate-pulse" style={{ top: '10%', left: '20%' }} />
            <div className="absolute w-48 h-48 rounded-full bg-accent/15 blur-3xl animate-pulse" style={{ top: '40%', right: '15%', animationDelay: '1s' }} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="h-12 w-3/4 bg-muted/50 rounded-xl animate-pulse" />
              <div className="h-8 w-1/2 bg-muted/30 rounded-lg animate-pulse" style={{ animationDelay: '200ms' }} />
            </div>
          </div>
        </div>

        {/* Skeleton Content */}
        <div className="max-w-5xl mx-auto px-6 py-16 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border p-8 shadow-sm space-y-4" style={{ animationDelay: `${i * 150}ms` }}>
              <div className="h-4 w-full bg-muted/40 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-muted/30 rounded animate-pulse" style={{ animationDelay: '100ms' }} />
              <div className="h-4 w-4/6 bg-muted/20 rounded animate-pulse" style={{ animationDelay: '200ms' }} />
            </div>
          ))}
        </div>

        {/* Centered loading indicator */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-card/90 backdrop-blur-xl border border-border/50 shadow-lg">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              {slowLoad ? 'Almost there — waking up the servers...' : 'Loading blog...'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const handleSendMessage = async (message: string) => {
    if (authLoading) return;
    if (!user) {
      setShowSignInGate(true);
      return;
    }
    if (!message.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsTyping(true);

    try {
      // Call the backend API (same endpoint as the chatbot tester)
      const response = await apiClient.post<any>(`/api/public/projects/${id}/chat`, {
        query: message,
        userName: feedbackValues['__name__'] || user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : undefined),
        userEmail: feedbackValues['__email__'] || user?.email || undefined,
        sessionId: sessionIdRef.current,
      }, { skipAuth: true });

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: response?.answer || response?.response || response?.text || "Thank you for your question! Feel free to ask anything about this project.",
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: "I'm sorry, something went wrong. Please try again.",
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleShare = async () => {
    if (!shareableUrl) return;
    await navigator.clipboard.writeText(shareableUrl);
    setLinkCopied(true);
    toast({
      title: "Link copied!",
      description: "Shareable blog URL has been copied to clipboard.",
    });
    setTimeout(() => setLinkCopied(false), 2000);
  };


  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs.current.get(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Meta tags for social sharing */}
      <BlogMetaTags
        title={blogData?.title || "Untitled Blog"}
        description={blogData?.sections?.[0]?.content?.substring(0, 160) || "Read this blog on Neesh AI"}
        imageUrl={blogData?.coverImage || undefined}
        url={shareableUrl}
      />
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-1">
        <div
          className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-150 ease-out"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Floating Header */}
      <header className="fixed top-1 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to={publicId ? "/" : "/dashboard"}>
            <NeeshLogo size="sm" />
          </Link>

          <div className="flex items-center gap-3">
            {blogData && (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-sm text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{readingTime} min read</span>
                </div>

                {/* Shareable link with copy */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                  <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground max-w-[150px] truncate">
                    {shareableUrl.replace(window.location.origin, '')}
                  </span>
                  <button
                    onClick={handleShare}
                    className="p-1 hover:bg-muted rounded transition-colors"
                  >
                    {linkCopied ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full md:hidden"
                  onClick={handleShare}
                >
                  {linkCopied ? <Check className="w-10 h-10 text-green-500" /> : <Share2 className="w-10 h-10" />}
                </Button>
              </>
            )}
            {!publicId && (
              <Link to={`/project/${id}?tab=blog`}>
                <Button variant="outline" className="rounded-2xl gap-2">
                  <ChevronLeft className="w-10 h-10" />
                  <span className="hidden sm:inline">Back to Editor</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Floating Section Navigation */}
      {blogData && blogData.sections.length > 0 && (
        <nav className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-3">
          {blogData.sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className="group relative flex items-center justify-end"
              aria-label={`Go to ${section.title}`}
            >
              <span className="absolute right-6 px-2 py-1 rounded-lg bg-slate-900 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-50 pointer-events-none">
                {section.title || `Section ${index + 1}`}
              </span>
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${activeSection === section.id
                  ? "bg-accent scale-125 shadow-[0_0_12px_hsl(var(--accent))]"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
              />
            </button>
          ))}

          {/* Comment Section dot */}
          <button
            onClick={() => commentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className="group relative flex items-center justify-end"
            aria-label="Go to Comments"
          >
            <span className="absolute right-6 px-2 py-1 rounded-lg bg-slate-900 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-50 pointer-events-none">
              Comments
            </span>
            <div className="w-2.5 h-2.5 rounded-full transition-all duration-300 bg-muted-foreground/30 hover:bg-muted-foreground/50" />
          </button>


        </nav>
      )}

      {blogData ? (
        activeView === "pitch" ? (
          /* Fulscreen Elevator Pitch / Cover Page Landing View */
          <div className="fixed inset-0 z-40 bg-black flex items-center justify-center select-none">
            {blogData.elevatorPitchUrl ? (
              <video
                src={blogData.elevatorPitchUrl}
                poster={blogData.elevatorPitchThumbnail || undefined}
                muted={pitchMuted}
                autoPlay
                loop
                playsInline
                preload="metadata"
                onClick={() => {
                  setPitchPlaying(p => !p);
                  setPitchMuted(false);
                }}
                ref={el => {
                  if (el) {
                    try {
                      el.playbackRate = 1.0;
                      el.defaultPlaybackRate = 1.0;
                    } catch {}
                    if (pitchPlaying) el.play().catch(() => {});
                    else el.pause();
                  }
                }}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full">
                <img
                  src={blogData.coverImage || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000"}
                  alt={blogData.title}
                  className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/50 via-slate-900/90 to-teal-950/80 backdrop-blur-md" />
              </div>
            )}

            {/* Dark gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/35 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/55 pointer-events-none" />

            {/* Mute toggle (only if video exists) */}
            {blogData.elevatorPitchUrl && (
              <button
                onClick={() => setPitchMuted(!pitchMuted)}
                className="absolute top-6 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/10 text-white hover:bg-white/10 transition-colors z-50"
              >
                {pitchMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            )}

            {/* Content overlay */}
            <div className="absolute bottom-12 left-6 right-6 z-50 space-y-4 font-sans">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
                    {blogData.elevatorPitchUrl ? "🎬 Elevator Pitch" : "📖 Project Showcase"}
                  </span>
                  <button
                    onClick={() => {
                      if (!user) {
                        setShowSignInGate(true);
                        return;
                      }
                      setInterestModalOpen(true);
                    }}
                    className="px-3.5 py-1 rounded-full text-xs font-extrabold bg-amber-500/25 border border-amber-400/50 text-amber-200 flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:bg-amber-500/40 transition-all cursor-pointer"
                    title="Click to express interest / Neesh It"
                  >
                    <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                    <span>Neeshed It:</span>
                    <span className="text-white font-black">{neeshCount}</span>
                  </button>
                </div>
                <h1 className="text-white font-extrabold text-3xl md:text-5xl mt-3 leading-tight drop-shadow-md font-display">
                  {blogData.title}
                </h1>
              </div>

              {blogData.sections?.[0]?.content && (
                <p className="text-white/80 text-sm md:text-base max-w-xl leading-relaxed drop-shadow line-clamp-3 font-sans">
                  {blogData.sections[0].content}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  id="pitch-view-blog-btn"
                  onClick={() => {
                    setActiveView("blog");
                    setPitchPlaying(false);
                  }}
                  className="bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white font-bold px-8 py-6 rounded-2xl shadow-lg shadow-cyan-500/25 border border-cyan-400/30 flex items-center justify-center gap-2 group text-base font-display"
                >
                  View Full Spotlight & Details
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Full Blog View */
          <div
            className="touch-pan-y"
            onTouchStart={(e) => {
              const touch = e.touches[0];
              touchStartRef.current = touch.clientX;
            }}
            onTouchEnd={(e) => {
              if (!touchStartRef.current) return;
              const touchEnd = e.changedTouches[0].clientX;
              if (touchEnd - touchStartRef.current > 100 && blogData.elevatorPitchUrl) {
                setActiveView("pitch");
              }
              touchStartRef.current = null;
            }}
          >
            {/* Hero Section - Smoothly Blended Cover Image */}
            <div ref={heroRef} className={`relative overflow-hidden transition-all duration-300 ${blogData.coverImage && !coverImageBroken ? "min-h-[260px] max-h-[85vh] w-full flex items-center justify-center bg-gradient-to-b from-slate-100/70 via-background to-background dark:from-slate-900/60 dark:via-background dark:to-background py-4 sm:py-6" : "h-[180px] sm:h-[220px] md:h-[260px]"}`}>
              {blogData.coverImage && !coverImageBroken ? (
                <div className="relative w-full h-full flex justify-center items-center overflow-hidden">
                  {/* Subtle blurred ambient background matching cover image colors */}
                  <img
                    src={blogData.coverImage}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-35 scale-125 pointer-events-none"
                  />
                  {/* Top blend gradient */}
                  <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-background/80 via-background/30 to-transparent z-20 pointer-events-none" />

                  {/* Main Cover Image - full view uncropped with soft glow */}
                  <img
                    src={blogData.coverImage}
                    alt="Cover"
                    className="relative z-10 w-full h-auto max-h-[75vh] object-contain rounded-2xl shadow-xl mx-auto"
                    loading="lazy"
                    decoding="async"
                    onError={() => setCoverImageBroken(true)}
                  />

                  {/* Bottom blend gradient - seamlessly fades into the spotlight content */}
                  <div className="absolute bottom-0 left-0 right-0 h-32 sm:h-44 bg-gradient-to-t from-background via-background/70 to-transparent z-20 pointer-events-none" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-background overflow-hidden">
                  {/* Animated floating orbs */}
                  <div className="absolute inset-0">
                    <div
                      className="absolute w-64 h-64 rounded-full bg-primary/10 blur-3xl animate-float"
                      style={{ top: "10%", left: "20%", animationDelay: "0s" }}
                    />
                    <div
                      className="absolute w-48 h-48 rounded-full bg-accent/15 blur-3xl animate-float"
                      style={{ top: "40%", right: "15%", animationDelay: "2s" }}
                    />
                    <div
                      className="absolute w-56 h-56 rounded-full bg-primary/8 blur-3xl animate-float"
                      style={{ bottom: "20%", left: "30%", animationDelay: "4s" }}
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                </div>
              )}

              {/* Title Content - PRESERVED */}
              <div
                className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 md:p-12"
                style={{
                  transform: `translateY(${scrollY * 0.1}px)`,
                  opacity: Math.max(0, 1 - scrollY / 400),
                }}
              >
                <div className="max-w-5xl mx-auto">
                <h1 className="font-display text-2xl sm:text-4xl md:text-6xl font-bold text-foreground leading-tight drop-shadow-lg">
                  {blogData.title || "Untitled Blog"}
                </h1>
              </div>
            </div>

            {/* Scroll indicator */}
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-muted-foreground"
              style={{ opacity: Math.max(0, 1 - scrollY / 200) }}
            >
              <span className="text-[10px] uppercase tracking-widest">Scroll</span>
              <div className="w-px h-5 bg-gradient-to-b from-muted-foreground/50 to-transparent animate-pulse" />
            </div>
          </div>

          {/* Blog Content */}
          <main ref={contentRef} className="relative bg-background">
            <div className="max-w-5xl mx-auto px-6 py-16">
              {/* Sections with glassmorphism and animations */}
              <div className="space-y-4">
                {blogData.sections.map((section, index) => (
                  <section
                    key={section.id}
                    ref={(el) => {
                      if (el) sectionRefs.current.set(section.id, el);
                    }}
                    data-section-id={section.id}
                    className="relative transition-all duration-700 opacity-100 translate-y-0"
                    style={{ transitionDelay: `${index * 100}ms` }}
                  >
                    {/* Clean card styling - no glassmorphism per design system */}
                    <div className="relative bg-card border border-border p-8 shadow-sm overflow-hidden">
                      {/* Accent line */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />

                      {section.type === "feedback" ? (
                        // Render Feedback Form
                        <div className="pl-2 sm:pl-4 space-y-6">
                          <div>
                            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">
                              {section.feedbackTitle || section.title}
                            </h2>
                            {section.feedbackDescription && (
                              <p className="text-muted-foreground">{section.feedbackDescription}</p>
                            )}
                          </div>
                          <div className="space-y-6">
                            {/* If feedbackFields does NOT already include Name/Email/Role, show identity fields */}
                            {(!section.feedbackFields || section.feedbackFields.length === 0 || !section.feedbackFields.some(f => (f.label || "").toLowerCase().includes("name"))) && (
                              <div className="space-y-2">
                                <label className="block text-foreground font-medium text-sm md:text-base">
                                  Name <span className="text-destructive ml-1">*</span>
                                </label>
                                <Input
                                  placeholder="Your name"
                                  className="w-full bg-background"
                                  value={feedbackValues['__name__'] || ''}
                                  onChange={(e) => updateFeedbackValue('__name__', e.target.value)}
                                />
                              </div>
                            )}

                            {(!section.feedbackFields || section.feedbackFields.length === 0 || !section.feedbackFields.some(f => (f.label || "").toLowerCase().includes("email"))) && (
                              <div className="space-y-2">
                                <label className="block text-foreground font-medium text-sm md:text-base">
                                  Email <span className="text-destructive ml-1">*</span>
                                </label>
                                <Input
                                  type="email"
                                  placeholder="your@email.com"
                                  className="w-full bg-background"
                                  value={feedbackValues['__email__'] || ''}
                                  onChange={(e) => updateFeedbackValue('__email__', e.target.value)}
                                />
                              </div>
                            )}

                            {(!section.feedbackFields || section.feedbackFields.length === 0 || !section.feedbackFields.some(f => (f.label || "").toLowerCase().includes("occupation") || (f.label || "").toLowerCase().includes("role"))) && (
                              <div className="space-y-2">
                                <label className="block text-foreground font-medium text-sm md:text-base">
                                  Occupation / Role
                                </label>
                                <Input
                                  placeholder="e.g., Software Engineer, Investor, Marketer"
                                  className="w-full bg-background"
                                  value={feedbackValues['__occupation__'] || ''}
                                  onChange={(e) => updateFeedbackValue('__occupation__', e.target.value)}
                                />
                              </div>
                            )}

                            {/* Dynamic custom feedback fields - Full Interactive UI */}
                            {(section.feedbackFields || []).map((field) => {
                              const rawType = (field.type || "short_text").toLowerCase();
                              const label = (field.label || "").toLowerCase();
                              const val = feedbackValues[field.id] !== undefined ? feedbackValues[field.id] : "";

                              return (
                                <div key={field.id} className="space-y-2.5">
                                  <label className="block text-foreground font-semibold text-sm md:text-base">
                                    {field.label}
                                    {field.required && <span className="text-destructive ml-1">*</span>}
                                  </label>

                                  {/* 1. Star Rating */}
                                  {(rawType === "rating" || rawType === "star_rating" || label.includes("rate") || label.includes("experience")) ? (
                                    <div className="space-y-2 py-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {[1, 2, 3, 4, 5].map((star) => {
                                          const num = Number(val) || 0;
                                          return (
                                            <button
                                              key={star}
                                              type="button"
                                              onClick={() => updateFeedbackValue(field.id, String(star))}
                                              className="group p-1.5 rounded-xl hover:scale-125 transition-all cursor-pointer focus:outline-none"
                                              title={`${star} Star${star > 1 ? "s" : ""}`}
                                            >
                                              <Star
                                                className={`w-8 h-8 sm:w-9 sm:h-9 transition-colors ${
                                                  num >= star
                                                    ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                                                    : "text-muted-foreground/30 hover:text-amber-300"
                                                }`}
                                              />
                                            </button>
                                          );
                                        })}
                                        {Number(val) > 0 && (
                                          <span className="text-sm font-bold text-amber-500 ml-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                            {Number(val) === 5 ? "⭐⭐⭐⭐⭐ Excellent! (5/5)" :
                                             Number(val) === 4 ? "⭐⭐⭐⭐ Very Good (4/5)" :
                                             Number(val) === 3 ? "⭐⭐⭐ Good (3/5)" :
                                             Number(val) === 2 ? "⭐⭐ Fair (2/5)" : "⭐ Poor (1/5)"}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ) : (rawType === "linear_scale" || rawType === "scale") ? (
                                    /* 2. Linear Scale */
                                    <div className="space-y-2 py-1">
                                      <div className="flex justify-between text-xs text-muted-foreground font-medium px-0.5">
                                        <span>{field.scaleMinLabel || `1 (Lowest)`}</span>
                                        <span>{field.scaleMaxLabel || `5 (Highest)`}</span>
                                      </div>
                                      <div className="flex items-center gap-2 justify-between flex-wrap">
                                        {Array.from(
                                          { length: (field.scaleMax || 5) - (field.scaleMin || 1) + 1 },
                                          (_, i) => (field.scaleMin || 1) + i
                                        ).map((itemVal) => (
                                          <button
                                            key={itemVal}
                                            type="button"
                                            onClick={() => updateFeedbackValue(field.id, String(itemVal))}
                                            className={`min-w-[44px] h-11 px-3.5 rounded-xl font-bold transition-all border cursor-pointer ${
                                              val === String(itemVal)
                                                ? "bg-primary text-primary-foreground border-primary scale-105 shadow-md"
                                                : "bg-muted/40 hover:bg-muted border-border text-foreground"
                                            }`}
                                          >
                                            {itemVal}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (rawType === "long_text" || rawType === "textarea" || label.includes("comment") || label.includes("thought") || label.includes("feedback")) ? (
                                    /* 3. Textarea / Comments */
                                    <Textarea
                                      placeholder={field.placeholder || "Share your thoughts and feedback..."}
                                      rows={4}
                                      value={val}
                                      onChange={(e) => updateFeedbackValue(field.id, e.target.value)}
                                      className="w-full bg-background"
                                    />
                                  ) : (rawType === "multiple_choice" || rawType === "radio") ? (
                                    /* 4. Multiple Choice / Radio Cards */
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                      {(field.options || ["Option 1", "Option 2", "Option 3"]).map((opt, idx) => {
                                        const isSelected = val === opt;
                                        return (
                                          <button
                                            key={idx}
                                            type="button"
                                            onClick={() => updateFeedbackValue(field.id, opt)}
                                            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left text-sm font-medium transition-all cursor-pointer ${
                                              isSelected
                                                ? "border-primary bg-primary/10 text-foreground font-semibold shadow-sm ring-1 ring-primary/40"
                                                : "border-border/60 bg-background hover:bg-muted/40 text-foreground"
                                            }`}
                                          >
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                            </div>
                                            <span>{opt}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : (rawType === "checkboxes") ? (
                                    /* 5. Checkbox List */
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                      {(field.options || ["Option 1", "Option 2", "Option 3"]).map((opt, idx) => {
                                        const selectedArr = Array.isArray(val) ? val : val ? [val] : [];
                                        const isChecked = selectedArr.includes(opt);
                                        return (
                                          <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                              const updated = isChecked
                                                ? selectedArr.filter((item: string) => item !== opt)
                                                : [...selectedArr, opt];
                                              updateFeedbackValue(field.id, updated);
                                            }}
                                            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left text-sm font-medium transition-all cursor-pointer ${
                                              isChecked
                                                ? "border-primary bg-primary/10 text-foreground font-semibold shadow-sm ring-1 ring-primary/40"
                                                : "border-border/60 bg-background hover:bg-muted/40 text-foreground"
                                            }`}
                                          >
                                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${isChecked ? "border-primary bg-primary text-white" : "border-muted-foreground/40"}`}>
                                              {isChecked && <Check className="w-3 h-3 text-white stroke-[3]" />}
                                            </div>
                                            <span>{opt}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : (rawType === "select" || rawType === "dropdown") ? (
                                    /* 6. Select Dropdown */
                                    <Select value={val} onValueChange={(selected) => updateFeedbackValue(field.id, selected)}>
                                      <SelectTrigger className="w-full bg-background">
                                        <SelectValue placeholder={field.placeholder || "Select an option"} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(field.options || []).map((opt, idx) => (
                                          <SelectItem key={idx} value={opt}>
                                            {opt}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (rawType === "toggle" || rawType === "switch") ? (
                                    /* 7. Toggle Switch */
                                    <div className="flex items-center gap-3 pt-1">
                                      <Switch
                                        checked={!!val}
                                        onCheckedChange={(checked) => updateFeedbackValue(field.id, checked)}
                                      />
                                      <span className="text-sm text-muted-foreground">{val ? "Yes" : "No"}</span>
                                    </div>
                                  ) : (rawType === "email" || label.includes("email")) ? (
                                    /* 8. Email */
                                    <Input
                                      type="email"
                                      placeholder={field.placeholder || "your@email.com"}
                                      value={val}
                                      onChange={(e) => updateFeedbackValue(field.id, e.target.value)}
                                      className="w-full bg-background"
                                    />
                                  ) : (rawType === "date") ? (
                                    /* 9. Date */
                                    <Input
                                      type="date"
                                      value={val}
                                      onChange={(e) => updateFeedbackValue(field.id, e.target.value)}
                                      className="w-full bg-background"
                                    />
                                  ) : (rawType === "time") ? (
                                    /* 10. Time */
                                    <Input
                                      type="time"
                                      value={val}
                                      onChange={(e) => updateFeedbackValue(field.id, e.target.value)}
                                      className="w-full bg-background"
                                    />
                                  ) : (rawType === "number") ? (
                                    /* 11. Number */
                                    <Input
                                      type="number"
                                      placeholder={field.placeholder || "0"}
                                      value={val}
                                      onChange={(e) => updateFeedbackValue(field.id, e.target.value)}
                                      className="w-full bg-background"
                                    />
                                  ) : (
                                    /* 12. Standard Input (Text / Occupation / Short text) */
                                    <Input
                                      placeholder={field.placeholder || (label.includes("occupation") || label.includes("role") ? "e.g., Software Engineer, Investor, Marketer" : label.includes("name") ? "Your name" : "Your answer")}
                                      value={val}
                                      onChange={(e) => updateFeedbackValue(field.id, e.target.value)}
                                      className="w-full bg-background"
                                    />
                                  )}
                                </div>
                              );
                            })}

                            <Button
                              onClick={handleFeedbackSubmit}
                              disabled={submittingFeedback}
                              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-3.5 rounded-xl gap-2 mt-6 text-base shadow-md cursor-pointer"
                            >
                              {submittingFeedback ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                "Submit Feedback"
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : section.type === "image" || section.imageUrl ? (
                        // Image Section
                        <div>
                          {section.title && !section.title.startsWith("Image ") && (
                            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
                              {section.title}
                            </h2>
                          )}
                          <div className="mb-6 rounded-2xl overflow-hidden border border-border/50 shadow-md bg-slate-950/20 flex items-center justify-center p-2">
                            <img
                              src={section.imageUrl || section.content}
                              alt={section.title || "Section image"}
                              className="w-full h-auto max-h-[800px] object-contain rounded-xl mx-auto"
                              loading="lazy"
                            />
                          </div>
                          {section.content &&
                            section.content !== section.imageUrl &&
                            !section.content.startsWith("http://") &&
                            !section.content.startsWith("https://") &&
                            !section.content.startsWith("blob:") &&
                            !section.content.startsWith("data:") && (
                              <p className="text-foreground/90 text-lg leading-relaxed whitespace-pre-wrap">
                                {section.content}
                              </p>
                            )}
                        </div>
                      ) : section.type === "video" || section.videoUrl ? (
                        // Video Section
                        <div>
                          {section.title && !section.title.startsWith("Video ") && (
                            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
                              {section.title}
                            </h2>
                          )}
                          <div className="mb-6 rounded-2xl overflow-hidden border border-border/50 shadow-md bg-black flex items-center justify-center p-1">
                            <video
                              src={section.videoUrl || section.content}
                              controls
                              playsInline
                              preload="metadata"
                              className="w-full h-auto max-h-[600px] object-contain rounded-lg mx-auto"
                            />
                          </div>
                          {section.content &&
                            section.content !== section.videoUrl &&
                            !section.content.startsWith("http://") &&
                            !section.content.startsWith("https://") &&
                            !section.content.startsWith("blob:") &&
                            !section.content.startsWith("data:") && (
                              <p className="text-foreground/90 text-lg leading-relaxed whitespace-pre-wrap">
                                {section.content}
                              </p>
                            )}
                        </div>
                      ) : (section.title.toLowerCase().includes("rate") && (section.title.toLowerCase().includes("experience") || section.title.toLowerCase().includes("how"))) || section.type === "rating" ? (
                        <div className="space-y-4">
                          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">
                            {section.title}
                          </h2>
                          {section.content && <p className="text-muted-foreground">{section.content}</p>}
                          <div className="space-y-3 py-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {[1, 2, 3, 4, 5].map((star) => {
                                const val = Number(feedbackValues[section.id || 'rating']) || 0;
                                return (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => updateFeedbackValue(section.id || 'rating', String(star))}
                                    className="group p-1.5 rounded-xl hover:scale-125 transition-all cursor-pointer focus:outline-none"
                                    title={`${star} Star${star > 1 ? "s" : ""}`}
                                  >
                                    <Star
                                      className={`w-9 h-9 transition-colors ${
                                        val >= star
                                          ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                                          : "text-muted-foreground/30 hover:text-amber-300"
                                      }`}
                                    />
                                  </button>
                                );
                              })}
                              {Number(feedbackValues[section.id || 'rating']) > 0 && (
                                <span className="text-sm font-bold text-amber-500 ml-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                  {Number(feedbackValues[section.id || 'rating']) === 5 ? "⭐⭐⭐⭐⭐ Excellent! (5/5)" :
                                   Number(feedbackValues[section.id || 'rating']) === 4 ? "⭐⭐⭐⭐ Very Good (4/5)" :
                                   Number(feedbackValues[section.id || 'rating']) === 3 ? "⭐⭐⭐ Good (3/5)" :
                                   Number(feedbackValues[section.id || 'rating']) === 2 ? "⭐⭐ Fair (2/5)" : "⭐ Poor (1/5)"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (section.title.toLowerCase().includes("additional comments") || section.title.toLowerCase().includes("comments") || section.type === "long_text") ? (
                        <div className="space-y-3">
                          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">
                            {section.title}
                          </h2>
                          <Textarea
                            placeholder="Share your thoughts and feedback..."
                            rows={4}
                            value={feedbackValues[section.id || 'comments'] || ''}
                            onChange={(e) => updateFeedbackValue(section.id || 'comments', e.target.value)}
                            className="w-full bg-background"
                          />
                        </div>
                      ) : (
                        // Standard Text/Content Section
                        <div>
                          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
                            {section.title}
                          </h2>
                          <p className="text-foreground/90 text-lg leading-relaxed whitespace-pre-wrap">
                            {section.content}
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                ))}
              </div>

              {blogData.sections.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="text-lg">No sections added yet.</p>
                  <p className="text-sm mt-2">Go back to the editor to add content.</p>
                </div>
              )}
            </div>

            {/* Golden "I'm Interested" Button Alone */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-10 flex justify-center">
              <Button
                onClick={() => {
                  if (!user) {
                    setShowSignInGate(true);
                    return;
                  }
                  setJustSubmitted(false);
                  setInterestModalOpen(true);
                }}
                className="w-full sm:w-auto max-w-full h-14 sm:h-16 px-8 sm:px-12 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black shadow-[0_0_35px_rgba(245,158,11,0.5)] border-2 border-amber-300 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 inline-flex items-center justify-center gap-3 sm:gap-4 group cursor-pointer"
              >
                <span className="text-base sm:text-lg font-black tracking-tight">I'm Interested</span>
                <span className="text-xs sm:text-sm px-3.5 py-1.5 rounded-full bg-slate-950 text-amber-400 font-extrabold border border-amber-400/40 shadow-inner flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>{neeshCount} Neeshed</span>
                </span>
              </Button>
            </div>

            {/* Interest Tags Selection Modal */}
            <Dialog open={interestModalOpen} onOpenChange={(open) => {
              setInterestModalOpen(open);
              if (!open) {
                setJustSubmitted(false);
              }
            }}>
              <DialogContent className="sm:max-w-lg rounded-3xl p-6 md:p-8 bg-card border-amber-500/30">
                <DialogHeader className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 text-xl font-bold mx-auto mb-1">
                    ✨
                  </div>
                  <DialogTitle className="text-center text-xl md:text-2xl font-bold text-foreground">
                    How are you interested in this project?
                  </DialogTitle>
                  <DialogDescription className="text-center text-sm text-muted-foreground">
                    Select one of the founder's requested interest areas, or specify your own custom feedback.
                  </DialogDescription>
                </DialogHeader>

                {justSubmitted ? (
                  <div className="py-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto text-3xl">
                      {isUpdateSubmission ? "✅" : "🎉"}
                    </div>
                    <h4 className="text-lg font-bold text-foreground">
                      {isUpdateSubmission ? "Interest Choice Updated!" : "Interest Submitted!"}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {isUpdateSubmission 
                        ? "Your interest tag selection has been updated and saved to the founder's validated buyers dashboard." 
                        : "Your interest has been recorded and sent directly to the founder's validated buyers dashboard."}
                    </p>
                    <Button
                      onClick={() => {
                        setJustSubmitted(false);
                        setInterestModalOpen(false);
                      }}
                      className="bg-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-xl"
                    >
                      Done
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 py-2">
                    {hasSubmittedInterest && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs font-semibold text-center">
                        ✨ You have already expressed interest in this project.
                      </div>
                    )}

                    {/* Tags List */}
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {(blogData?.interestTags || []).map((tag, idx) => {
                        const isSelected = selectedTag?.id === tag.id;
                        const priority = idx + 1;
                        const isGold = priority === 1;
                        const isSilver = priority === 2 || priority === 3;

                        return (
                          <button
                            key={tag.id || idx}
                            type="button"
                            onClick={() => {
                              setSelectedTag(tag);
                              setOtherInterestText("");
                            }}
                            className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                              isSelected
                                ? "border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                                : "border-border/60 hover:border-amber-500/40 bg-muted/20"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  isGold
                                    ? "bg-amber-500 text-slate-950"
                                    : isSilver
                                    ? "bg-slate-400 text-slate-950"
                                    : "bg-amber-800 text-white"
                                }`}
                              >
                                #{priority}
                              </span>
                              <span className="font-semibold text-foreground text-sm">{tag.label}</span>
                            </div>
                            {isSelected && <Check className="w-5 h-5 text-amber-500 stroke-[3]" />}
                          </button>
                        );
                      })}

                      {/* "Other" Option */}
                      <button
                        type="button"
                        onClick={() => setSelectedTag(null)}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                          selectedTag === null
                            ? "border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                            : "border-border/60 hover:border-amber-500/40 bg-muted/20"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-muted-foreground/20 text-muted-foreground flex items-center justify-center text-xs font-bold">
                            ?
                          </span>
                          <span className="font-semibold text-foreground text-sm">Other (Specify below)</span>
                        </div>
                        {selectedTag === null && <Check className="w-5 h-5 text-amber-500 stroke-[3]" />}
                      </button>
                    </div>

                    {/* Other Text Box */}
                    {selectedTag === null && (
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-semibold text-foreground">
                          Describe how you would like to be interested:
                        </label>
                        <Input
                          value={otherInterestText}
                          onChange={(e) => setOtherInterestText(e.target.value)}
                          placeholder="e.g. Willing to offer mentorship, strategic partnership..."
                          className="bg-background"
                        />
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-3">
                      <Button
                        onClick={handleInterestSubmit}
                        disabled={isSubmittingInterest || (!selectedTag && !otherInterestText.trim())}
                        className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-bold text-base py-6 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                      >
                        {isSubmittingInterest ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : hasSubmittedInterest ? (
                          "Update Interest Choice"
                        ) : (
                          "Confirm & Submit Interest"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Comment Section */}
            <div ref={commentSectionRef}>
              {id && <CommentSection projectId={id} onRequireSignIn={() => setShowSignInGate(true)} user={user} />}
            </div>




            {/* Branding Footer */}
            <footer className="border-t border-border/30 mt-12 py-8">
              <div className="max-w-5xl mx-auto px-6 text-center">
                {branding?.showNeeshBranding !== false ? (
                  <div className="flex items-center justify-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                    <span className="text-xs text-muted-foreground">Powered by</span>
                    <NeeshLogo size="sm" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    {branding?.customLogoUrl && (
                      <img
                        src={branding.customLogoUrl}
                        alt="Brand logo"
                        className="h-6 w-auto object-contain"
                      />
                    )}
                    {branding?.customBrandingText && (
                      <span className="text-sm text-muted-foreground font-medium">
                        {branding.customBrandingText}
                      </span>
                    )}
                    {!branding?.customLogoUrl && !branding?.customBrandingText && (
                      <div className="flex items-center justify-center gap-2 opacity-60">
                        <span className="text-xs text-muted-foreground">Powered by</span>
                        <NeeshLogo size="sm" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </footer>
          </main>
        </div>
      )) : (
        <main className="pt-24 max-w-3xl mx-auto px-6 py-12">
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <Image className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-2">
              No Blog Content
            </h2>
            <p className="text-muted-foreground mb-6">
              {publicId ? "This blog has no content yet." : "Start editing your blog to see the preview here."}
            </p>
            {!publicId && (
              <Link to={`/project/${id}?tab=blog`}>
                <Button className="rounded-2xl">Go to Editor</Button>
              </Link>
            )}
          </div>
        </main>
      )}

      {/* Floating Chatbot FAB + Popup Chat Panel */}
      {blogData && (
        <>
          {/* Floating Chat Popup Panel */}
          {chatPopupOpen && (
            <div className="fixed bottom-24 right-6 z-[100] w-[380px] max-w-[calc(100vw-2rem)] animate-in slide-in-from-bottom-4 fade-in duration-300">
              <div className="relative bg-card/95 backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ height: '520px' }}>
                {/* Decorative glow */}
                <div className="absolute -top-16 -right-16 w-32 h-32 bg-accent/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

                {/* Header */}
                <div className="relative flex items-center gap-3 px-5 py-4 border-b border-border/30 shrink-0">
                  <div className="relative">
                    <div className="w-10 h-10 drop-shadow-[0_0_12px_hsl(var(--accent)/0.3)]">
                      <img src={chatbotAvatar} alt="AI Assistant" className="w-full h-full object-contain" />
                    </div>
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-[1.5px] border-card" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-1.5 truncate">
                      <MessageCircle className="w-4 h-4 text-accent shrink-0" />
                      {botName}
                    </h3>
                    <p className="text-xs text-muted-foreground">Ask me anything about this project</p>
                  </div>
                  <button
                    onClick={() => setChatPopupOpen(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
                    aria-label="Close chat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* FAQ Chips */}
                {faqs.length > 0 && (
                  <div className="relative flex flex-wrap gap-1.5 px-4 py-3 border-b border-border/20 shrink-0">
                    {faqs.slice(0, 4).map((faq) => (
                      <button
                        key={faq.id}
                        onClick={() => handleSendMessage(faq.question)}
                        className="px-3 py-1.5 rounded-full bg-muted/40 hover:bg-muted text-xs text-foreground border border-border/40 transition-all hover:scale-105"
                      >
                        {faq.question}
                      </button>
                    ))}
                  </div>
                )}

                {/* Chat Messages */}
                <div
                  ref={chatContainerRef}
                  className="relative flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
                >
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted/80 text-foreground border border-border/50 rounded-bl-sm shadow-sm"
                          }`}
                      >
                        {msg.role === "user" ? (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-left w-full break-words [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ol]:mb-2 [&>ul]:pl-5 [&>ol]:pl-5 [&>li]:mb-1 [&>ul>li]:list-disc [&>ol>li]:list-decimal leading-relaxed text-sm">
                            <ReactMarkdown>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-muted/80 rounded-xl rounded-bl-sm px-3.5 py-2.5">
                        <div className="flex gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="relative flex gap-2 px-4 py-3 border-t border-border/30 shrink-0">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onFocus={() => {
                      if (!user) setShowSignInGate(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(chatInput);
                      }
                    }}
                    placeholder="Type your question..."
                    className="flex-1 h-9 text-sm rounded-lg bg-muted/40 border-border/40 focus:border-accent"
                  />
                  <Button
                    onClick={() => handleSendMessage(chatInput)}
                    disabled={!chatInput.trim() || isTyping}
                    size="sm"
                    className="rounded-lg h-9 px-3 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* FAB Icon */}
          <button
            onClick={() => {
              if (!user) {
                setShowSignInGate(true);
                return;
              }
              setChatPopupOpen(prev => !prev);
            }}
            className={`group fixed bottom-6 right-6 z-[101] flex items-center gap-0 hover:gap-3 transition-all duration-300 ${chatPopupOpen ? '' : ''}`}
            aria-label="Chat with AI"
          >
            {/* Tooltip bubble — hidden when popup is open */}
            {!chatPopupOpen && (
              <span className="max-w-0 overflow-hidden group-hover:max-w-[150px] transition-all duration-300 whitespace-nowrap bg-card border border-border/50 text-foreground text-sm font-medium px-0 group-hover:px-3 py-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100">
                Any help ??
              </span>
            )}
            {/* Avatar circle */}
            <div className={`w-14 h-14 transition-all duration-200 drop-shadow-[0_0_20px_rgba(9,218,237,0.7)] ${chatPopupOpen ? 'scale-90' : 'hover:scale-110'}`}>
              <img src={chatbotAvatar} alt="AI Assistant" className="w-full h-full object-contain" />
            </div>
          </button>
        </>
      )}

      {/* Sign-In Gate Modal */}
      {showSignInGate && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowSignInGate(false)}
          />

          {/* Modal Dialog Card */}
          <div className="relative w-full max-w-md overflow-hidden bg-white/95 dark:bg-slate-900/95 border border-slate-200/50 dark:border-slate-800/50 shadow-2xl rounded-3xl p-6 sm:p-8 backdrop-blur-2xl text-center space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Glow Background */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 blur-xl pointer-events-none" />

            <div className="relative space-y-2 flex flex-col items-center">
              <div className="w-16 h-16 flex items-center justify-center mx-auto mb-1">
                <img 
                  src={neeshLogo} 
                  alt="Neesh AI Logo" 
                  className="h-14 w-auto object-contain drop-shadow-md" 
                />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">Sign In to Continue</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Sign in to give feedback, rate sections, or talk to the AI Assistant. Your profile details will auto-populate into your feedback.
              </p>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-2 relative z-10">
              <Button
                type="button"
                onClick={() => handleSignIn('google')}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 h-10 rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>

              <Button
                type="button"
                onClick={() => handleSignIn('github')}
                className="w-full flex items-center justify-center gap-3 bg-zinc-900 hover:bg-zinc-800 text-white h-10 rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
                </svg>
                Continue with GitHub
              </Button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-1">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider absolute">
                or sign in with email
              </span>
            </div>

            {/* Inline Email & Password Form */}
            <form onSubmit={handleInlinePasswordSignIn} className="space-y-3 text-left relative z-10">
              {inlineError && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{inlineError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={inlineEmail}
                  onChange={(e) => {
                    setInlineEmail(e.target.value);
                    if (inlineError) setInlineError(null);
                  }}
                  className="h-10 rounded-xl text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showInlinePassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={inlinePassword}
                    onChange={(e) => {
                      setInlinePassword(e.target.value);
                      if (inlineError) setInlineError(null);
                    }}
                    className="h-10 rounded-xl text-xs pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowInlinePassword(!showInlinePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showInlinePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={inlineSubmitting}
                className="w-full h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-md hover:opacity-95 transition-opacity"
              >
                {inlineSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validating credentials...
                  </span>
                ) : (
                  "Sign In & Access Spotlight"
                )}
              </Button>
            </form>

            <div className="pt-1 flex flex-col items-center gap-1.5">
              <p className="text-xs text-slate-500">
                Don't have an account yet?{" "}
                <Link
                  to={`/signup?returnTo=${encodeURIComponent(window.location.href.split('#')[0])}`}
                  onClick={() => {
                    try {
                      sessionStorage.setItem('post_login_redirect', window.location.href.split('#')[0]);
                    } catch {}
                    setShowSignInGate(false);
                  }}
                  className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline"
                >
                  Create Account
                </Link>
              </p>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowSignInGate(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs py-1 h-auto"
              >
                Skip for now — View Spotlight
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* End of preview page */}
    </div>
  );
};

export default BlogPreview;
