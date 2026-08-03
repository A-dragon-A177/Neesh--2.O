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

interface PitchCardProps {
  pitch: PitchFeedItem;
  isActive: boolean;
  onBlogOpen: () => void;
}

const PitchCard = ({ pitch, isActive, onBlogOpen }: PitchCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [neeshCount, setNeeshCount] = useState<number>(0);

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
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.play().then(() => setPlaying(true)).catch(() => {});
      // Record pitch view (fire-and-forget)
      apiClient.post(`/api/public/projects/${pitch.projectId}/record-pitch-view`, {}, { skipAuth: true }).catch(() => {});
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setPlaying(false);
      setProgress(0);
    }
  }, [isActive, pitch.projectId]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(isNaN(pct) ? 0 : pct);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) videoRef.current.muted = !muted;
    setMuted(m => !m);
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDuration = (sec: number | null) => {
    if (!sec) return "";
    return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`;
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      {/* Video / Cover Image Fallback */}
      {pitch.elevatorPitchUrl ? (
        <video
          ref={videoRef}
          src={pitch.elevatorPitchUrl}
          poster={pitch.elevatorPitchThumbnail || pitch.coverImageUrl || undefined}
          muted={muted}
          loop
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onClick={togglePlay}
          className="w-full h-full object-cover cursor-pointer"
        />
      ) : (
        <div className="w-full h-full relative flex items-center justify-center bg-zinc-950">
          <img
            src={pitch.coverImageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000"}
            alt={pitch.title}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-violet-950/45 to-[#0f0f1a]/95 backdrop-blur-md" />
          <div className="relative text-center z-10 p-6 space-y-4 max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto border border-white/20 shadow-lg shadow-violet-500/10">
              <BookOpen className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">{pitch.title}</h3>
            <p className="text-sm text-white/70 leading-relaxed">
              No pitch video uploaded. Click below or swipe right to read the full startup validation blog.
            </p>
            <Button
              onClick={onBlogOpen}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-semibold rounded-xl py-5 shadow-lg shadow-violet-500/20"
            >
              Read Full Blog
            </Button>
          </div>
        </div>
      )}

      {/* Dark gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/50 pointer-events-none" />

      {/* Progress bar (only if video exists) */}
      {pitch.elevatorPitchUrl && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/20">
          <div
            className="h-full bg-white transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Play/Pause overlay (only if video exists) */}
      {!playing && isActive && pitch.elevatorPitchUrl && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center z-10"
        >
          <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </button>
      )}

      {/* Duration badge */}
      {pitch.elevatorPitchDuration && (
        <div className="absolute top-6 left-4 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full text-white/80 text-xs border border-white/10">
          {formatDuration(pitch.elevatorPitchDuration)}
        </div>
      )}

      {/* Mute toggle */}
      <button
        id={`pitch-mute-${pitch.projectId}`}
        onClick={toggleMute}
        className="absolute top-6 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/10 text-white hover:bg-white/10 transition-colors z-20"
      >
        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Bottom-left: Author info */}
      <div className="absolute bottom-8 left-4 right-24 z-20 space-y-2">
        {/* Author chip */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-lg">
            {pitch.authorName?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">{pitch.authorName}</p>
            <p className="text-white/60 text-xs mt-0.5">Founder</p>
          </div>
        </div>

        <h3 className="text-white font-bold text-xl leading-tight drop-shadow-lg line-clamp-2">
          {pitch.title}
        </h3>
        {pitch.oneLineSummary && (
          <p className="text-white/80 text-sm leading-relaxed line-clamp-2 drop-shadow">
            {pitch.oneLineSummary}
          </p>
        )}

        {/* Centered 3D Flame with Neeshed count */}
        <div className="flex flex-col items-center mb-3">
          <button
            onClick={onBlogOpen}
            className="flex flex-col items-center group cursor-pointer"
            title="Neeshed It"
          >
            <span
              className="text-4xl group-hover:scale-110 transition-transform"
              style={{
                filter: 'drop-shadow(0 0 12px rgba(245,158,11,0.7)) drop-shadow(0 4px 6px rgba(0,0,0,0.3))',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            >
              🔥
            </span>
            <span className="text-white text-sm font-black drop-shadow-lg leading-none mt-0.5">
              {neeshCount}
            </span>
          </button>
        </div>

        {/* Blog CTA hint */}
        <button
          onClick={onBlogOpen}
          className="flex items-center gap-2 text-violet-300 text-sm font-medium hover:text-violet-200 transition-colors mt-1"
        >
          <BookOpen className="w-4 h-4" />
          Swipe right to read the blog
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right action buttons (TikTok/Instagram-style) */}
      <div className="absolute bottom-8 right-3 z-20 flex flex-col items-center gap-5">
        {/* Share */}
        <button
          id={`pitch-share-${pitch.projectId}`}
          onClick={handleShare}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-all">
            <Share2 className={`w-5 h-5 ${copied ? "text-violet-400" : "text-white"}`} />
          </div>
          <span className="text-white/70 text-[10px] font-medium">{copied ? "Copied!" : "Share"}</span>
        </button>

        {/* Read Blog */}
        <button
          id={`pitch-blog-${pitch.projectId}`}
          onClick={onBlogOpen}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-all">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="text-white/70 text-[10px] font-medium">Blog</span>
        </button>

        {/* Chat */}
        <Link
          to={`/project/${pitch.projectId}/chatbot`}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-all">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-white/70 text-[10px] font-medium">Chat</span>
        </Link>
      </div>

      {/* Swipe hint arrows */}
      <div className="absolute right-16 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 opacity-50 pointer-events-none">
        <ChevronUp className="w-5 h-5 text-white/50 animate-bounce" />
        <span className="text-white/40 text-[9px] font-medium rotate-90">swipe</span>
      </div>
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

      {/* Neesh Pitches watermark and Back to Space button */}
      {!blogProjectId && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
          <Link
            to="/space"
            className="flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-white/10 text-white/80 hover:bg-black/60 hover:text-white transition-all text-xs font-semibold px-4 py-2 rounded-full"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            Back to Space
          </Link>
          <Link
            to="/dashboard"
            className="hidden sm:flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-semibold"
          >
            <img src={neeshLogo} alt="Neesh Logo" className="w-6 h-6 object-contain" />
            <span>Neesh Pitches</span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default PitchFeed;
