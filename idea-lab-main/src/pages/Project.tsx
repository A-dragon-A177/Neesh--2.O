import { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getSpotlightTitle } from "@/lib/spotlightTitles";
import defaultChatbotAvatar from "@/assets/chatbot-avatar.png";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Eye,
  Sparkles,
  ExternalLink,
  Loader2,
  Bot,
  Clapperboard,
  Inbox,
  Compass,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

import AudienceInboxTab from "@/components/project/AudienceInboxTab";
import AudienceInsights from "@/components/project/AudienceInsights";
import ElevatorPitchTab from "@/components/project/ElevatorPitchTab";
import { useNotifications } from "@/hooks/useNotifications";
import ProjectOverview from "@/components/project/ProjectOverview";
import CreateProjectWizard from "@/components/project/CreateProjectWizard";
import { useCoverImage } from "@/hooks/useCoverImage";
import { useProjects, type Project as ProjectType } from "@/hooks/useProjects";
import { useBlogs } from "@/hooks/useBlogs";
import KnowledgeTab from "@/components/project/KnowledgeTab";
import ShareProgressModal from "@/components/project/ShareProgressModal";
import ProjectSidebar from "@/components/project/ProjectSidebar";
import ProjectMobileNav from "@/components/project/ProjectMobileNav";
import SpotlightEditorTab from "@/components/project/SpotlightEditorTab";
import { useAudienceData } from "@/hooks/useAudienceData";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { uploadFileToStorage, migrateBase64ToStorage, isBase64 } from "@/lib/storage";
import GuidedProductTour from "@/components/project/GuidedProductTour";
import { ProjectTimer } from "@/components/project/ProjectTimer";
import { ProjectLockedOverlay } from "@/components/project/ProjectLockedOverlay";
import { useValidatedBuyers } from "@/hooks/useValidatedBuyers";

