import React, { useEffect, useRef } from 'react';

export const EcosystemGravityCore3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const isMobile = window.innerWidth < 640;
    let width = (canvas.width = container.clientWidth);
    let height = (canvas.height = isMobile ? 280 : 480);

    const handleResize = () => {
      if (!canvas || !container) return;
      const mobile = window.innerWidth < 640;
      width = canvas.width = container.clientWidth;
      height = canvas.height = mobile ? 280 : 480;
    };
    window.addEventListener('resize', handleResize);

    // Reduce particle count on mobile for performance
    const particleCount = isMobile ? 100 : 220;
    const particles: {
      radius: number;
      angle: number;
      speed: number;
      yOffset: number;
      size: number;
      color: string;
      alpha: number;
    }[] = [];

    const colors = ['#09daed', '#0ea5e9', '#38bdf8', '#0284c7', '#60a5fa', '#ffffff'];

    for (let i = 0; i < particleCount; i++) {
      const maxOrbit = isMobile ? 140 : 190;
      const baseOrbit = isMobile ? 80 : 130;
      particles.push({
        radius: baseOrbit + Math.random() * maxOrbit,
        angle: Math.random() * Math.PI * 2,
        speed: (Math.random() * 0.012 + 0.003) * (Math.random() > 0.5 ? 1 : -1),
        yOffset: (Math.random() - 0.5) * (isMobile ? 50 : 90),
        size: Math.random() * (isMobile ? 2 : 2.5) + 0.6,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.7 + 0.3,
      });
    }

    let rotationAngle = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const centerX = width / 2;
      const centerY = height / 2;
      const planetRadius = isMobile ? 55 : 95;

      rotationAngle += 0.008;

      // 1. Draw Outer Starfield & Gravitational Dust
      particles.forEach((p) => {
        p.angle += p.speed;
        const x = centerX + Math.cos(p.angle) * p.radius;
        const y = centerY + Math.sin(p.angle) * (p.radius * 0.45) + p.yOffset;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = isMobile ? 5 : 10;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 2. Draw Planetary Saturn Ring (Back Section)
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, planetRadius * 2.1, planetRadius * 0.65, -0.2, Math.PI, Math.PI * 2);
      ctx.strokeStyle = 'rgba(9, 218, 237, 0.4)';
      ctx.lineWidth = isMobile ? 8 : 14;
      ctx.shadowColor = '#09daed';
      ctx.shadowBlur = isMobile ? 12 : 25;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(centerX, centerY, planetRadius * 1.8, planetRadius * 0.55, -0.2, Math.PI, Math.PI * 2);
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.6)';
      ctx.lineWidth = isMobile ? 2 : 4;
      ctx.stroke();
      ctx.restore();

      // 3. Render Realistic 3D Sci-Fi Planet Atmosphere Outer Glow
      const atmosphereGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        planetRadius * 0.8,
        centerX,
        centerY,
        planetRadius * 1.45
      );
      atmosphereGlow.addColorStop(0, 'rgba(9, 218, 237, 0.5)');
      atmosphereGlow.addColorStop(0.5, 'rgba(14, 165, 233, 0.25)');
      atmosphereGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.save();
      ctx.fillStyle = atmosphereGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, planetRadius * 1.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 4. Render Realistic 3D Planet Body (Specular Spherical Shading)
      const lightX = centerX - planetRadius * 0.4;
      const lightY = centerY - planetRadius * 0.4;
      const planetGradient = ctx.createRadialGradient(
        lightX,
        lightY,
        5,
        centerX,
        centerY,
        planetRadius
      );
      planetGradient.addColorStop(0, '#5eead4');
      planetGradient.addColorStop(0.2, '#09daed');
      planetGradient.addColorStop(0.55, '#0284c7');
      planetGradient.addColorStop(0.85, '#075985');
      planetGradient.addColorStop(1, '#021329');

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, planetRadius, 0, Math.PI * 2);
      ctx.fillStyle = planetGradient;
      ctx.shadowColor = '#09daed';
      ctx.shadowBlur = isMobile ? 18 : 35;
      ctx.fill();
      ctx.clip();

      // 5. Draw Realistic Rotating Planet Surface Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1;

      for (let i = -3; i <= 3; i++) {
        const offset = i * (isMobile ? 18 : 28) + (rotationAngle * 30) % (isMobile ? 18 : 28);
        ctx.beginPath();
        ctx.ellipse(centerX + offset - (isMobile ? 9 : 14), centerY, Math.abs(offset) * 0.8 + (isMobile ? 5 : 8), planetRadius, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (let y = -planetRadius + 20; y < planetRadius; y += (isMobile ? 20 : 30)) {
        ctx.beginPath();
        const rAtY = Math.sqrt(planetRadius * planetRadius - y * y);
        ctx.ellipse(centerX, centerY + y * 0.6, rAtY, rAtY * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      const surfaceNodes = [
        { u: 0.3, v: -0.2 },
        { u: -0.4, v: 0.3 },
        { u: 0.1, v: 0.5 },
        { u: -0.2, v: -0.4 },
        { u: 0.5, v: 0.1 },
      ];

      surfaceNodes.forEach((node, idx) => {
        const nx = centerX + node.u * planetRadius * Math.cos(rotationAngle + idx);
        const ny = centerY + node.v * planetRadius;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#09daed';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(nx, ny, isMobile ? 2 : 3, 0, Math.PI * 2);
        ctx.fill();
      });

      const shadowGrad = ctx.createLinearGradient(
        centerX - planetRadius,
        centerY - planetRadius,
        centerX + planetRadius,
        centerY + planetRadius
      );
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      shadowGrad.addColorStop(0.65, 'rgba(2, 19, 41, 0.4)');
      shadowGrad.addColorStop(1, 'rgba(1, 10, 22, 0.85)');

      ctx.fillStyle = shadowGrad;
      ctx.fillRect(centerX - planetRadius, centerY - planetRadius, planetRadius * 2, planetRadius * 2);

      ctx.restore();

      // 6. Draw Planetary Saturn Ring (Front Section)
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, planetRadius * 2.1, planetRadius * 0.65, -0.2, 0, Math.PI);
      ctx.strokeStyle = 'rgba(9, 218, 237, 0.85)';
      ctx.lineWidth = isMobile ? 7 : 12;
      ctx.shadowColor = '#09daed';
      ctx.shadowBlur = isMobile ? 10 : 20;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(centerX, centerY, planetRadius * 1.8, planetRadius * 0.55, -0.2, 0, Math.PI);
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.9)';
      ctx.lineWidth = isMobile ? 2 : 3;
      ctx.stroke();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-[280px] sm:h-[480px] relative flex items-center justify-center overflow-hidden">
      {/* Realistic 3D Sci-Fi Planet Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10" />
    </div>
  );
};

export default EcosystemGravityCore3D;
