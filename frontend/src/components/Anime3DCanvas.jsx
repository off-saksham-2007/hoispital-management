import { useEffect, useRef, useState } from 'react';
import { animate, createTimeline } from 'animejs';
import { Activity, ShieldCheck, HeartPulse, Dna, Radio } from 'lucide-react';

export default function Anime3DCanvas({ className = "w-full h-full" }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const ecgPathRef = useRef(null);
  const [bpm, setBpm] = useState(72);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Resize canvas properly for retina displays
    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // 3D Model Parameters
    const helixNodes = [];
    const numPoints = 28;
    const helixRadius = 75;
    const helixHeight = 260;

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 4;
      const y = (i / numPoints) * helixHeight - helixHeight / 2;
      helixNodes.push({
        x1: Math.cos(angle) * helixRadius,
        z1: Math.sin(angle) * helixRadius,
        x2: Math.cos(angle + Math.PI) * helixRadius,
        z2: Math.sin(angle + Math.PI) * helixRadius,
        y: y,
        baseAngle: angle,
      });
    }

    // Floating Bio-Particles in 3D sphere
    const particles = [];
    const particleCount = 45;
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const radius = 100 + Math.random() * 60;
      particles.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        baseRadius: radius,
        speed: 0.005 + Math.random() * 0.01,
        angle: Math.random() * Math.PI * 2,
        size: 1.5 + Math.random() * 2.5,
        color: Math.random() > 0.5 ? '#38bdf8' : '#34d399'
      });
    }

    // Dynamic rotation parameters controlled by Anime.js
    const animState = {
      rotY: 0,
      rotX: 0.2,
      pulse: 1,
      glowOpacity: 0.6
    };

    // Anime.js continuous timeline for 3D state
    const tl = createTimeline({ loop: true });
    tl.add(animState, {
      rotY: Math.PI * 2,
      duration: 12000,
      ease: 'linear'
    }, 0);

    tl.add(animState, {
      pulse: [1, 1.15, 1],
      glowOpacity: [0.4, 0.85, 0.4],
      duration: 2500,
      ease: 'inOutQuad'
    }, 0);

    // Mouse Tracking for Interactive 3D Parallax
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseRef.current.targetX = x * 0.6;
      mouseRef.current.targetY = y * 0.6;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    // Render loop
    const fov = 340;
    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;

      const currentRotY = animState.rotY + mouseRef.current.x;
      const currentRotX = animState.rotX - mouseRef.current.y;

      // Draw Center Energy Core Glow
      const coreGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 140 * animState.pulse);
      coreGrad.addColorStop(0, `rgba(56, 189, 248, ${animState.glowOpacity * 0.35})`);
      coreGrad.addColorStop(0.5, `rgba(16, 185, 129, ${animState.glowOpacity * 0.15})`);
      coreGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 140 * animState.pulse, 0, Math.PI * 2);
      ctx.fill();

      // Project 3D Point to 2D Screen
      const project = (x, y, z) => {
        // Rotate around Y
        const cosY = Math.cos(currentRotY);
        const sinY = Math.sin(currentRotY);
        const x1 = x * cosY - z * sinY;
        const z1 = z * cosY + x * sinY;

        // Rotate around X
        const cosX = Math.cos(currentRotX);
        const sinX = Math.sin(currentRotX);
        const y2 = y * cosX - z1 * sinX;
        const z2 = z1 * cosX + y * sinX;

        const scale = fov / (fov + z2 + 100);
        return {
          px: cx + x1 * scale,
          py: cy + y2 * scale,
          scale,
          z: z2
        };
      };

      // Draw 3D Orbit Rings
      const drawRing = (radius, tiltX, tiltZ, color, strokeWidth = 1) => {
        ctx.beginPath();
        const segments = 60;
        for (let j = 0; j <= segments; j++) {
          const theta = (j / segments) * Math.PI * 2;
          const rx = Math.cos(theta) * radius;
          const rz = Math.sin(theta) * radius;
          const ry = rx * tiltX + rz * tiltZ;
          const p = project(rx, ry, rz);
          if (j === 0) ctx.moveTo(p.px, p.py);
          else ctx.lineTo(p.px, p.py);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
      };

      drawRing(115, 0.4, 0.2, 'rgba(56, 189, 248, 0.25)', 1.2);
      drawRing(95, -0.3, 0.4, 'rgba(52, 211, 153, 0.2)', 1);

      // Render 3D DNA Double Helix Nodes and Rungs
      const projectedNodes = [];
      helixNodes.forEach((node) => {
        const p1 = project(node.x1, node.y, node.z1);
        const p2 = project(node.x2, node.y, node.z2);
        projectedNodes.push({ p1, p2, avgZ: (p1.z + p2.z) / 2 });
      });

      // Sort by depth for correct 3D occlusion
      projectedNodes.sort((a, b) => b.avgZ - a.avgZ);

      projectedNodes.forEach(({ p1, p2 }) => {
        // Draw Connecting Rung
        const rungGrad = ctx.createLinearGradient(p1.px, p1.py, p2.px, p2.py);
        rungGrad.addColorStop(0, 'rgba(56, 189, 248, 0.7)');
        rungGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
        rungGrad.addColorStop(1, 'rgba(52, 211, 153, 0.7)');

        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.strokeStyle = rungGrad;
        ctx.lineWidth = Math.max(0.8, 1.8 * ((p1.scale + p2.scale) / 2));
        ctx.stroke();

        // Node 1 (Strand A - Cyan)
        const r1 = Math.max(1.5, 4.5 * p1.scale);
        ctx.beginPath();
        ctx.arc(p1.px, p1.py, r1, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 8;
        ctx.fill();

        // Node 2 (Strand B - Emerald)
        const r2 = Math.max(1.5, 4.5 * p2.scale);
        ctx.beginPath();
        ctx.arc(p2.px, p2.py, r2, 0, Math.PI * 2);
        ctx.fillStyle = '#34d399';
        ctx.shadowColor = '#059669';
        ctx.shadowBlur = 8;
        ctx.fill();

        // Reset shadow
        ctx.shadowBlur = 0;
      });

      // Render Floating 3D Bio-Particles
      particles.forEach((part) => {
        part.angle += part.speed;
        const currentX = part.x * Math.cos(part.speed) - part.z * Math.sin(part.speed);
        const currentZ = part.z * Math.cos(part.speed) + part.x * Math.sin(part.speed);
        part.x = currentX;
        part.z = currentZ;

        const p = project(part.x, part.y, part.z);
        if (p.scale > 0) {
          ctx.beginPath();
          ctx.arc(p.px, p.py, part.size * p.scale, 0, Math.PI * 2);
          ctx.fillStyle = part.color;
          ctx.globalAlpha = Math.min(1, Math.max(0.15, p.scale * 0.9));
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Minor random variation in BPM every 3 seconds
    const bpmInterval = setInterval(() => {
      setBpm(prev => {
        const delta = Math.floor(Math.random() * 3) - 1;
        const next = prev + delta;
        return Math.max(68, Math.min(76, next));
      });
    }, 3000);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (container) container.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      clearInterval(bpmInterval);
    };
  }, []);

  // Anime.js SVG Path Animation for ECG Wave
  useEffect(() => {
    if (!ecgPathRef.current) return;
    const path = ecgPathRef.current;
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;

    const ecgAnim = animate(path, {
      strokeDashoffset: [length, 0],
      duration: 1800,
      ease: 'inOutSine',
      loop: true
    });

    return () => {
      // cleanup
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative overflow-hidden rounded-3xl group ${className}`}>
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
        style={{ minHeight: '380px' }}
      />

      {/* Floating Holographic Card 1: Live Telemetry */}
      <div className="absolute top-5 left-5 z-20 pointer-events-none">
        <div className="px-4 py-2.5 rounded-2xl bg-slate-900/85 backdrop-blur-xl border border-cyan-500/30 shadow-xl shadow-cyan-950/40 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <HeartPulse size={20} className="animate-pulse text-cyan-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Cardiology Telemetry</div>
            <div className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <span className="text-cyan-400">{bpm}</span> BPM 
              <span className="text-[10px] font-normal text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Sinus Normal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Holographic Card 2: 3D Model Specs */}
      <div className="absolute bottom-5 left-5 z-20 pointer-events-none">
        <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-2 shadow-lg">
          <Dna size={15} className="text-emerald-400 animate-spin" style={{ animationDuration: '9s' }} />
          <span>Interactive 3D Genomic Hologram</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        </div>
      </div>

      {/* Live SVG ECG Monitor Bar across bottom */}
      <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent pointer-events-none flex items-center px-4">
        <svg className="w-full h-10 overflow-visible" viewBox="0 0 500 40" fill="none">
          <path
            ref={ecgPathRef}
            d="M 0 20 L 70 20 L 85 20 L 95 8 L 105 32 L 115 5 L 125 35 L 135 20 L 220 20 L 235 20 L 245 8 L 255 32 L 265 5 L 275 35 L 285 20 L 370 20 L 385 20 L 395 8 L 405 32 L 415 5 L 425 35 L 435 20 L 500 20"
            stroke="url(#ecgGradient)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="ecgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
              <stop offset="80%" stopColor="#34d399" stopOpacity="1" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
