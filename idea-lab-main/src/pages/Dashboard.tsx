import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CreateProjectWizard from "@/components/project/CreateProjectWizard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Search,
  Star,
  ArrowRight,
  LogOut,
  Settings,
  Loader2,
  FolderOpen,
  FileText,
  Tag,
  AlignLeft,
  FileEdit,
  HelpCircle,
  Link2,
  Check,
  BookOpen,
  Sparkles,
  Database,
  MessageSquare,
  Bell as BellIcon,
  Bot,
  BarChart3,
  ChevronRight,
  User,
  Megaphone,
  Lock,
  Trash2,
  PartyPopper,
  AlertTriangle,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProjects, type Project } from "@/hooks/useProjects";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { usePromotions } from "@/hooks/usePromotions";
import { usePaymentVerification } from "@/hooks/usePayments";
import { toast } from "sonner";
import { NeeshLogo } from "@/components/NeeshLogo";
import { BetaBadge } from "@/components/BetaBadge";
import { generateShareableUrl } from "@/lib/slugify";
import apiClient from "@/lib/api";
import { useBlogs } from "@/hooks/useBlogs";
import { ProjectTimer } from "@/components/project/ProjectTimer";

// Status styles mapping
const statusStyles = {
  draft: "status-draft",
  active: "status-active",
  published: "status-published",
  locked: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold",
};

// Helper function to get cover image URL from localStorage
const getProjectCoverImage = (projectId: string): string | null => {
  // Check the key used by useCoverImage hook (this is the primary storage)
  const coverImageData = localStorage.getItem(`cover-image-${projectId}`);
  if (coverImageData) {
    return coverImageData;
  }
  // Fallback: check URL-based storage
  const savedUrl = localStorage.getItem(`cover-image-url-${projectId}`);
  if (savedUrl) {
    return savedUrl;
  }
  // Fallback: check old blog localStorage format
  const savedData = localStorage.getItem(`blog-${projectId}`);
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData);
      return parsed.coverImage || null;
    } catch {
      return null;
    }
  }
  return null;
};