const Project = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const { getProject, updateProject, deleteProject, unlockProject } = useProjects();
  const { getBlog, upsertBlog } = useBlogs();
  const { data: buyersData, refetch: refetchBuyers } = useValidatedBuyers(id);

  const [project, setProject] = useState<ProjectType | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "blog" | "knowledge" | "inbox" | "elevator-pitch" | "chatbot" | "audience">(() => {
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'blog', 'knowledge', 'inbox', 'elevator-pitch', 'chatbot', 'audience'].includes(tab)) {
      return tab as any;
    }
    return 'overview';
  });

  const handleTabChange = (tab: "overview" | "blog" | "knowledge" | "inbox" | "elevator-pitch" | "chatbot" | "audience") => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    if (tab === "overview") {
      newParams.delete("tab");
    } else {
      newParams.set("tab", tab);
    }
    navigate({ search: newParams.toString() ? `?${newParams.toString()}` : "" }, { replace: true });
  };
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { coverImage, uploading, uploadCoverImage, removeCoverImage } = useCoverImage(id);
  const { badgeCount, fetchBadgeCount, clusters, fetchClusters } = useNotifications(id);
  const { members: audienceMembers } = useAudienceData(id);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Pre-formatted Share Progress text & OG image URL
  const publicSlug = (project as any)?.slug || (project?.title ? project.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-') : 'idea');
  const publicUrl = `https://neeshglobal.com/p/${publicSlug}-${project?.id || id}`;
  const healthScore = (project as any)?.score || 88;
  const detectedGap = (project as any)?.keyGap || "Pricing model & technical specifications clarity";
  const ogImageUrl = `https://neeshglobal.com/api/og-share?title=${encodeURIComponent(project?.title || "Startup Idea")}&score=${healthScore}&gap=${encodeURIComponent(detectedGap)}&industry=${encodeURIComponent(project?.industry || "SaaS")}`;

  const sharePostText = `Validating my startup concept "${project?.title || "Startup Idea"}" on @NeeshAI! 🚀\n\n📊 Current Idea Health Score: ${healthScore}/100\n💡 Key Customer Gap Detected: ${detectedGap}\n\nCheck out the pitch reel & ask our AI chatbot questions here:\n${publicUrl}\n\n#buildinpublic #startups #NeeshAI`;
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Auto-start guided product tour for newly created projects
  useEffect(() => {
    if (id) {
      const tourKey = `guided_tour_seen_${id}`;
      const isNew = searchParams.get('new') === 'true' || searchParams.get('tour') === 'true';
      if (isNew || !localStorage.getItem(tourKey)) {
        setIsTourOpen(true);
      }
    }
  }, [id, searchParams]);

  const handleCloseTour = () => {
    setIsTourOpen(false);
    if (id) {
      localStorage.setItem(`guided_tour_seen_${id}`, "true");
    }
  };

  // Auto-open wizard if shareable resume link was used (?resume=true)
  useEffect(() => {
    if (searchParams.get('resume') === 'true') {
      setIsWizardOpen(true);
    }
  }, [searchParams]);

  const [sections, setSections] = useState<Array<{
    id: string;
    title: string;
    content: string;
    type: string;
    sectionTitle?: string;
    imageUrl?: string;
    videoUrl?: string;
    feedbackTitle?: string;
    feedbackDescription?: string;
    feedbackFields?: Array<{
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
    }>;
  }>>([
    { id: "1", title: "Introduction", content: "", type: "text" },
    { id: "2", title: "Content", content: "", type: "text" },
  ]);

  const [interestTags, setInterestTags] = useState<Array<{ id: string; label: string; priority: number; color?: string }>>([
    { id: "1", label: "Pilot Users", priority: 1, color: "#FFD700" },
    { id: "2", label: "Investment", priority: 2, color: "#C0C0C0" },
    { id: "3", label: "Crowdfunding", priority: 3, color: "#CD7F32" },
    { id: "4", label: "Join Team", priority: 4, color: "#94A3B8" },
  ]);
  const [newTagInput, setNewTagInput] = useState("");

  // Load project from database
  useEffect(() => {
    const loadProject = async () => {
      if (!id) return;
      setProjectLoading(true);
      const data = await getProject(id);
      if (data) {
        setProject(data);
      } else {
        toast.error("Project not found");
        navigate("/dashboard");
      }
      setProjectLoading(false);
    };
    loadProject();
  }, [id]);

  // Load blog data
  useEffect(() => {
    const loadBlog = async () => {
      if (!id || !project) return;
      const blog = await getBlog(id);
      if (blog) {
        if (blog.interest_tags && blog.interest_tags.length > 0) {
          setInterestTags(blog.interest_tags);
        }

        // Start with intro and content sections
        // Fall back to project fields if blog hasn't been saved yet
        const loadedSections: typeof sections = [
          { id: "1", title: "Introduction", content: blog.introduction || project?.introduction || "", type: "text" },
          { id: "2", title: "Content", content: blog.content || project?.description || "", type: "text" },
        ];

        // Add custom fields as sections (including feedback)
        if (blog.custom_fields && Array.isArray(blog.custom_fields)) {
          blog.custom_fields.forEach((field: any, idx: number) => {
            if (field.type === "feedback") {
              loadedSections.push({
                id: field.id || `feedback-${idx}`,
                title: field.title || "Feedback Form",
                content: field.description || "",
                type: "feedback",
                feedbackTitle: field.title,
                feedbackDescription: field.description,
                feedbackFields: field.fields || [],
              });
            } else if (field.type === "image") {
              loadedSections.push({
                id: field.id,
                title: `Image ${field.order + 1}`,
                content: field.value || "",
                type: "image",
                imageUrl: field.value,
              });
            } else if (field.type === "video") {
              loadedSections.push({
                id: field.id,
                title: `Video ${field.order + 1}`,
                content: field.value || "",
                type: "video",
                videoUrl: field.value,
              });
            } else {
              const resolvedTitle = field.type === "spotlight_section" && field.sectionTitle
                ? getSpotlightTitle(field.sectionTitle, project?.industry)
                : field.sectionTitle || `Section ${field.order + 1}`;
              loadedSections.push({
                id: field.id,
                title: resolvedTitle,
                content: field.value || "",
                type: field.type || "text",
                sectionTitle: field.sectionTitle,
              });
            }
          });
        }

        setSections(loadedSections);
      } else {
        // No blog found — keep default sections
      }
    };
    loadBlog();
  }, [id, project?.id]);

  const handleSaveBlog = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const introSection = sections.find(s => s.id === "1");
      const contentSection = sections.find(s => s.id === "2");
      const customSections = sections.filter(s => s.id !== "1" && s.id !== "2");

      const customFields = await Promise.all(
        customSections.map(async (s, index) => {
          if (s.type === "feedback") {
            return {
              id: s.id,
              type: "feedback",
              title: s.feedbackTitle || s.title,
              description: s.feedbackDescription || s.content,
              fields: s.feedbackFields || [],
              order: index,
            };
          }
          if (s.type === "image") {
            const imgValue = s.imageUrl || s.content || "";
            const finalUrl = isBase64(imgValue)
              ? await migrateBase64ToStorage(id, imgValue, "image")
              : imgValue;
            return {
              id: s.id,
              type: "image",
              value: finalUrl,
              order: index,
            };
          }
          if (s.type === "video") {
            const vidValue = s.videoUrl || s.content || "";
            const finalUrl = isBase64(vidValue)
              ? await migrateBase64ToStorage(id, vidValue, "video")
              : vidValue;
            return {
              id: s.id,
              type: "video",
              value: finalUrl,
              order: index,
            };
          }
          return {
            id: s.id,
            type: s.type,
            value: s.content,
            order: index,
            ...(s.sectionTitle ? { sectionTitle: s.sectionTitle } : {}),
          };
        })
      );

      const finalCoverUrl = isBase64(coverImage || "")
        ? await migrateBase64ToStorage(id, coverImage, "cover")
        : (coverImage || undefined);

      const blogData = {
        heading: project?.title,
        cover_image_url: finalCoverUrl,
        introduction: introSection?.content || "",
        content: contentSection?.content || "",
        custom_fields: customFields,
        interest_tags: interestTags,
      };

      await upsertBlog(id, blogData);

      if (project) {
        await updateProject(id, { title: project.title });
      }
      toast.success("Blog saved successfully");
    } catch (err) {
      toast.error("Failed to save blog");
    } finally {
      setIsSaving(false);
    }
  };







  const handleDeleteProject = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      const success = await deleteProject(id);
      if (success) {
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error("Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  // Show loading state while project is being fetched
  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  // Show error if project not found
  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Project not found</p>
          <Link to="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <ProjectSidebar
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        projectTitle={project.title}
        badgeCount={badgeCount}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header - visible only on mobile */}
        <header className="md:hidden h-14 bg-card border-b border-border/50 flex items-center justify-between px-4 shadow-sm sticky top-0 z-30">
          <div className="flex items-center gap-2 min-w-0">
            <Link to="/dashboard" className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted hover:bg-muted/80 transition-colors flex-shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <span className="text-sm font-semibold truncate max-w-[120px]">{project.title}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* 5-Day Validation Sprint Timer */}
            <ProjectTimer
              deadline={project.timer_deadline}
              createdAt={project.created_at}
              status={project.status}
              goldCount={buyersData?.goldCount || 0}
              silverCount={buyersData?.silverCount || 0}
              bronzeCount={buyersData?.bronzeCount || 0}
              variant="compact"
            />
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="p-1.5 rounded-lg bg-[#09daed]/10 text-[#09daed] hover:bg-[#09daed]/20 flex items-center justify-center transition-colors font-medium text-xs gap-1"
              title="Share Progress"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsTourOpen(true)}
              className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition-colors"
              title="Start Guided Tour"
            >
              <Compass className="w-4 h-4" />
            </button>
            {activeTab === "blog" && (
              <>
                <Link to={`/project/${id}/preview`}>
                  <Button variant="outline" size="sm" className="gap-1 h-8 px-2 text-xs">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Preview</span>
                  </Button>
                </Link>
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={handleSaveBlog}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                </Button>
              </>
            )}
          </div>
        </header>

        {/* Desktop Top Header - hidden on mobile */}
        <header className="hidden md:flex h-16 bg-card border-b border-border/50 items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-3">
            {/* 5-Day Validation Sprint Timer Pill */}
            <ProjectTimer
              deadline={project.timer_deadline}
              createdAt={project.created_at}
              status={project.status}
              goldCount={buyersData?.goldCount || 0}
              silverCount={buyersData?.silverCount || 0}
              bronzeCount={buyersData?.bronzeCount || 0}
              variant="header"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShareModalOpen(true)}
              className="rounded-xl gap-1.5 border-[#09daed]/50 text-[#09daed] hover:bg-[#09daed]/10 font-semibold"
            >
              <Share2 className="w-4 h-4 text-[#09daed]" />
              Share Progress
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTourOpen(true)}
              className="rounded-xl gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold"
            >
              <Compass className="w-4 h-4 text-indigo-600" />
              Guided Tour
            </Button>
            {activeTab === "blog" && (
              <>
                <Link to={`/project/${id}/preview`}>
                  <Button variant="outline" size="sm" className="rounded-xl gap-2">
                    <ExternalLink className="w-4 h-4" />
                    View Blog
                  </Button>
                </Link>
                <Link to={`/project/${id}/feedback`}>
                  <Button variant="outline" size="sm" className="rounded-xl">
                    <Sparkles className="w-4 h-4" />
                    Feedback
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeTab === "blog" && (
              <>
                <Link to={`/project/${id}/preview`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </Button>
                </Link>
                <Button
                  size="sm"
                  onClick={handleSaveBlog}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </>
            )}
            <div className="w-10 h-10 rounded-full bg-muted overflow-hidden ring-2 ring-border/50">
              {profile?.profileImageUrl ? (
                <img
                  src={profile.profileImageUrl}
                  alt="User"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8 bg-background has-bottom-nav md:pb-8">
          {/* Project Locked Banner / Overlay if 5-day timer concluded without goals */}
          {project.status?.toUpperCase() === "LOCKED" && (
            <ProjectLockedOverlay
              projectId={id || ""}
              projectTitle={project.title}
              goldCount={buyersData?.goldCount || 0}
              silverCount={buyersData?.silverCount || 0}
              bronzeCount={buyersData?.bronzeCount || 0}
              onUnlock={async () => {
                const unlocked = await unlockProject(id || "");
                if (unlocked) {
                  setProject(unlocked);
                  refetchBuyers();
                }
              }}
            />
          )}

          {activeTab === "overview" && project && (
            <>
              <ProjectOverview
                projectId={id || "1"}
                projectData={{
                  title: project.title,
                  summary: project.one_line_summary || "",
                  description: project.description || "",
                  status: project.status,
                  onboardingCompleted: project.onboarding_completed,
                  elevatorPitchUrl: project.elevator_pitch_url || null,
                  earlyAccessPrice: project.early_access_price,
                  timerDeadline: project.timer_deadline,
                  createdAt: project.created_at,
                }}
                validationAnswers={project.validation_answers || null}
                validationReport={project.validation_report || null}
                onResumeOnboarding={() => setIsWizardOpen(true)}
                questionsData={clusters.slice(0, 5).map((q) => ({
                  question: q.canonicalQuestion,
                  count: q.totalAskCount,
                  answeredCount: q.status === "answered" ? q.totalAskCount : 0,
                }))}
                onDeleteProject={handleDeleteProject}
                isDeleting={isDeleting}
                onUpdateProject={async (pid, input) => {
                  const updated = await updateProject(pid, input);
                  if (updated) setProject(updated);
                  return updated;
                }}
              />
              {isWizardOpen && (
                <CreateProjectWizard
                  project={project}
                  onClose={() => setIsWizardOpen(false)}
                  createProject={async () => null}
                  updateProject={updateProject}
                  upsertBlog={upsertBlog}
                  onProjectCreated={(updatedProject) => {
                    setProject(updatedProject);
                    setIsWizardOpen(false);
                  }}
                  canCreateProject={true}
                />
              )}
            </>
          )}

          {activeTab === "blog" && (
            <SpotlightEditorTab
              projectTitle={project?.title || ""}
              onTitleChange={(newTitle) =>
                setProject((prev) => (prev ? { ...prev, title: newTitle } : null))
              }
              coverImage={coverImage}
              uploadingCover={uploading}
              onCoverImageUpload={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadCoverImage(file);
              }}
              onRemoveCoverImage={removeCoverImage}
              sections={sections}
              setSections={setSections}
              onSectionImageUpload={async (sectionId, file) => {
                if (!id) return;
                const tempUrl = URL.createObjectURL(file);
                setSections((prev) =>
                  prev.map((s) =>
                    s.id === sectionId
                      ? { ...s, imageUrl: tempUrl, content: file.name }
                      : s
                  )
                );
                try {
                  const { compressImage } = await import("@/lib/imageUtils");
                  const compressed = await compressImage(file);
                  const storageUrl = await uploadFileToStorage(id, compressed, "image");
                  URL.revokeObjectURL(tempUrl);
                  setSections((prev) =>
                    prev.map((s) =>
                      s.id === sectionId
                        ? { ...s, imageUrl: storageUrl, content: storageUrl }
                        : s
                    )
                  );
                  toast.success("Image uploaded successfully");
                } catch (err) {
                  toast.error("Failed to upload image. Save to retry.");
                }
              }}
              onSectionVideoUpload={async (sectionId, file) => {
                if (!id) return;
                const tempUrl = URL.createObjectURL(file);
                setSections((prev) =>
                  prev.map((s) =>
                    s.id === sectionId
                      ? { ...s, videoUrl: tempUrl, content: file.name }
                      : s
                  )
                );
                try {
                  const storageUrl = await uploadFileToStorage(id, file, "video");
                  URL.revokeObjectURL(tempUrl);
                  setSections((prev) =>
                    prev.map((s) =>
                      s.id === sectionId
                        ? { ...s, videoUrl: storageUrl, content: storageUrl }
                        : s
                    )
                  );
                  toast.success("Video uploaded successfully");
                } catch (err) {
                  toast.error("Failed to upload video. Save to retry.");
                }
              }}
              interestTags={interestTags}
              setInterestTags={setInterestTags}
            />
          )}

          {activeTab === "inbox" && project && (
            <AudienceInboxTab
              projectId={id!}
              earlyAccessPrice={project.early_access_price}
            />
          )}

          {activeTab === "elevator-pitch" && project && (
            <div className="h-full overflow-y-auto p-6">
              <ElevatorPitchTab
                project={project}
                projectId={id!}
                onUpdate={async (pid, input) => {
                  const updated = await updateProject(pid, input);
                  if (updated) setProject(updated);
                  return updated;
                }}
              />
            </div>
          )}

          {activeTab === "knowledge" && (
            <div className="max-w-5xl mx-auto">
              <KnowledgeTab projectId={id || "1"} />
            </div>
          )}

          {activeTab === "chatbot" && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-card rounded-2xl border border-border/30 p-8 shadow-card text-center">
                <div className="w-32 h-32 flex items-center justify-center mx-auto mb-6">
                  <img src={defaultChatbotAvatar} alt="Chatbot" className="w-full h-full object-contain drop-shadow-md" />
                </div>
                <h2 className="font-display font-semibold text-2xl mb-3">Test Your Chatbot</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Open the full chatbot testing interface to test responses, manage FAQs, and customize settings.
                </p>
                <Link to={`/project/${id}/chatbot`}>
                  <Button size="lg" className="rounded-xl gap-2">
                    <ExternalLink className="w-5 h-5" />
                    Open Chatbot Tester
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {activeTab === "audience" && (
            <div className="max-w-6xl mx-auto">
              <AudienceInsights projectId={id || "1"} />
            </div>
          )}
        </main>
      </div>


      <ProjectMobileNav
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        badgeCount={badgeCount}
        isMoreSheetOpen={isMoreSheetOpen}
        setIsMoreSheetOpen={setIsMoreSheetOpen}
      />

      <ShareProgressModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        projectTitle={project?.title || "Startup Idea"}
        sharePostText={sharePostText}
        ogImageUrl={ogImageUrl}
        coverImageUrl={coverImage}
        publicUrl={publicUrl}
      />

      <GuidedProductTour
        isOpen={isTourOpen}
        onClose={handleCloseTour}
        currentTab={activeTab}
        onSelectTab={(tab) => handleTabChange(tab as any)}
      />
    </div>
  );
};

export default Project;