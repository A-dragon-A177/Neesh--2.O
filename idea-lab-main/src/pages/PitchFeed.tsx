import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Volume2, VolumeX, Share2, BookOpen, MessageCircle, ChevronUp, ChevronDown,
  ArrowRight, X, Loader2, Play, Clapperboard, LogIn, SkipForward, ArrowLeft, Flame
} from "lucide-react";
import { usePitches, type PitchFeedItem } from "@/hooks/usePitches";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import BlogPreview from "./BlogPreview";
import { generateShareableUrl } from "@/lib/slugify";
import { toast } from "sonner";
import neeshLogo from "@/assets/neesh-logo.png";
import apiClient from "@/lib/api";

// ─── Sign-In Gate Modal ──────────────────────────────────────────────────────

const SignInGate = ({ onSkip, onSignIn }: { onSkip: () => void; onSignIn: (provider: 'google' | 'github') => void }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
    {/* Backdrop */}
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

    {/* Card */}
    <div className="relative w-full max-w-md mx-4 mb-0 sm:mb-0 rounded-t-3xl sm:rounded-3xl bg-gradient-to-br from-[#0f0f1a] to-[#1a0f2e] border border-violet-500/20 p-8 shadow-2xl">
      {/* Glow */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 blur-xl pointer-events-none" />

      <div className="relative text-center space-y-6 flex flex-col items-center">
        <div className="w-20 h-20 flex items-center justify-center mx-auto mb-2">
          <img 
            src={neeshLogo} 
            alt="Neesh AI Logo" 
            className="h-16 w-auto object-contain drop-shadow-md animate-pulse" 
          />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to Neesh Pitches</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Discover startup elevator pitches — swipe up for more, swipe right to read the full blog.
          </p>
        </div>

        <div className="space-y-3 w-full">
          <button
            id="pitch-signin-google"
            onClick={() => onSignIn('google')}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3.5 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <button
            id="pitch-signin-github"
            onClick={() => onSignIn('github')}
            className="w-full flex items-center justify-center gap-3 bg-zinc-800 text-white font-semibold py-3.5 rounded-xl hover:bg-zinc-700 transition-colors border border-zinc-700"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
            </svg>
            Continue with GitHub
          </button>

          <button
            id="pitch-skip-signin"
            onClick={onSkip}
            className="w-full text-muted-foreground text-sm hover:text-foreground transition-colors py-2"
          >
            <SkipForward className="w-3.5 h-3.5 inline mr-1.5" />
            Skip for now — browse anonymously
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Single Pitch Card ────────────────────────────────────────────────────────

const PitchCard = ({ pitch, isActive, onBlogOpen }: PitchCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [neeshCount, setNeeshCount] = useState<number>(0);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);

  useEffect(() => {
    let isMounted = true;
    apiClient.get<{ count: number }>(`/api/public/projects/${pitch.projectId}/interest-count`, { skipAuth: true })
      .then(res => {
        if (isMounted && res && typeof res.count === 'number') {
          setNeeshCount(res.count);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [pitch.projectId]);

  const publicUrl = pitch.slug
    ? `${window.location.origin}/p/${pitch.slug}-${pitch.projectId}`
    : `${window.location.origin}/p/${pitch.projectId}`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.playbackRate = 1.0;
      video.defaultPlaybackRate = 1.0;
    } catch {}

    if (isActive && !showDetailsSheet) {
      const p = video.play();
      if (p !== undefined) {
        p.then(() => setPlaying(true)).catch(() => setPlaying(false));
      }
      apiClient.post(`/api/public/projects/${pitch.projectId}/record-pitch-view`, {}, { skipAuth: true }).catch(() => {
        supabase.from("projects" as any).select("pitch_view_count").eq("id", pitch.projectId).maybeSingle().then(({ data }) => {
          if (data) {
            supabase.from("projects" as any).update({ pitch_view_count: (Number(data.pitch_view_count) || 0) + 1 }).eq("id", pitch.projectId).then(() => {});
          }
        }).catch(() => {});
      });
    } else {
      video.pause();
      setPlaying(false);
    }

    return () => {
      video.pause();
      setPlaying(false);
    };
  }, [isActive, showDetailsSheet, pitch.projectId]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(isNaN(pct) ? 0 : pct);
  };

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      // User clicked play -> enable audio
      video.muted = false;
      setMuted(false);
      const p = video.play();
      if (p !== undefined) {
        p.then(() => setPlaying(true)).catch(() => setPlaying(false));
      }
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !muted;
      videoRef.current.muted = nextMuted;
      setMuted(nextMuted);
      if (!nextMuted && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const handleShare = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none">
      {/* 1. Top Header with Frosted White background & Blue/Cyan accents */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-md border-b border-cyan-200/80 shadow-sm">
        {/* Left: Back Arrow button (White/Cyan theme) */}
        <Link
          to="/space"
          className="w-9 h-9 rounded-full bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 flex items-center justify-center transition-all shadow-sm shrink-0 active:scale-95"
          title="Back to Space"
        >
          <ArrowLeft className="w-4.5 h-4.5 text-cyan-700" />
        </Link>

        {/* Center: Title */}
        <h2 className="text-slate-900 font-extrabold text-base sm:text-lg truncate max-w-[200px] sm:max-w-xs text-center mx-auto px-2 tracking-tight">
          {pitch.title}
        </h2>

        {/* Right: Mute / Unmute Button (White/Cyan theme) */}
        <button
          id={`pitch-mute-${pitch.projectId}`}
          onClick={toggleMute}
          className="w-9 h-9 rounded-full bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 flex items-center justify-center transition-all shadow-sm shrink-0 active:scale-95"
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="w-4.5 h-4.5 text-cyan-700" /> : <Volume2 className="w-4.5 h-4.5 text-cyan-700" />}
        </button>
      </div>

      {/* 2. Full-screen Elevator Pitch Video */}
      {pitch.elevatorPitchUrl ? (
        <video
          ref={videoRef}
          src={pitch.elevatorPitchUrl}
          poster={pitch.elevatorPitchThumbnail || undefined}
          muted={muted}
          loop
          playsInline
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
        />
      ) : (
        <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
          <img
            src={pitch.coverImageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000"}
            alt={pitch.title}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/90 to-slate-950/95 backdrop-blur-md" />
          <div className="relative text-center z-10 p-6 space-y-4 max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/30 border border-cyan-300/40">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight drop-shadow">{pitch.title}</h3>
            <p className="text-xs text-cyan-100/90 leading-relaxed font-medium">
              No pitch video uploaded. Click below to open Spotlight and read full details.
            </p>
            <Button
              onClick={onBlogOpen}
              className="w-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-extrabold rounded-2xl py-3.5 shadow-lg shadow-cyan-500/25 text-sm transition-all"
            >
              Open Spotlight →
            </Button>
          </div>
        </div>
      )}

      {/* Progress bar below header */}
      {pitch.elevatorPitchUrl && (
        <div className="absolute top-[53px] left-0 right-0 h-1 bg-cyan-950/20 z-30">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 transition-all duration-200 shadow-[0_0_8px_rgba(9,218,237,0.7)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Play/Pause center overlay button (White/Cyan theme) */}
      {!playing && isActive && pitch.elevatorPitchUrl && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center z-20 group"
        >
          <div className="w-16 h-16 rounded-full bg-white/95 text-cyan-600 backdrop-blur-md flex items-center justify-center border-2 border-cyan-400/80 shadow-[0_0_25px_rgba(9,218,237,0.4)] transition-all hover:scale-110 active:scale-95 group-hover:border-cyan-300">
            <Play className="w-8 h-8 text-cyan-600 fill-cyan-500 ml-1 transition-colors" />
          </div>
        </button>
      )}

      {/* 3. Right-Side Action Buttons with White & Cyan Glassmorphism */}
      <div className="absolute bottom-20 right-3 z-30 flex flex-col items-center gap-4">
        {/* Fire Emoji Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onBlogOpen(); }}
          className="flex flex-col items-center gap-0.5 group cursor-pointer"
          title="Express Interest"
        >
          <div className="w-11 h-11 rounded-full bg-white/95 hover:bg-white backdrop-blur-md flex items-center justify-center border border-cyan-200 text-cyan-700 group-hover:border-cyan-400 group-hover:scale-110 active:scale-95 transition-all shadow-lg shadow-cyan-950/15">
            <span className="text-xl">🔥</span>
          </div>
          <span className="text-white text-[10px] font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{neeshCount}</span>
        </button>

        {/* Share Button */}
        <button
          id={`pitch-share-${pitch.projectId}`}
          onClick={handleShare}
          className="flex flex-col items-center gap-0.5 group cursor-pointer"
          title="Share pitch"
        >
          <div className="w-11 h-11 rounded-full bg-white/95 hover:bg-white backdrop-blur-md flex items-center justify-center border border-cyan-200 text-cyan-700 group-hover:border-cyan-400 group-hover:scale-110 active:scale-95 transition-all shadow-lg shadow-cyan-950/15">
            <Share2 className="w-5 h-5 text-cyan-600 group-hover:text-blue-600 transition-colors" />
          </div>
          <span className="text-white text-[10px] font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{copied ? "Copied!" : "Share"}</span>
        </button>

        {/* Open Spotlight Button */}
        <button
          id={`pitch-blog-${pitch.projectId}`}
          onClick={(e) => { e.stopPropagation(); onBlogOpen(); }}
          className="flex flex-col items-center gap-0.5 group cursor-pointer"
          title="Open Spotlight"
        >
          <div className="w-11 h-11 rounded-full bg-white/95 hover:bg-white backdrop-blur-md flex items-center justify-center border border-cyan-200 text-cyan-700 group-hover:border-cyan-400 group-hover:scale-110 active:scale-95 transition-all shadow-lg shadow-cyan-950/15">
            <BookOpen className="w-5 h-5 text-cyan-600 group-hover:text-blue-600 transition-colors" />
          </div>
          <span className="text-white text-[10px] font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">Spotlight</span>
        </button>
      </div>

      {/* 4. Frosted White & Blue Bottom Bar */}
      <div
        className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 sm:py-3.5 bg-white/90 backdrop-blur-xl border-t border-cyan-200/80 shadow-[0_-4px_24px_rgba(9,218,237,0.15)] cursor-pointer select-none transition-all hover:bg-white/95"
        onClick={() => setShowDetailsSheet(true)}
      >
        {/* Founder Profile Avatar + Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 text-white font-black text-base flex items-center justify-center border-2 border-white shadow-md shadow-cyan-500/20 shrink-0 aspect-square overflow-hidden">
            {pitch.authorProfileImageUrl ? (
              <img
                src={pitch.authorProfileImageUrl}
                alt={pitch.authorName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <span>{pitch.authorName?.[0]?.toUpperCase() || "?"}</span>
            )}
          </div>
          <div className="text-left min-w-0">
            <p className="text-slate-900 font-extrabold text-sm sm:text-base leading-tight truncate max-w-[130px] sm:max-w-[170px]">{pitch.authorName}</p>
            <p className="text-cyan-600 text-xs font-bold mt-0.5">Founder</p>
          </div>
        </div>

        {/* Cyan Handle Line in Center */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_12px_rgba(9,218,237,0.6)] animate-pulse" />
          <span className="text-[9px] text-cyan-700 font-extrabold tracking-wider uppercase flex items-center gap-0.5">
            <ChevronUp className="w-3 h-3 text-cyan-600 inline" /> Tap for details
          </span>
        </div>

        {/* Placeholder for symmetry */}
        <div className="w-20" />
      </div>

      {/* Expandable Details Drawer (White & Blue Theme) */}
      {showDetailsSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setShowDetailsSheet(false)}
          />

          <div className="relative w-full max-w-lg mx-auto bg-white text-slate-900 border-t-2 border-cyan-400/60 rounded-t-3xl p-6 space-y-4 shadow-2xl shadow-cyan-950/20 z-10 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 rounded-full bg-slate-200 mx-auto -mt-2 mb-1" />
            <div className="flex items-center justify-between border-b border-cyan-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 text-white font-extrabold text-sm flex items-center justify-center shadow-md shadow-cyan-500/20">
                  {pitch.authorName?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-slate-900 text-sm font-extrabold leading-none">{pitch.authorName}</p>
                  <p className="text-cyan-600 text-xs font-semibold mt-1">Founder</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailsSheet(false)}
                className="w-8 h-8 rounded-full bg-cyan-50 hover:bg-cyan-100 text-cyan-700 flex items-center justify-center transition-colors border border-cyan-200 active:scale-95"
              >
                <X className="w-4 h-4 text-cyan-700" />
              </button>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{pitch.title}</h2>
              {pitch.oneLineSummary && (
                <p className="text-sm text-slate-600 font-medium leading-relaxed bg-cyan-50/50 p-3.5 rounded-xl border border-cyan-100/60">
                  {pitch.oneLineSummary}
                </p>
              )}
            </div>

            <div className="pt-2">
              <Button
                onClick={() => {
                  setShowDetailsSheet(false);
                  onBlogOpen();
                }}
                className="w-full h-12 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-extrabold rounded-2xl text-base shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all"
              >
                <BookOpen className="w-5 h-5 text-white" />
                <span>Open Spotlight</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Blog Slide Panel ────────────────────────────────────────────────────────

const BlogPanel = ({ projectId, onClose }: { projectId: string; onClose: () => void }) => (
  <div className="absolute inset-0 z-30 flex">
    {/* Translucent dark left edge that the pitch peeks through */}
    <div
      className="w-10 flex-shrink-0 bg-black/50 cursor-pointer"
      onClick={onClose}
      title="Back to pitch"
    />
    {/* Blog content */}
    <div className="flex-1 bg-background overflow-y-auto rounded-l-2xl shadow-2xl">
      {/* Close / back button */}
      <div className="sticky top-0 bg-background/95 backdrop-blur z-10 flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
        </button>
        <span className="text-sm font-medium text-muted-foreground">Back to Pitch</span>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-violet-400 font-medium">
          <Clapperboard className="w-3.5 h-3.5" />
          Neesh Pitches
        </div>
      </div>
      <BlogPreview publicId={projectId} defaultView="blog" />
    </div>
  </div>
);

// ─── Main PitchFeed Page ─────────────────────────────────────────────────────

const PitchFeed = () => {
  const { pitches, loading, hasMore, loadMore, refresh } = usePitches();
  const { user, signInWithGoogle, signInWithGithub } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSignIn, setShowSignIn] = useState(true);
  const [blogProjectId, setBlogProjectId] = useState<string | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss sign-in gate if already logged in
  useEffect(() => {
    if (user) setShowSignIn(false);
  }, [user]);

  // Load pitches on mount
  useEffect(() => {
    refresh();
  }, []);

  // Auto-load more when near end
  useEffect(() => {
    if (currentIndex >= pitches.length - 3 && hasMore && !loading) {
      loadMore();
    }
  }, [currentIndex, pitches.length]);

  const goNext = useCallback(() => {
    setCurrentIndex(i => Math.min(i + 1, pitches.length - 1));
    setBlogProjectId(null);
  }, [pitches.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(i => Math.max(i - 1, 0));
    setBlogProjectId(null);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") goNext();
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") setBlogProjectId(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY === null || touchStartX === null) return;
    const dy = touchStartY - e.changedTouches[0].clientY;
    const dx = touchStartX - e.changedTouches[0].clientX;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      if (dx > 50 && pitches[currentIndex]) {
        // swipe left → open blog
        setBlogProjectId(pitches[currentIndex].projectId);
      } else if (dx < -50) {
        // swipe right → close blog
        setBlogProjectId(null);
      }
    } else {
      // Vertical swipe
      if (dy > 50) goNext();
      if (dy < -50) goPrev();
    }
    setTouchStartY(null);
    setTouchStartX(null);
  };

  // Wheel scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.deltaY > 40) goNext();
    if (e.deltaY < -40) goPrev();
  }, [goNext, goPrev]);

  const handleSignIn = async (provider: 'google' | 'github') => {
    try {
      const currentUrl = window.location.href;
      if (provider === 'google') {
        await signInWithGoogle(currentUrl);
      } else {
        await signInWithGithub(currentUrl);
      }
    } catch {
      toast.error("Sign-in failed, please try again.");
    }
  };

  if (loading && pitches.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center mx-auto shadow-lg">
            <Clapperboard className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto" />
          <p className="text-white/60 text-sm">Loading pitches...</p>
        </div>
      </div>
    );
  }

  if (!loading && pitches.length === 0) {
    return (
      <div className="fixed inset-0 bg-[#0a0a14] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 flex items-center justify-center mx-auto border border-violet-500/20">
            <Clapperboard className="w-8 h-8 text-violet-400" />
          </div>
          <h2 className="text-xl font-bold text-white">No Pitches Yet</h2>
          <p className="text-muted-foreground text-sm">
            No elevator pitches are live in the Cross Promotional Engine yet. Be the first to upload and promote yours!
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentPitch = pitches[currentIndex];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Sign-in gate */}
      {showSignIn && !user && (
        <SignInGate onSkip={() => setShowSignIn(false)} onSignIn={handleSignIn} />
      )}

      {/* Pitch viewport */}
      <div className="absolute inset-0">
        {currentPitch && (
          <PitchCard
            key={currentPitch.projectId}
            pitch={currentPitch}
            isActive={!blogProjectId}
            onBlogOpen={() => setBlogProjectId(currentPitch.projectId)}
          />
        )}

        {/* Blog slide panel */}
        {blogProjectId && (
          <BlogPanel projectId={blogProjectId} onClose={() => setBlogProjectId(null)} />
        )}
      </div>

      {/* Navigation arrows (desktop) */}
      {!blogProjectId && (
        <>
          {currentIndex > 0 && (
            <button
              id="pitch-prev"
              onClick={goPrev}
              className="absolute left-1/2 -translate-x-1/2 top-4 z-20 p-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-colors text-white hidden sm:flex"
            >
              <ChevronUp className="w-6 h-6" />
            </button>
          )}
          {currentIndex < pitches.length - 1 && (
            <button
              id="pitch-next"
              onClick={goNext}
              className="absolute left-1/2 -translate-x-1/2 bottom-4 z-20 p-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-colors text-white hidden sm:flex"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
          )}
        </>
      )}

      {/* Pitch counter */}
      {!blogProjectId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/30 backdrop-blur-sm text-white/70 text-xs px-3 py-1.5 rounded-full border border-white/10 hidden sm:block">
          {currentIndex + 1} / {pitches.length}{hasMore ? "+" : ""}
        </div>
      )}

      {/* Loading indicator for next batch */}
      {loading && pitches.length > 0 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
        </div>
      )}


    </div>
  );
};

export default PitchFeed;