const Dashboard = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { user, loading: authLoading, signOut } = useAuth();
  const { projects, loading: projectsLoading, createProject, updateProject } = useProjects();
  const { profile } = useProfile();
  const { subscription, isPro, isFree, canCreateProject, upgradeToPro, refetch: refetchSubscription, daysRemaining } = useSubscription();
  const { promotions, submitPromotion, removePromotion } = usePromotions();
  const { verifying } = usePaymentVerification();
  const { upsertBlog } = useBlogs();
  const [helpOpen, setHelpOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [betaUpgradeSuccess, setBetaUpgradeSuccess] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteProjectId, setPromoteProjectId] = useState<string | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const navigate = useNavigate();

  // Cover images fetched from backend (for projects without localStorage images)
  const [coverImages, setCoverImages] = useState<Record<string, string>>({});

  // Fetch cover images from backend for projects that don't have them in localStorage
  useEffect(() => {
    if (!projects?.length) return;

    const fetchMissingCoverImages = async () => {

      const missingProjects = projects.filter(p => !getProjectCoverImage(p.id));
      
      if (missingProjects.length === 0) return;

      try {
        const results = await Promise.all(
          missingProjects.map(async (project) => {
            try {
              const blogData = await apiClient.get<{ coverImageUrl?: string }>(
                `/api/projects/${project.id}/blog`
              );
              return { id: project.id, url: blogData?.coverImageUrl || null };
            } catch {
              return { id: project.id, url: null };
            }
          })
        );

        const updates: Record<string, string> = {};
        results.forEach(result => {
          if (result.url) {
            updates[result.id] = result.url;
            localStorage.setItem(`cover-image-${result.id}`, result.url);
          }
        });

        if (Object.keys(updates).length > 0) {
          setCoverImages(prev => ({ ...prev, ...updates }));
        }
      } catch (error) {

      }
    };

    fetchMissingCoverImages();
  }, [projects]);

  const handleCopyLink = async (e: React.MouseEvent, projectId: string, projectTitle: string) => {
    e.preventDefault();
    e.stopPropagation();
    const url = generateShareableUrl(projectId, projectTitle);
    await navigator.clipboard.writeText(url);
    setCopiedId(projectId);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const handleProjectCreated = (project: any) => {
    setIsCreateOpen(false);
    refetchSubscription();
    navigate(`/project/${project.id}`);
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    const success = await upgradeToPro();
    setIsUpgrading(false);
    if (success) {
      setUpgradeOpen(false);
      setBetaUpgradeSuccess(true);
    } else {
      toast.error("Failed to upgrade. Please try again.");
    }
  };

  const handlePromoteBlog = async () => {
    if (!promoteProjectId) {
      toast.error("Please select a project.");
      return;
    }
    setIsPromoting(true);
    try {
      await submitPromotion(promoteProjectId);
      toast.success("Blog promoted successfully! It will appear in 'More Like This' sections.");
      setPromoteOpen(false);
      setPromoteProjectId(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to promote blog.");
    } finally {
      setIsPromoting(false);
    }
  };



  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
      navigate("/");
    }
  };

  const filteredProjects = projects
    .filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.title.localeCompare(b.title);
        case "rating": {
          const statusOrder: Record<string, number> = { published: 0, active: 1, draft: 2 };
          return (statusOrder[a.status.toLowerCase()] ?? 3) - (statusOrder[b.status.toLowerCase()] ?? 3);
        }
        case "recent":
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

  const loading = authLoading || projectsLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center hero-gradient">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border/50 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4">
              <NeeshLogo size="md" />
              <BetaBadge variant="glow" type="beta" className="hidden sm:flex" />
              <span className="text-sm text-muted-foreground hidden md:block">
                Welcome to Niche Ecosystem
              </span>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {/* Help Workflow Guide */}
              <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
                <DialogTrigger asChild>
                  <button className="icon-button w-9 h-9 md:w-10 md:h-10">
                    <HelpCircle className="w-5 h-5 text-muted-foreground" />
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-display text-xl flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      How Neesh AI Works
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    {[
                      { icon: Sparkles, title: "1. Overview", desc: "Your startup's command center — validation score, market signals, gap detection, persona breakdown, and AI-generated summary all computed from real audience interactions." },
                      { icon: FileEdit, title: "2. Spotlight Editor", desc: "Build your high-converting product spotlight page. Add text, images, video, interest buttons, and feedback forms. Share the public link to capture real audience intent." },
                      { icon: Megaphone, title: "3. Elevator Pitch", desc: "Create a crisp 30-second pitch reel. Record, upload, or generate your elevator pitch to hook visitors within seconds and drive engagement." },
                      { icon: Database, title: "4. Train your ChatBot", desc: "Upload product docs (PDF, DOCX, TXT) to power your AI chatbot. It learns from your knowledge base to answer visitor questions 24/7 with accurate, context-aware responses." },
                      { icon: MessageSquare, title: "5. Audience Inbox", desc: "Your unified engagement hub — view feedback submissions, chatbot questions, validated buyer signals (Gold/Silver/Bronze), and respond directly to individual audience members. Track unanswered questions and notification clusters." },
                      { icon: Bot, title: "6. Chatbot", desc: "Preview and test your AI chatbot exactly as visitors experience it. Powered by your uploaded documents and trained knowledge base." },
                      { icon: BarChart3, title: "7. Audience Insights", desc: "AI-powered persona detection categorizes your audience (developers, marketers, investors, etc.). Discover confusion points, trending questions, and AI-suggested content improvements." },
                    ].map((step) => (
                      <div key={step.title} className="flex gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <step.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground text-sm">{step.title}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground text-center">
                        Build your spotlight → Visitors engage & ask questions → AI validates demand → You iterate with real signals
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
 
              <Button 
                onClick={() => {
                  if (!canCreateProject) {
                    setUpgradeOpen(true);
                  } else {
                    setIsCreateOpen(true);
                  }
                }}
                className="h-9 md:h-11 px-3 md:px-4 rounded-xl text-xs md:text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                <span className="hidden xs:inline">New Project</span>
                <span className="xs:hidden">New</span>
                <BetaBadge variant="static" type="beta" className="ml-1.5 hidden md:flex" />
              </Button>

              {/* Spotlight Creation Wizard */}
              {isCreateOpen && (
                <CreateProjectWizard
                  onClose={() => setIsCreateOpen(false)}
                  createProject={createProject}
                  updateProject={updateProject}
                  upsertBlog={upsertBlog}
                  onProjectCreated={handleProjectCreated}
                  canCreateProject={canCreateProject}
                />
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-11 h-11 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ring-border/50 hover:ring-primary/50 transition-all">
                    {profile?.profileImageUrl ? (
                      <img
                        src={profile.profileImageUrl}
                        alt="User"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2 text-sm text-muted-foreground truncate">
                    {user.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Upgrade Modal — Beta instant upgrade */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              ⚡ Upgrade to Pro
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-600/10 via-green-600/10 to-teal-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <BetaBadge variant="glow" type="beta" />
                <p className="text-sm text-foreground font-medium">
                  Free during 2.0 Beta!
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Since Neesh AI is in 2.0 Beta, all Pro features are completely free. Upgrade now to unlock:
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Unlimited projects</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Remove "Powered by Neesh AI" branding</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Add your own logo & branding</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Promote blogs in "More Like This" network</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setUpgradeOpen(false)} className="flex-1">
                Maybe Later
              </Button>
              <Button onClick={handleUpgrade} disabled={isUpgrading} className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white">
                {isUpgrading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Upgrade Free ⚡
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Beta Upgrade Success Modal */}
      <Dialog open={betaUpgradeSuccess} onOpenChange={setBetaUpgradeSuccess}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center mb-4">
              <PartyPopper className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              🎉 Welcome to Pro!
            </h2>
            <BetaBadge variant="glow" type="beta" className="mb-3" />
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Since Neesh AI is currently in <strong className="text-foreground">2.0 Beta</strong>, the Pro plan is free for you! Enjoy unlimited projects, custom branding, cross-promotion, and all premium features.
            </p>
            <Button
              onClick={() => setBetaUpgradeSuccess(false)}
              className="mt-6 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-8"
            >
              Let's Go! 🚀
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Promote Blog Modal (Pro users) */}
      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              🚀 Promote Your Blog
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Your blog will appear in the "More Like This" section of all other published blogs.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Project</label>
              <Select value={promoteProjectId || ""} onValueChange={setPromoteProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project to promote" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {promoteProjectId && !projects.find(p => p.id === promoteProjectId)?.elevator_pitch_url && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-amber-400">Missing Elevator Pitch</p>
                  <p className="text-muted-foreground">
                    This project does not have an elevator pitch video. If you promote it, the pitches Reels feed will use your blog cover image instead of a video.
                  </p>
                  <div className="pt-1.5">
                    <button
                      onClick={() => {
                        setPromoteOpen(false);
                        navigate(`/project/${promoteProjectId}?tab=elevator-pitch`);
                      }}
                      className="text-xs text-violet-400 hover:text-violet-300 font-semibold p-0 bg-transparent border-0 underline cursor-pointer"
                    >
                      Go to Upload Pitch Video first →
                    </button>
                  </div>
                </div>
              </div>
            )}

            <Button onClick={handlePromoteBlog} className="w-full" disabled={isPromoting || !promoteProjectId}>
              {isPromoting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Promote Blog
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">

        {/* Title and filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Your Projects
            </h1>
            <p className="text-muted-foreground mt-1">Manage and track your validation projects</p>
          </div>

          <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
            {/* Sort by: Desktop selection */}
            <div className="hidden md:block">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px] h-11 rounded-xl">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Sort by: Recent</SelectItem>
                  <SelectItem value="rating">Sort by: Rating</SelectItem>
                  <SelectItem value="name">Sort by: Name</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort by: Mobile trigger button */}
            <button
              onClick={() => setIsFilterSheetOpen(true)}
              className="md:hidden w-11 h-11 rounded-xl border border-border/30 bg-card flex items-center justify-center text-muted-foreground active:scale-95 transition-all shrink-0"
              aria-label="Filter and Sort"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>

            {/* Search Input (flexible width) */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search projects"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 w-full sm:w-[200px] h-11 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const coverImage = getProjectCoverImage(project.id) || coverImages[project.id] || null;
              return (
                <Link
                  key={project.id}
                  to={`/project/${project.id}`}
                  className="group block"
                >
                  <div className="bg-card rounded-2xl border border-border/30 overflow-hidden hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300">
                    {/* Cover Image Area */}
                    <div className="relative h-32 sm:h-48 overflow-hidden">
                      {coverImage ? (
                        <>
                          <img
                            src={coverImage.includes('supabase') ? `${coverImage}${coverImage.includes('?') ? '&' : '?'}width=600&quality=75` : coverImage}
                            alt={project.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            decoding="async"
                          />
                          {/* Gradient fade to bottom */}
                          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                        </>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 via-accent/10 to-muted flex items-center justify-center">
                          <FolderOpen className="w-12 h-12 text-muted-foreground/30" />
                          {/* Gradient fade to bottom */}
                          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                        </div>
                      )}

                      {/* Project Timer countdown badge on top-left */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                        <ProjectTimer
                          deadline={project.timer_deadline}
                          createdAt={project.created_at}
                          status={project.status}
                          variant="compact"
                        />
                      </div>

                      {/* Status badge and copy link overlay on top-right */}
                      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => handleCopyLink(e, project.id, project.title)}
                              className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors border border-border/50"
                            >
                              {copiedId === project.id ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Link2 className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copy shareable link</p>
                          </TooltipContent>
                        </Tooltip>
                        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize backdrop-blur-sm ${statusStyles[project.status.toLowerCase() as keyof typeof statusStyles] || "status-draft"}`}>
                          {project.status.toLowerCase()}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      {/* Title */}
                      <h3 className="font-display font-semibold text-lg text-foreground group-hover:text-primary transition-colors mb-2">
                        {project.title}
                      </h3>

                      {/* Summary */}
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                        {project.one_line_summary || "No description"}
                      </p>

                      {/* Updated date and arrow */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Updated {new Date(project.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
              <FolderOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-display font-semibold text-xl text-foreground mb-2">
              No projects found
            </h3>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              {searchQuery ? "Try a different search term" : "Create your first project to get started"}
            </p>
            <Button onClick={() => setIsCreateOpen(true)} size="lg">
              <Plus className="w-5 h-5" />
              Create Your First Project
            </Button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            CROSS-PROMOTION ENGINE SECTION
            ═══════════════════════════════════════════════ */}
        <section className="mt-12 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-xl font-bold text-foreground">
                    Cross-Promotion Engine
                  </h2>
                </div>
                <div className="flex flex-col">
                  <p className="text-sm text-muted-foreground">
                    Promote your blogs in other users' "More Like This" sections
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={() => setPromoteOpen(true)} className="gap-1.5 shadow-sm w-full sm:w-auto h-10">
              <Plus className="w-4 h-4" />
              Add Project
            </Button>
          </div>

          <div>
            {promotions.filter(p => p.status?.toUpperCase() === 'ACTIVE').length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {promotions.filter(p => p.status?.toUpperCase() === 'ACTIVE').map((promo) => {
                  const project = projects.find(p => p.id === promo.projectId);
                  const coverImg = (project ? (getProjectCoverImage(project.id) || coverImages[project.id]) : null) || promo.coverImageUrl || project?.elevator_pitch_thumbnail;
                  const displayTitle = (promo.blogTitle && promo.blogTitle !== "Untitled") ? promo.blogTitle : (project?.title || "Startup Project");
                  return (
                    <div
                      key={promo.id}
                      className="relative bg-card rounded-xl border border-blue-500/20 overflow-hidden group hover:shadow-lg transition-all"
                    >
                      {/* Cover */}
                      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-blue-600/10 via-indigo-600/10 to-muted">
                        {coverImg ? (
                          <img src={coverImg} alt={displayTitle} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Megaphone className="w-8 h-8 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h4 className="font-semibold text-sm mb-2 line-clamp-1">{displayTitle}</h4>

                        {/* Status + Remove */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 uppercase">
                            {promo.status?.toUpperCase() === 'ACTIVE' ? '● Live' : promo.status}
                          </span>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!window.confirm(`Are you sure you want to remove this promotion?\nTitle: ${promo.blogTitle}`)) {
                                return;
                              }
                              const ok = await removePromotion(promo.id);
                              if (ok) {
                                toast.success("Promotion removed.");
                              } else {
                                toast.error("Failed to remove promotion.");
                              }
                            }}
                            className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100 flex items-center gap-1.5"
                            title="Remove promotion"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-card rounded-xl border border-dashed border-blue-500/30">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center mx-auto mb-4">
                  <Megaphone className="w-7 h-7 text-blue-500" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">No promoted projects yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                  Add your projects here to promote them in other users' blogs under "More Like This" sections.
                </p>
                <Button onClick={() => setPromoteOpen(true)} className="gap-1.5 shadow-sm">
                  <Plus className="w-4 h-4" />
                  Promote Your First Project
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Mobile Floating Action Button (FAB) */}
      {!isCreateOpen && (
        <button
          onClick={() => {
            if (!canCreateProject) {
              setUpgradeOpen(true);
            } else {
              setIsCreateOpen(true);
            }
          }}
          className="mobile-fab fixed bottom-6 right-6 flex items-center justify-center md:hidden shadow-lg border-0"
          aria-label="New Project"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Mobile Sort/Filter Bottom Sheet */}
      {isFilterSheetOpen && (
        <div className="md:hidden">
          <div 
            className="mobile-sheet-backdrop open" 
            onClick={() => setIsFilterSheetOpen(false)}
          />
          <div className="mobile-sheet open p-6">
            <div className="mobile-sheet-handle" />
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg">Filter & Sort</h3>
              <button 
                onClick={() => setIsFilterSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Sort Projects By</h4>
                <div className="flex flex-col gap-2">
                  {[
                    { value: "recent", label: "Recent Updates" },
                    { value: "rating", label: "Rating / Status" },
                    { value: "name", label: "Project Name (A-Z)" }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSortBy(opt.value);
                        setIsFilterSheetOpen(false);
                      }}
                      className={`flex items-center justify-between p-4 rounded-xl border text-left font-medium transition-all ${
                        sortBy === opt.value 
                          ? "border-primary bg-primary/5 text-primary" 
                          : "border-border/50 bg-card text-foreground"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.value && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;