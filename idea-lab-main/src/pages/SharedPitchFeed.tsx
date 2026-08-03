import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Volume2, VolumeX, Share2, BookOpen, ArrowRight, X, Loader2, Play, Pause,
  Clapperboard, ChevronDown, Sparkles, ArrowLeft, Flame
} from "lucide-react";
import { usePitches, type PitchFeedItem } from "@/hooks/usePitches";
import { NeeshLogo } from "@/components/NeeshLogo";
import BlogPreview from "./BlogPreview";
import { toast } from "sonner";
import apiClient from "@/lib/api";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

interface SharedProject {
  title: string;
  slug: string;
  oneLineSummary: string | null;
  introduction: string | null;
  description: string | null;
  elevatorPitchUrl: string | null;
  elevatorPitchThumbnail: string | null;
  elevatorPitchDuration: number | null;
  coverImageUrl?: string | null;
}

/** Unified card model for the feed (either the shared project or a pitch from the engine) */
interface FeedCard {
  projectId: string;
  title: string;
  hook: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  coverImageUrl: string | null;
  authorName: string;
  slug: string;
}

interface SharedPitchFeedProps {
  projectId: string;
}

/* ═══════════════════════════════════════════════════════════════
   Video Player Card — handles letterboxing, play/pause, mute
   ═══════════════════════════════════════════════════════════════ */

