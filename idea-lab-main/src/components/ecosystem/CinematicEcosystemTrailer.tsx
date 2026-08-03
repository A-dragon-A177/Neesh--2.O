import React, { useState } from 'react';
import { Play, Pause, Monitor, Sparkles, Sliders, Volume2, Eye } from 'lucide-react';
import { soundFx } from '@/utils/CinematicAudioSynthesizer';

export const CinematicEcosystemTrailer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [glitchFx, setGlitchFx] = useState<boolean>(false);
  const [scanlineFx, setScanlineFx] = useState<boolean>(true);
  const [lensFlareFx, setLensFlareFx] = useState<boolean>(true);
  const [colorFilter, setColorFilter] = useState<'neon' | 'cyber' | 'mono'>('neon');

  const handlePlayToggle = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (nextState) {
      soundFx.playWarpBoom();
      soundFx.playSubBassDrop();
    } else {
      soundFx.playHoloBeep(440);
    }
  };

  const handleToggleFx = (type: string) => {
    soundFx.playHoloBeep(920);
    if (type === 'glitch') setGlitchFx(!glitchFx);
    if (type === 'scanline') setScanlineFx(!scanlineFx);
    if (type === 'flare') setLensFlareFx(!lensFlareFx);
  };

  const handleCycleColor = () => {
    soundFx.playLaserPulse();
    if (colorFilter === 'neon') setColorFilter('cyber');
    else if (colorFilter === 'cyber') setColorFilter('mono');
    else setColorFilter('neon');
  };

  return (
    <section className="relative py-20 px-4 bg-slate-950 border-t border-slate-900 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Title */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-[#09daed] tracking-widest uppercase mb-1 flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-[#09daed]" />
              CINEMATIC TRAILER & VFX STUDIO
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white font-display">
              The Ecosystem in Motion
            </h2>
          </div>

          {/* VFX Post-Processing Controls */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
            <span className="text-xs font-mono text-slate-400 px-2 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-[#09daed]" />
              VFX LAYERS:
            </span>

            <button
              onClick={() => handleToggleFx('scanline')}
              className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                scanlineFx
                  ? 'bg-[#09daed]/20 text-[#09daed] border-[#09daed]/50'
                  : 'bg-slate-950 text-slate-500 border-slate-800'
              }`}
            >
              SCANLINES
            </button>

            <button
              onClick={() => handleToggleFx('flare')}
              className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                lensFlareFx
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                  : 'bg-slate-950 text-slate-500 border-slate-800'
              }`}
            >
              LENS FLARE
            </button>

            <button
              onClick={() => handleToggleFx('glitch')}
              className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                glitchFx
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                  : 'bg-slate-950 text-slate-500 border-slate-800'
              }`}
            >
              GLITCH
            </button>

            <button
              onClick={handleCycleColor}
              className="px-2.5 py-1 text-xs font-mono rounded border bg-sky-950 text-[#09daed] border-[#09daed]/50 hover:bg-sky-900"
            >
              COLOR: {colorFilter.toUpperCase()}
            </button>
          </div>
        </div>

        {/* 2.39:1 Anamorphic Movie Viewport Container */}
        <div className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden border border-[#09daed]/40 shadow-[0_0_60px_rgba(9,218,237,0.15)] bg-slate-950 group">
          {/* Main Cinematic Poster Image */}
          <img
            src="/images/ecosystem_trailer_thumb.png"
            alt="Neesh AI Innovation Ecosystem Cinematic Trailer"
            className={`w-full h-full object-cover transition-all duration-700 ${
              isPlaying ? 'scale-105 filter brightness-110' : 'brightness-75'
            } ${colorFilter === 'cyber' ? 'hue-rotate-180' : ''} ${
              colorFilter === 'mono' ? 'grayscale contrast-125' : ''
            } ${glitchFx ? 'animate-pulse skew-x-1' : ''}`}
          />

          {/* Anamorphic Blue Lens Flare Streak */}
          {lensFlareFx && (
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#09daed] to-transparent blur-md opacity-80 pointer-events-none transform -translate-y-1/2" />
          )}

          {/* Scanline CRT Overlay */}
          {scanlineFx && (
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none z-10 opacity-70" />
          )}

          {/* Holographic Movie HUD Overlays */}
          <div className="absolute inset-0 p-6 flex flex-col justify-between z-20 pointer-events-none">
            {/* Top HUD Bar */}
            <div className="flex items-center justify-between text-xs font-mono text-[#09daed]/90">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded border border-[#09daed]/30">
                  <Monitor className="w-3.5 h-3.5 text-[#09daed]" />
                  CAM 01 // 4K 60FPS
                </span>
                <span className="hidden sm:inline-block text-slate-400">
                  ASPECT: 2.39:1 ANAMORPHIC
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#09daed] animate-ping" />
                <span className="text-[#09daed] font-bold">REC</span>
              </div>
            </div>

            {/* Center Play/Pause Trigger Button */}
            <div className="self-center pointer-events-auto">
              <button
                onClick={handlePlayToggle}
                className="w-20 h-20 rounded-full bg-[#09daed]/20 hover:bg-[#09daed]/40 border border-[#09daed]/80 flex items-center justify-center text-white backdrop-blur-md shadow-[0_0_40px_rgba(9,218,237,0.5)] transition-all duration-300 hover:scale-110"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-[#09daed] fill-[#09daed]" />
                ) : (
                  <Play className="w-8 h-8 text-[#09daed] fill-[#09daed] ml-1" />
                )}
              </button>
            </div>

            {/* Bottom HUD Bar */}
            <div className="flex items-end justify-between text-xs font-mono text-slate-300">
              <div>
                <div className="text-[#09daed] font-bold text-sm md:text-base font-display">
                  NEESH AI // THE INNOVATION ECOSYSTEM
                </div>
                <div className="text-slate-400 text-xs font-sans">
                  Where Ideas Create Gravity & Opportunities Collide
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => soundFx.playSubBassDrop()}
                  className="pointer-events-auto px-3 py-1.5 bg-slate-950/80 hover:bg-sky-950 border border-[#09daed]/40 rounded text-[#09daed] flex items-center gap-1.5 transition-colors font-mono"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  SUB-BASS DROP
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default CinematicEcosystemTrailer;
