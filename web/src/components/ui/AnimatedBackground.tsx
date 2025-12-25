"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

// Canvas-based particle animation for hero section
export function ParticleBackground({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize particles
    const colors = ["#6366f1", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4"];
    const particleCount = 50;

    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.5 + 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity;
        ctx.fill();
      });

      // Draw connections between nearby particles
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 0.5;

      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const dx = particlesRef.current[i].x - particlesRef.current[j].x;
          const dy = particlesRef.current[i].y - particlesRef.current[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(particlesRef.current[i].x, particlesRef.current[i].y);
            ctx.lineTo(particlesRef.current[j].x, particlesRef.current[j].y);
            ctx.globalAlpha = 0.1 * (1 - distance / 150);
            ctx.stroke();
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 -z-10 ${className}`}
      style={{ opacity: 0.6 }}
    />
  );
}

// Floating orbs background
export function FloatingOrbs() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Large animated blobs */}
      <div className="absolute top-0 -left-40 w-80 h-80 bg-primary-400/30 dark:bg-primary-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob" />
      <div className="absolute top-0 -right-40 w-80 h-80 bg-accent-400/30 dark:bg-accent-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob" style={{ animationDelay: "2s" }} />
      <div className="absolute -bottom-40 left-20 w-80 h-80 bg-purple-400/30 dark:bg-purple-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob" style={{ animationDelay: "4s" }} />
      <div className="absolute bottom-40 right-20 w-60 h-60 bg-pink-400/20 dark:bg-pink-600/15 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob" style={{ animationDelay: "6s" }} />
    </div>
  );
}

// Grid pattern with gradient mask
export function GridPattern({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 -z-10 ${className}`}>
      <div
        className="absolute inset-0 opacity-30 dark:opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: "4rem 4rem",
          maskImage: "radial-gradient(ellipse 80% 50% at 50% 0%, black 70%, transparent 110%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 50% at 50% 0%, black 70%, transparent 110%)",
        }}
      />
    </div>
  );
}

// Animated gradient mesh
export function GradientMesh({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 -z-10 overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 animate-gradient"
        style={{
          background: `
            radial-gradient(at 40% 20%, hsla(243, 75%, 59%, 0.15) 0px, transparent 50%),
            radial-gradient(at 80% 0%, hsla(160, 84%, 39%, 0.15) 0px, transparent 50%),
            radial-gradient(at 0% 50%, hsla(280, 75%, 59%, 0.1) 0px, transparent 50%),
            radial-gradient(at 80% 50%, hsla(340, 75%, 59%, 0.1) 0px, transparent 50%),
            radial-gradient(at 0% 100%, hsla(243, 75%, 59%, 0.15) 0px, transparent 50%),
            radial-gradient(at 80% 100%, hsla(160, 84%, 39%, 0.1) 0px, transparent 50%)
          `,
          backgroundSize: "200% 200%",
        }}
      />
    </div>
  );
}

// Animated sparkles
export function Sparkles({ count = 20, className = "" }: { count?: number; className?: string }) {
  const sparkles = Array.from({ length: count }, (_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 5}s`,
    duration: `${2 + Math.random() * 3}s`,
    size: Math.random() * 3 + 1,
  }));

  return (
    <div className={`absolute inset-0 -z-10 overflow-hidden pointer-events-none ${className}`}>
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="absolute rounded-full bg-primary-400/60 dark:bg-primary-300/40 animate-pulse"
          style={{
            top: sparkle.top,
            left: sparkle.left,
            width: sparkle.size,
            height: sparkle.size,
            animationDelay: sparkle.delay,
            animationDuration: sparkle.duration,
          }}
        />
      ))}
    </div>
  );
}

// Flowing lines animation
export function FlowingLines({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 -z-10 overflow-hidden ${className}`}>
      <svg
        className="absolute w-full h-full opacity-20 dark:opacity-10"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(243 75% 59%)" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(243 75% 59%)" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(243 75% 59%)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={`M -10 ${20 + i * 15} Q 25 ${10 + i * 15}, 50 ${25 + i * 15} T 110 ${20 + i * 15}`}
            fill="none"
            stroke="url(#line-gradient)"
            strokeWidth="0.2"
            className="animate-flow"
            style={{ animationDelay: `${i * 0.5}s` }}
          />
        ))}
      </svg>
    </div>
  );
}

// Noise texture overlay
export function NoiseOverlay({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 -z-10 opacity-[0.015] dark:opacity-[0.03] pointer-events-none ${className}`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}

// Combined hero background
export function HeroBackground() {
  return (
    <>
      <GradientMesh />
      <GridPattern />
      <FloatingOrbs />
      <Sparkles count={30} />
      <NoiseOverlay />
    </>
  );
}

// Section divider with wave
export function WaveDivider({ flip = false, className = "" }: { flip?: boolean; className?: string }) {
  return (
    <div className={`absolute ${flip ? "top-0 rotate-180" : "bottom-0"} left-0 w-full overflow-hidden leading-none ${className}`}>
      <svg
        className="relative block w-full h-12 sm:h-16"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <path
          d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
          className="fill-background"
        />
      </svg>
    </div>
  );
}