const VideoPlayer = ({
  videoUrl,
  thumbnailUrl,
  coverImageUrl,
  title,
  isActive,
}: {
  videoUrl: string | null;
  thumbnailUrl: string | null;
  coverImageUrl: string | null;
  title: string;
  isActive: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Auto-play when this card becomes active, pause when not
  useEffect(() => {
    if (!videoRef.current || !videoUrl) return;
    if (isActive) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setPlaying(true))
          .catch(() => {
            // Autoplay blocked — try muted
            if (videoRef.current) {
              videoRef.current.muted = true;
              setMuted(true);
              videoRef.current.play().then(() => setPlaying(true)).catch(() => {});
            }
          });
      }
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setPlaying(false);
      setProgress(0);
    }
  }, [isActive, videoUrl]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !muted;
    }
    setMuted((m) => !m);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(isNaN(pct) ? 0 : pct);
  };

  // ── No video uploaded ──────────────────────────────────────────
  if (!videoUrl || videoError) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/40">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-[#09daed]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-[#6366f1]/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-5 px-8 text-center">
          <div className="w-24 h-24 rounded-3xl bg-white/80 backdrop-blur-xl flex items-center justify-center border border-white/60 shadow-lg shadow-[#6366f1]/10">
            <Clapperboard className="w-12 h-12 text-[#6366f1]/70" />
          </div>
          <div className="space-y-2">
            <p className="text-slate-700 font-bold text-lg">No Elevator Pitch Yet</p>
            <p className="text-slate-500 text-sm max-w-[240px] leading-relaxed">
              The founder hasn't uploaded a pitch video for this project.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Video player ───────────────────────────────────────────────
  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden group">
      {/* Loading shimmer */}
      {!videoLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/20">
          <div className="w-14 h-14 rounded-full border-4 border-white/20 border-t-[#09daed] animate-spin" />
        </div>
      )}

      {/* The actual video */}
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl || undefined}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onCanPlay={() => setVideoLoaded(true)}
        onError={() => setVideoError(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="w-full h-full object-contain"
      />

      {/* Gradient overlay for controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Centre play/pause button — always visible when paused, hover-visible when playing */}
      <button
        onClick={togglePlay}
        className={`absolute inset-0 flex items-center justify-center z-20 transition-opacity duration-300 ${
          playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
        }`}
      >
        <div className="w-20 h-20 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center shadow-xl border border-white/40 transition-transform hover:scale-110">
          {playing
            ? <Pause className="w-8 h-8 text-white fill-white" />
            : <Play className="w-8 h-8 text-white fill-white ml-1" />
          }
        </div>
      </button>

      {/* Top-right controls */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        {/* Mute toggle */}
        <button
          onClick={toggleMute}
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-colors shadow-sm border border-white/20"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 z-30">
        <div
          className="h-full bg-gradient-to-r from-[#09daed] to-[#6366f1] transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};


/* ═══════════════════════════════════════════════════════════════
   Spotlight Panel — side panel with blog + chatbot
   ═══════════════════════════════════════════════════════════════ */

const SpotlightPanel = ({
  projectId,
  isOpen,
  onClose,
}: {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}) => {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 spatial-spotlight-backdrop ${isOpen ? "open" : ""}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-4 right-4 bottom-4 z-50 w-[calc(100%-2rem)] md:w-[75vw] lg:w-[60vw] xl:w-[50vw] bg-white/80 dark:bg-slate-950/80 backdrop-blur-3xl border border-white/80 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_24px_64px_rgba(99,102,241,0.2)] overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isOpen ? "translate-x-0 scale-100 opacity-100" : "translate-x-[110%] scale-95 opacity-0"
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-8 py-5 border-b border-white/20 dark:border-slate-800/40 bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl">
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-slate-100/50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-900 transition-all hover:scale-105"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex-1 pl-2">
            <span className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight">Project Spotlight</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">Full blog & interactive feedback</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#09daed] font-semibold bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Neesh AI
          </div>
        </div>

        {/* Blog content */}
        <div className="overflow-y-auto h-[calc(100%-76px)] scrollbar-thin scrollbar-thumb-slate-200/80 dark:scrollbar-thumb-slate-800/80">
          <BlogPreview publicId={projectId} defaultView="blog" />
        </div>
      </div>
    </>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Pitch Card — Desktop (split) and Mobile (fullscreen)
   ═══════════════════════════════════════════════════════════════ */

const PitchCard = ({
  card,
  isActive,
  onSpotlightOpen,
}: {
  card: FeedCard;
  isActive: boolean;
  onSpotlightOpen: () => void;
}) => {
  const [copied, setCopied] = useState(false);
  const [neeshCount, setNeeshCount] = useState<number>(0);
  const publicUrl = `${window.location.origin}/p/${card.slug ? `${card.slug}-` : ""}${card.projectId}`;

  useEffect(() => {
    let isMounted = true;
    apiClient.get<{ count: number }>(`/api/public/projects/${card.projectId}/interest-count`, { skipAuth: true })
      .then(res => {
        if (isMounted && res && typeof res.count === 'number') {
          setNeeshCount(res.count);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [card.projectId]);

  useEffect(() => {
    if (isActive) {
      apiClient.post(`/api/public/projects/${card.projectId}/record-pitch-view`, {}, { skipAuth: true }).catch(() => {});
    }
  }, [isActive, card.projectId]);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="spatial-snap-card w-full h-[100dvh] flex items-center justify-center pt-16 pb-4 md:pt-20 md:pb-8 px-4 md:px-8 lg:px-12 xl:px-16">
      
      {/* ─── Main Liquid Glass Tab ─── */}
      <div className="w-full h-full max-w-7xl mx-auto rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-white/60 backdrop-blur-2xl border border-white shadow-[0_8px_32px_rgba(99,102,241,0.12)] flex flex-col md:flex-row relative">
        
        {/* Left: Video */}
        <div className="relative w-full md:w-3/5 lg:w-2/3 h-[50%] md:h-full bg-slate-50/50 border-b md:border-b-0 md:border-r border-white/40">
          <VideoPlayer
            videoUrl={card.videoUrl}
            thumbnailUrl={card.thumbnailUrl}
            coverImageUrl={card.coverImageUrl}
            title={card.title}
            isActive={isActive}
          />
        </div>

        {/* Right: Project Info */}
        <div className="flex flex-col justify-center px-8 md:px-10 xl:px-16 py-8 md:py-12 w-full md:w-2/5 lg:w-1/3 h-[50%] md:h-full bg-white/40 overflow-y-auto">
          {/* Author chip */}
          <div className="flex items-center gap-3 mb-6 md:mb-8">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#09daed] to-[#6366f1] flex items-center justify-center text-white text-base font-bold shadow-lg shadow-[#09daed]/20">
              {card.authorName?.[0]?.toUpperCase() || "N"}
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800 leading-none">{card.authorName}</p>
              <p className="text-sm text-slate-500 mt-1">Founder</p>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl xl:text-4xl font-bold text-slate-900 leading-[1.15] tracking-tight mb-4">
            {card.title}
          </h1>

          {/* Hook / Description */}
          <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-8 line-clamp-4 md:line-clamp-6">
            {card.hook}
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-4 mt-auto md:mt-0">
            {/* Centered 3D Fire icon with Neeshed count */}
            <div className="flex flex-col items-center justify-center mb-2">
              <button
                onClick={onSpotlightOpen}
                className="flex flex-col items-center group cursor-pointer"
                title="Click to view spotlight & express interest"
              >
                <span
                  className="text-4xl group-hover:scale-110 transition-transform"
                  style={{
                    filter: 'drop-shadow(0 0 12px rgba(245,158,11,0.7)) drop-shadow(0 4px 6px rgba(0,0,0,0.15))',
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                >
                  🔥
                </span>
                <span className="text-slate-900 dark:text-white text-sm font-black mt-0.5">
                  {neeshCount}
                </span>
              </button>
            </div>

            {/* View Spotlight CTA */}
            <button
              onClick={onSpotlightOpen}
              className="group flex items-center justify-center gap-2 bg-gradient-to-r from-[#09daed] to-[#6366f1] text-white font-semibold text-base hover:opacity-90 transition-opacity rounded-2xl px-6 py-4 w-full shadow-lg shadow-[#6366f1]/25"
            >
              <BookOpen className="w-5 h-5" />
              View Spotlight
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors bg-white/50 backdrop-blur-sm border border-white/60 rounded-2xl px-6 py-3.5 shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              {copied ? "Link copied!" : "Share this pitch"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Main SharedPitchFeed Page
   ═══════════════════════════════════════════════════════════════ */

const SharedPitchFeed = ({ projectId }: SharedPitchFeedProps) => {
  const { pitches, loading: pitchesLoading, hasMore, loadMore, refresh } = usePitches();

  const [sharedProject, setSharedProject] = useState<SharedProject | null>(null);
  const [sharedBlogCover, setSharedBlogCover] = useState<string | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [spotlightProjectId, setSpotlightProjectId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const hasFetchedRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch the shared project (runs once on mount)
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const fetchProject = async () => {
      try {
        setProjectLoading(true);
        setErrorMsg(null);
        const project = await apiClient.get<SharedProject>(
          `/api/public/projects/id/${projectId}`,
          { skipAuth: true }
        );
        setSharedProject(project);

        // Also fetch blog for cover image
        try {
          const blog = await apiClient.get<{ coverImageUrl?: string }>(
            `/api/public/projects/${projectId}/blog`,
            { skipAuth: true }
          );
          if (blog?.coverImageUrl) setSharedBlogCover(blog.coverImageUrl);
        } catch { /* no blog, OK */ }
      } catch (err: any) {
        console.error("[SharedPitchFeed] Error fetching project:", err);
        setErrorMsg(err.message || "Failed to load project details. Please try checking your database connection.");
      } finally {
        setProjectLoading(false);
      }
    };

    fetchProject();
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Build unified feed: shared project first, then cross-promotional pitches (deduplicated)
  const feedCards: FeedCard[] = useMemo(() => {
    const cards: FeedCard[] = [];

    // 1. The shared project (always first)
    if (sharedProject) {
      cards.push({
        projectId,
        title: sharedProject.title,
        hook: sharedProject.oneLineSummary || sharedProject.introduction || sharedProject.description || "",
        videoUrl: sharedProject.elevatorPitchUrl,
        thumbnailUrl: sharedProject.elevatorPitchThumbnail,
        coverImageUrl: sharedBlogCover || null,
        authorName: "Creator",
        slug: sharedProject.slug,
      });
    }

    // 2. Cross-promotional pitches (skip duplicate)
    pitches.forEach((pitch: PitchFeedItem) => {
      if (pitch.projectId === projectId) return; // skip duplicate
      cards.push({
        projectId: pitch.projectId,
        title: pitch.title,
        hook: pitch.oneLineSummary || "",
        videoUrl: pitch.elevatorPitchUrl,
        thumbnailUrl: pitch.elevatorPitchThumbnail,
        coverImageUrl: pitch.coverImageUrl,
        authorName: pitch.authorName,
        slug: pitch.slug,
      });
    });

    return cards;
  }, [sharedProject, sharedBlogCover, pitches, projectId]);

  // Auto-load more when nearing end (only when we have some cards already)
  useEffect(() => {
    if (feedCards.length > 0 && activeIndex >= feedCards.length - 3 && hasMore && !pitchesLoading) {
      loadMore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, feedCards.length, hasMore, pitchesLoading]);

  // Snap scroll — detect active card from scroll position
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      const scrollTop = containerRef.current!.scrollTop;
      const cardHeight = containerRef.current!.clientHeight;
      const newIndex = Math.round(scrollTop / cardHeight);
      setActiveIndex(Math.max(0, Math.min(newIndex, feedCards.length - 1)));
    }, 80);
  }, [feedCards.length]);

  // Keyboard nav
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (spotlightProjectId) {
        if (e.key === "Escape") setSpotlightProjectId(null);
        return;
      }
      if (e.key === "ArrowDown") scrollToCard(activeIndex + 1);
      if (e.key === "ArrowUp") scrollToCard(activeIndex - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, spotlightProjectId, feedCards.length]);

  const scrollToCard = (index: number) => {
    const clamped = Math.max(0, Math.min(index, feedCards.length - 1));
    if (!containerRef.current) return;
    containerRef.current.scrollTo({
      top: clamped * containerRef.current.clientHeight,
      behavior: "smooth",
    });
  };

  // Loading state (Spatial UI Light Mode - Blue and White)
  if (projectLoading) {
    return (
      <div className="fixed inset-0 spatial-bg flex items-center justify-center spatial-ui">
        <div className="text-center space-y-6 max-w-sm px-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#09daed] to-[#6366f1] flex items-center justify-center mx-auto shadow-xl shadow-[#09daed]/20 animate-pulse">
            <Clapperboard className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-2">
            <Loader2 className="w-7 h-7 text-[#6366f1] animate-spin mx-auto" />
            <p className="text-foreground/75 text-sm font-semibold tracking-wide">Loading pitches...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error boundary state
  if (errorMsg) {
    return (
      <div className="fixed inset-0 spatial-bg flex items-center justify-center spatial-ui px-6">
        <div className="text-center space-y-6 max-w-md w-full p-8 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto text-red-500">
            <X className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-foreground text-xl font-bold">Unable to Load Pitch Feed</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{errorMsg}</p>
          </div>
          <button
            onClick={() => {
              setErrorMsg(null);
              setProjectLoading(true);
              hasFetchedRef.current = false;
            }}
            className="w-full bg-gradient-to-r from-[#09daed] to-[#6366f1] text-white px-5 py-3.5 rounded-2xl font-semibold hover:opacity-90 transition-opacity text-sm shadow-lg shadow-[#6366f1]/25"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-50 text-slate-900 spatial-ui select-none overflow-hidden">
      {/* Neesh AI logo watermark and Back to Space button */}
      <div className="fixed top-4 left-5 z-30 flex items-center gap-3">
        <Link 
          to="/space" 
          className="flex items-center gap-2 bg-white/70 backdrop-blur-xl border border-white/60 text-slate-800 hover:bg-white hover:text-slate-950 transition-all text-xs font-bold px-4 py-2.5 rounded-full shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-600" />
          Back to Space
        </Link>
        <Link to="/" className="hidden sm:flex items-center justify-center bg-white/70 backdrop-blur-xl border border-white/60 h-10 px-3 rounded-full shadow-sm hover:bg-white transition-all overflow-hidden">
          <NeeshLogo size="sm" showText={false} />
        </Link>
      </div>

      {/* Card counter (desktop) */}
      {feedCards.length > 1 && !spotlightProjectId && (
        <div className="fixed top-4 right-5 z-30 hidden md:flex items-center gap-2 bg-white/70 backdrop-blur-xl border border-white/60 text-slate-600 text-xs px-4 py-2 rounded-full shadow-sm">
          <Clapperboard className="w-4 h-4 text-[#6366f1]" />
          <span className="font-medium">{activeIndex + 1} / {feedCards.length}{hasMore ? "+" : ""}</span>
        </div>
      )}

      {/* Snap scroll feed */}
      <div
        ref={containerRef}
        className="spatial-snap-container"
        onScroll={handleScroll}
      >
        {feedCards.map((card, index) => (
          <PitchCard
            key={card.projectId}
            card={card}
            isActive={index === activeIndex && !spotlightProjectId}
            onSpotlightOpen={() => setSpotlightProjectId(card.projectId)}
          />
        ))}

        {/* End-of-feed card */}
        {feedCards.length > 0 && !hasMore && (
          <div className="spatial-snap-card flex items-center justify-center spatial-bg">
            <div className="text-center space-y-6 px-8 max-w-sm">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-[#6366f1]/10 flex items-center justify-center border border-[#6366f1]/15">
                <Sparkles className="w-8 h-8 text-[#6366f1]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-slate-900 text-xl font-bold">You&apos;re all caught up!</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  No more pitches to show. Check back soon for new startup ideas.
                </p>
              </div>
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#09daed] to-[#6366f1] text-white px-6 py-3.5 rounded-2xl font-semibold hover:opacity-90 transition-opacity text-sm shadow-md"
              >
                <Clapperboard className="w-4 h-4" />
                Explore Neesh AI
              </Link>
            </div>
          </div>
        )}

        {/* Loading more indicator */}
        {pitchesLoading && feedCards.length > 0 && (
          <div className="h-24 flex items-center justify-center spatial-bg">
            <Loader2 className="w-6 h-6 text-[#6366f1] animate-spin" />
          </div>
        )}
      </div>

      {/* Scroll hint (first card only) */}
      {activeIndex === 0 && feedCards.length > 1 && !spotlightProjectId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 text-foreground/40 animate-bounce pointer-events-none">
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold">More pitches</span>
          <ChevronDown className="w-5 h-5 text-[#6366f1]" />
        </div>
      )}

      {/* Spotlight Panel */}
      <SpotlightPanel
        projectId={spotlightProjectId || projectId}
        isOpen={!!spotlightProjectId}
        onClose={() => setSpotlightProjectId(null)}
      />
    </div>
  );
};

export default SharedPitchFeed;
