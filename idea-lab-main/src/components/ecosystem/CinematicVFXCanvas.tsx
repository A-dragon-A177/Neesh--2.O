import React, { useEffect, useRef } from 'react';
import { soundFx } from '@/utils/CinematicAudioSynthesizer';

interface InwardSwirlStreak {
  angle: number;
  radius: number;
  maxRadius: number;
  speed: number;
  inwardAccel: number;
  width: number;
  color: string;
  alpha: number;
}

interface BlackHolePull {
  x: number;
  y: number;
  streaks: InwardSwirlStreak[];
  coreRadius: number;
  life: number;
}

export const CinematicVFXCanvas: React.FC<{
  enableMouseShockwaves?: boolean;
  intensity?: number;
}> = ({ enableMouseShockwaves = true, intensity = 1.0 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const blackHoles: BlackHolePull[] = [];
    // Ultra-clean Neesh AI Cyan & Sky Blue Palette
    const colors = ['#09daed', '#0ea5e9', '#38bdf8', '#7dd3fc', '#e0f2fe'];

    // Subtle, clean ambient space dust specks
    const ambientDust: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }[] = [];
    for (let i = 0; i < 50; i++) {
      ambientDust.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 1.2 + 0.4,
        alpha: Math.random() * 0.5 + 0.15,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const handleClick = (e: MouseEvent) => {
      if (!enableMouseShockwaves) return;
      soundFx.playWarpBoom();

      const x = e.clientX;
      const y = e.clientY;

      // Spawn 32 Silky Smooth Inward Swirling Photonic Light Streaks
      const streaks: InwardSwirlStreak[] = [];
      for (let i = 0; i < 32; i++) {
        const startR = (65 + Math.random() * 30) * intensity;
        streaks.push({
          angle: Math.random() * Math.PI * 2,
          radius: startR,
          maxRadius: startR,
          speed: (Math.random() * 0.08 + 0.04) * (Math.random() > 0.5 ? 1 : -1),
          inwardAccel: Math.random() * 2.2 + 1.8,
          width: Math.random() * 1.5 + 0.8,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 0.9,
        });
      }

      blackHoles.push({
        x,
        y,
        streaks,
        coreRadius: 12 * intensity,
        life: 1.0,
      });
    };

    window.addEventListener('click', handleClick);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Render Subtle Ambient Space Dust
      ambientDust.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 2. Render Inward Gravitational Light Arcs & Singularity Implosion
      for (let bhIdx = blackHoles.length - 1; bhIdx >= 0; bhIdx--) {
        const bh = blackHoles[bhIdx];
        bh.life -= 0.035; // Snappy, elegant 0.3s cycle

        let activeStreaks = 0;

        bh.streaks.forEach((s) => {
          s.inwardAccel *= 1.04;
          s.radius -= s.inwardAccel;
          s.angle += s.speed;

          if (s.radius > 0) {
            activeStreaks++;

            // Current streak head position
            const headX = bh.x + Math.cos(s.angle) * s.radius;
            const headY = bh.y + Math.sin(s.angle) * (s.radius * 0.5);

            // Smooth curved tail arc behind the head
            const tailAngle = s.angle - s.speed * 2.5;
            const tailRadius = s.radius + 14;
            const tailX = bh.x + Math.cos(tailAngle) * tailRadius;
            const tailY = bh.y + Math.sin(tailAngle) * (tailRadius * 0.5);

            // Control point for smooth orbital curvature
            const ctrlAngle = (s.angle + tailAngle) / 2;
            const ctrlRadius = (s.radius + tailRadius) / 2 + 5;
            const ctrlX = bh.x + Math.cos(ctrlAngle) * ctrlRadius;
            const ctrlY = bh.y + Math.sin(ctrlAngle) * (ctrlRadius * 0.5);

            ctx.save();
            ctx.globalAlpha = Math.min(1, s.radius / 20) * s.alpha;
            ctx.strokeStyle = s.color;
            ctx.lineWidth = s.width;
            ctx.shadowColor = s.color;
            ctx.shadowBlur = 10;

            // Draw Curved Photonic Arc
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.quadraticCurveTo(ctrlX, ctrlY, headX, headY);
            ctx.stroke();

            // Fine glowing photon head
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(headX, headY, s.width * 0.9, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          }
        });

        // Render Pitch-Black Central Singularity with Soft Cyan Halo
        const currentCoreR = Math.max(0, bh.coreRadius * bh.life);

        if (currentCoreR > 0.5) {
          ctx.save();

          // Soft Glowing Photosphere Halo
          const haloGrad = ctx.createRadialGradient(
            bh.x,
            bh.y,
            currentCoreR * 0.4,
            bh.x,
            bh.y,
            currentCoreR * 2.2
          );
          haloGrad.addColorStop(0, 'rgba(9, 218, 237, 0.75)');
          haloGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.2)');
          haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = haloGrad;
          ctx.beginPath();
          ctx.arc(bh.x, bh.y, currentCoreR * 2.2, 0, Math.PI * 2);
          ctx.fill();

          // Event Horizon Pitch Black Core
          ctx.beginPath();
          ctx.arc(bh.x, bh.y, currentCoreR, 0, Math.PI * 2);
          ctx.fillStyle = '#020617';
          ctx.shadowColor = '#09daed';
          ctx.shadowBlur = 15;
          ctx.fill();

          // Crisp Photon Edge Rim
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 1.0;
          ctx.stroke();

          ctx.restore();
        }

        if (bh.life <= 0 || (activeStreaks === 0 && currentCoreR <= 0.5)) {
          blackHoles.splice(bhIdx, 1);
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('click', handleClick);
      cancelAnimationFrame(animId);
    };
  }, [enableMouseShockwaves, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-30 w-full h-full"
    />
  );
};
export default CinematicVFXCanvas;
