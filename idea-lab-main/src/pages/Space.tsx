import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Search, Play, BookOpen, Clock, ArrowLeft, 
  Sparkles, ArrowUpDown, Loader2, Star, Rocket 
} from "lucide-react";
import { usePitches, type PitchFeedItem } from "@/hooks/usePitches";
import ScrollCanvas from "@/components/ScrollCanvas";
import { SeoHead } from "@/components/SeoHead";

export default function Space() {
  const { pitches, loading, hasMore, loadMore, refresh } = usePitches();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"latest" | "duration" | "alphabetical">("latest");

  // Load pitches on mount
  useEffect(() => {
    refresh();
  }, []);

  // Twinkling blue/cyan stars generator for the white space background
  const backgroundStars = useMemo(() => {
    return Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 2.5 + 1.5,
      delay: `${Math.random() * 4}s`,
      opacity: Math.random() * 0.6 + 0.4,
      // Use Neesh Cyan and indigo colors for stars
      color: i % 2 === 0 ? "bg-[#09daed]" : "bg-[#6366f1]"
    }));
  }, []);

  // Filter and sort pitches
  const filteredAndSortedPitches = useMemo(() => {
    let result = pitches.filter((pitch) => {
      const q = searchQuery.toLowerCase();
      const titleMatch = pitch.title ? pitch.title.toLowerCase().includes(q) : false;
      const summaryMatch = pitch.oneLineSummary ? pitch.oneLineSummary.toLowerCase().includes(q) : false;
      const authorMatch = pitch.authorName ? pitch.authorName.toLowerCase().includes(q) : false;
      return titleMatch || summaryMatch || authorMatch;
    });

    // Deduplicate pitches by projectId just in case
    const seen = new Set();
    result = result.filter(pitch => {
      if (seen.has(pitch.projectId)) return false;
      seen.add(pitch.projectId);
      return true;
    });

    if (sortBy === "latest") {
      // API returns them in reverse chronological order usually; keep as is
    } else if (sortBy === "duration") {
      result.sort((a, b) => (b.elevatorPitchDuration || 0) - (a.elevatorPitchDuration || 0));
    } else if (sortBy === "alphabetical") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [pitches, searchQuery, sortBy]);

  const formatDuration = (sec: number | null) => {
    if (!sec) return "0s";
    return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`;
  };

  return (
    <div className="min-h-screen text-slate-800 font-sans relative overflow-hidden select-none pb-24">
      <SeoHead
        title="Explore Startup Ideas & Pitch Reels | Neesh AI Space"
        description="Browse 30-60 second elevator pitch reels from founders. Interact with trained AI chatbots and validate startup concepts in real time."
        canonicalUrl="https://neeshglobal.com/space"
      />
      {/* ── Scroll-linked image sequence background ── */}
      <ScrollCanvas />

      {/* ── Twinkling Blue/Cyan Stars Background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {backgroundStars.map((star) => (
          <div
            key={star.id}
            className={`absolute rounded-full animate-pulse ${star.color}`}
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: star.delay,
              opacity: star.opacity,
              boxShadow: `0 0 8px rgba(9, 218, 237, 0.4)`
            }}
          />
        ))}
      </div>

      {/* ── Light Nebula Pastel Glow Effects ── */}
      <div className="absolute top-[-10%] left-[-20%] w-[60vw] h-[60vw] rounded-full bg-blue-100/30 blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#09daed]/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] rounded-full bg-[#09daed]/5 blur-[150px] pointer-events-none z-0" />

      {/* ── Cosmic Navigation Header (White Mode Glass with sharp borders) ── */}
      <header className="relative z-10 border-b border-slate-200/60 bg-white/75 backdrop-blur-md sticky top-0 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              to="/" 
              className="p-2.5 rounded-sm bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-all group flex items-center justify-center"
              title="Return Home"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700 transition-transform group-hover:-translate-x-1" />
            </Link>
            <div className="flex items-center gap-2">
              <img 
                src="/neesh-brand-logo.jpg" 
                alt="Neesh AI Logo" 
                className="h-10 w-auto object-contain" 
              />
              <span className="text-[10px] font-bold text-[#09daed] border border-[#09daed]/30 bg-[#09daed]/5 px-2 py-0.5 tracking-widest rounded-sm flex items-center gap-1 shadow-sm">
                <Rocket className="w-2.5 h-2.5 animate-bounce" />
                PITCH ARENA
              </span>
            </div>
          </div>
          <Link 
            to="/" 
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors hidden sm:block border border-slate-200 px-4 py-2 rounded-sm hover:bg-slate-50"
          >
            Neesh AI Homepage
          </Link>
        </div>
      </header>

      {/* ── Space Hero Section (White Mode & Brand Aligned) ── */}
      <main className="max-w-[1440px] mx-auto px-6 pt-16 relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#09daed]/30 bg-[#09daed]/5 rounded-sm text-[#09daed] text-xs font-semibold tracking-widest uppercase">
            <div className="w-1.5 h-1.5 bg-[#09daed] animate-pulse" />
            Explore the Startup Cosmos
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-950 tracking-tight leading-[1.1] font-sans">
            Elevator Pitches <span className="text-[#09daed]">Space</span>
          </h1>
          <p className="text-gray-700 text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-semibold">
            Traverse raw startup elevator pitch reels uploaded by visionary builders. Swipe, evaluate, and collaborate in real-time.
          </p>
        </div>

        {/* ── Search & Filter Panel (White Mode & Sharp Elements) ── */}
        <div className="max-w-4xl mx-auto mb-12 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <div className="absolute inset-0 bg-[#09daed] opacity-5 rounded-sm blur-md group-focus-within:opacity-10 transition-opacity" />
            <div className="relative flex items-center bg-white border border-gray-200 group-focus-within:border-[#09daed]/60 rounded-sm px-4 py-3.5 shadow-sm transition-colors">
              <Search className="w-5 h-5 text-slate-400 group-focus-within:text-[#09daed] transition-colors mr-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pitches by title, startup, or founder..."
                className="w-full bg-transparent border-0 outline-none text-gray-950 text-sm placeholder-slate-400"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")} 
                  className="text-slate-400 hover:text-slate-800 transition-colors text-xs font-bold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="relative min-w-[200px] flex items-center bg-white border border-gray-200 rounded-sm px-4 py-3.5 select-none hover:border-slate-300 transition-colors shadow-sm">
            <ArrowUpDown className="w-4 h-4 text-gray-500 mr-3" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent border-none outline-none text-gray-800 text-sm flex-1 cursor-pointer font-semibold"
            >
              <option value="latest">Latest Added</option>
              <option value="duration">Pitch Duration</option>
              <option value="alphabetical">A-Z Alphabetical</option>
            </select>
          </div>
        </div>

        {/* ── White Space Grid of Pitch Capsules (Sharp Borders) ── */}
        {loading && pitches.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-200 rounded-sm max-w-md mx-auto shadow-sm">
            <div className="w-16 h-16 bg-[#09daed]/10 border border-[#09daed]/30 flex items-center justify-center rounded-sm mx-auto mb-4 text-[#09daed]">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="text-gray-950 font-bold text-lg mb-2">Scanning Startup Cosmos...</h3>
            <p className="text-slate-500 text-sm max-w-[280px] mx-auto leading-relaxed">
              Fetching pitch reels and startup stars. Please wait a moment.
            </p>
          </div>
        ) : filteredAndSortedPitches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedPitches.map((pitch) => {
              const publicUrl = pitch.slug
                ? `/p/${pitch.slug}-${pitch.projectId}`
                : `/p/${pitch.projectId}`;
              return (
                <Link
                  key={pitch.projectId}
                  to={publicUrl}
                  className="group block"
                >
                  <div
                    className="relative bg-white rounded-xl border border-slate-200/80 hover:border-[#09daed]/50 overflow-hidden hover:shadow-[0_12px_32px_rgba(9,218,237,0.12)] hover:-translate-y-1.5 active:scale-[0.98] transition-all duration-300 flex flex-col h-full"
                    style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
                  >
                    {/* Top cyan scanning line on hover */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent group-hover:bg-gradient-to-r group-hover:from-[#09daed] group-hover:via-[#7c3aed] group-hover:to-[#09daed] transition-all duration-500 z-20" />

                    {/* Cover Image / Video Thumbnail Frame Area */}
                    <div className="relative h-44 overflow-hidden bg-slate-900">
                      {pitch.coverImageUrl ? (
                        <>
                          <img
                            src={pitch.coverImageUrl}
                            alt={pitch.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
                        </>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#0b172a] via-[#102a45] to-[#0f172a] flex items-center justify-center relative overflow-hidden">
                          {/* Background Grid Pattern inside thumbnail */}
                          <div
                            className="absolute inset-0 opacity-15"
                            style={{
                              backgroundImage: `linear-gradient(#09daed 1px, transparent 1px), linear-gradient(90deg, #09daed 1px, transparent 1px)`,
                              backgroundSize: "20px 20px",
                            }}
                          />

                          {/* Central Glowing Play Reel Orb */}
                          <div className="relative z-10 w-12 h-12 rounded-full bg-[#09daed]/10 border border-[#09daed]/40 flex items-center justify-center shadow-[0_0_20px_rgba(9,218,237,0.25)] group-hover:scale-110 group-hover:bg-[#09daed] group-hover:text-black transition-all duration-300 text-[#09daed]">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>

                          {/* Bottom subtle gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
                        </div>
                      )}

                      {/* Top Badges Overlay */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                        {pitch.elevatorPitchDuration && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/20 text-white shadow-sm flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-[#09daed]" />
                            {formatDuration(pitch.elevatorPitchDuration)}
                          </span>
                        )}
                        <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#09daed] text-black uppercase shadow-sm">
                          PITCH
                        </span>
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-5 flex-1 flex flex-col justify-between bg-white">
                      <div>
                        {/* Title */}
                        <h3 className="font-extrabold text-base text-gray-950 group-hover:text-[#09daed] transition-colors mb-2 line-clamp-1 leading-snug">
                          {pitch.title}
                        </h3>

                        {/* Summary */}
                        <p className="text-xs text-gray-600 mb-4 line-clamp-2 leading-relaxed font-medium">
                          {pitch.oneLineSummary || "No description provided."}
                        </p>
                      </div>

                      {/* Footer Info & Founder Avatar */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#09daed]/20 to-blue-600/20 border border-[#09daed]/30 flex items-center justify-center text-gray-900 text-xs font-extrabold shrink-0 shadow-xs">
                            {pitch.authorName?.[0]?.toUpperCase() || "N"}
                          </div>
                          <span className="text-xs text-gray-700 font-semibold truncate">
                            {pitch.authorName || "Founder"}
                          </span>
                        </div>

                        <div className="w-8 h-8 rounded-full bg-[#09daed]/10 border border-[#09daed]/30 flex items-center justify-center text-[#09daed] group-hover:bg-[#09daed] group-hover:text-black group-hover:shadow-[0_0_12px_rgba(9,218,237,0.4)] transition-all duration-300 shrink-0">
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* Empty / Searching State */
          <div className="text-center py-20 bg-white border border-gray-200 rounded-sm max-w-md mx-auto shadow-sm">
            <div className="w-16 h-16 bg-[#09daed]/5 border border-[#09daed]/20 flex items-center justify-center rounded-sm mx-auto mb-4 text-[#09daed]">
              <Star className="w-8 h-8" />
            </div>
            <h3 className="text-gray-950 font-bold text-lg mb-2">No Pitch Stars Found</h3>
            <p className="text-slate-500 text-sm max-w-[280px] mx-auto leading-relaxed">
              We couldn't locate any pitches matching your cosmic search coordinate. Try another name or topic.
            </p>
          </div>
        )}

        {/* ── Load More / Orbit Expansion (Sharp button) ── */}
        {hasMore && (
          <div className="text-center mt-16">
            <button
              onClick={loadMore}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-[#09daed] text-gray-700 hover:text-black font-bold px-8 py-3.5 rounded-sm transition-all shadow-sm hover:shadow-md disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#09daed]" />
                  Expanding Orbit...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-500 animate-bounce" />
                  Load More Pitches
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
