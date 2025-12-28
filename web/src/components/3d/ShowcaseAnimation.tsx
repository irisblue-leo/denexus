"use client";

import { useEffect, useRef, useCallback } from "react";

interface ShowcaseAnimationProps {
  activeIndex: number;
  scrollProgress: number;
}

// Color themes for each section
const colorThemes = [
  { primary: "#8B5CF6", secondary: "#A78BFA", accent: "#C4B5FD" }, // Purple
  { primary: "#3B82F6", secondary: "#60A5FA", accent: "#93C5FD" }, // Blue
  { primary: "#10B981", secondary: "#34D399", accent: "#6EE7B7" }, // Green
  { primary: "#F59E0B", secondary: "#FBBF24", accent: "#FCD34D" }, // Orange
  { primary: "#EC4899", secondary: "#F472B6", accent: "#F9A8D4" }, // Pink
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  originalX: number;
  originalY: number;
}

export default function ShowcaseAnimation({ activeIndex, scrollProgress }: ShowcaseAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const themeRef = useRef(colorThemes[0]);

  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    const numParticles = 80;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    for (let i = 0; i < numParticles; i++) {
      // Create particles in a circular pattern
      const angle = (i / numParticles) * Math.PI * 2;
      const r = radius * (0.5 + Math.random() * 0.5);
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;

      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: 2 + Math.random() * 3,
        originalX: x,
        originalY: y,
      });
    }

    // Add some central particles
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius * 0.3;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;

      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 3 + Math.random() * 4,
        originalX: x,
        originalY: y,
      });
    }

    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    themeRef.current = colorThemes[activeIndex] || colorThemes[0];
  }, [activeIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;

    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * 2;
      canvas.height = height * 2;
      ctx.scale(2, 2);
      initParticles(width, height);
    };

    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    canvas.addEventListener("mousemove", handleMouseMove);

    let time = 0;

    const animate = () => {
      time += 0.01;
      ctx.clearRect(0, 0, width, height);

      const theme = themeRef.current;
      const particles = particlesRef.current;
      const centerX = width / 2;
      const centerY = height / 2;

      // Draw background glow
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, width * 0.4);
      gradient.addColorStop(0, theme.accent + "20");
      gradient.addColorStop(0.5, theme.secondary + "10");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Update and draw particles
      particles.forEach((p, i) => {
        // Gentle floating motion
        p.x += p.vx + Math.sin(time + i * 0.1) * 0.3;
        p.y += p.vy + Math.cos(time + i * 0.1) * 0.3;

        // Return to original position
        const dx = p.originalX - p.x;
        const dy = p.originalY - p.y;
        p.x += dx * 0.01;
        p.y += dy * 0.01;

        // Mouse interaction
        const mx = mouseRef.current.x - p.x;
        const my = mouseRef.current.y - p.y;
        const md = Math.sqrt(mx * mx + my * my);
        if (md < 100) {
          const force = (100 - md) / 100;
          p.x -= mx * force * 0.02;
          p.y -= my * force * 0.02;
        }

        // Boundary check
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      });

      // Draw connections
      ctx.strokeStyle = theme.primary + "30";
      ctx.lineWidth = 1;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 80) {
            const opacity = (1 - dist / 80) * 0.5;
            ctx.strokeStyle = theme.primary + Math.floor(opacity * 255).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles with glow
      particles.forEach((p, i) => {
        // Outer glow
        const glowGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
        glowGradient.addColorStop(0, theme.primary + "40");
        glowGradient.addColorStop(1, "transparent");
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
        ctx.fill();

        // Inner particle
        const particleGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        particleGradient.addColorStop(0, theme.accent);
        particleGradient.addColorStop(0.5, theme.secondary);
        particleGradient.addColorStop(1, theme.primary);
        ctx.fillStyle = particleGradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw central rotating rings
      const numRings = 3;
      for (let r = 0; r < numRings; r++) {
        const ringRadius = 60 + r * 40;
        const rotation = time * (0.5 - r * 0.1) + r * Math.PI / 3;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);

        // Draw dashed ring
        ctx.strokeStyle = theme.primary + "40";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 10]);
        ctx.beginPath();
        ctx.ellipse(0, 0, ringRadius, ringRadius * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw orbiting dots on ring
        const numDots = 4 + r * 2;
        for (let d = 0; d < numDots; d++) {
          const angle = (d / numDots) * Math.PI * 2 + time * (1 - r * 0.2);
          const dotX = Math.cos(angle) * ringRadius;
          const dotY = Math.sin(angle) * ringRadius * 0.3;

          ctx.fillStyle = theme.accent;
          ctx.beginPath();
          ctx.arc(dotX, dotY, 2 + r, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // Draw central core
      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 30);
      coreGradient.addColorStop(0, theme.accent);
      coreGradient.addColorStop(0.3, theme.secondary + "80");
      coreGradient.addColorStop(0.7, theme.primary + "40");
      coreGradient.addColorStop(1, "transparent");
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30 + Math.sin(time * 2) * 5, 0, Math.PI * 2);
      ctx.fill();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, [initParticles]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="relative w-full aspect-square max-w-[500px]">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ contain: "layout paint size" }}
        />
      </div>
    </div>
  );
}
