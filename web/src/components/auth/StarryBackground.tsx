"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  angle: number;
  active: boolean;
}

interface FloatingOrb {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  hue: number;
  opacity: number;
}

interface CosmicDust {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedY: number;
  drift: number;
}

export default function StarryBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const orbsRef = useRef<FloatingOrb[]>([]);
  const dustRef = useRef<CosmicDust[]>([]);
  const animationRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        initElements();
      }
    };

    const initElements = () => {
      // Initialize stars with different colors
      const starCount = Math.floor((canvas.width * canvas.height) / 2000);
      starsRef.current = [];
      const starColors = [
        "255, 255, 255",
        "200, 220, 255",
        "255, 200, 200",
        "200, 255, 220",
        "220, 200, 255",
      ];

      for (let i = 0; i < starCount; i++) {
        starsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2.5 + 0.5,
          opacity: Math.random() * 0.9 + 0.1,
          twinkleSpeed: Math.random() * 0.04 + 0.01,
          twinklePhase: Math.random() * Math.PI * 2,
          color: starColors[Math.floor(Math.random() * starColors.length)],
        });
      }

      // Initialize shooting stars
      shootingStarsRef.current = [];
      for (let i = 0; i < 5; i++) {
        shootingStarsRef.current.push({
          x: 0, y: 0, length: 0, speed: 0, opacity: 0, angle: 0, active: false,
        });
      }

      // Initialize floating orbs
      orbsRef.current = [];
      for (let i = 0; i < 6; i++) {
        orbsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 80 + 40,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: (Math.random() - 0.5) * 0.3,
          hue: Math.random() * 60 + 220, // Blue to purple range
          opacity: Math.random() * 0.15 + 0.05,
        });
      }

      // Initialize cosmic dust
      dustRef.current = [];
      for (let i = 0; i < 50; i++) {
        dustRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.2,
          speedY: Math.random() * 0.3 + 0.1,
          drift: Math.random() * 0.5 - 0.25,
        });
      }
    };

    const createShootingStar = () => {
      const inactiveStar = shootingStarsRef.current.find((s) => !s.active);
      if (inactiveStar) {
        inactiveStar.x = Math.random() * canvas.width * 0.7;
        inactiveStar.y = Math.random() * canvas.height * 0.4;
        inactiveStar.length = Math.random() * 120 + 60;
        inactiveStar.speed = Math.random() * 12 + 8;
        inactiveStar.opacity = 1;
        inactiveStar.angle = Math.PI / 4 + (Math.random() * 0.3 - 0.15);
        inactiveStar.active = true;
      }
    };

    const drawBackground = (time: number) => {
      // Deep space gradient
      const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGradient.addColorStop(0, "rgb(5, 5, 20)");
      bgGradient.addColorStop(0.5, "rgb(10, 10, 35)");
      bgGradient.addColorStop(1, "rgb(5, 15, 30)");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const drawNebulae = (time: number) => {
      // Main purple nebula
      const nebula1 = ctx.createRadialGradient(
        canvas.width * 0.3 + Math.sin(time * 0.0002) * 50,
        canvas.height * 0.3 + Math.cos(time * 0.00015) * 40,
        0,
        canvas.width * 0.3,
        canvas.height * 0.3,
        canvas.width * 0.6
      );
      nebula1.addColorStop(0, "rgba(139, 92, 246, 0.25)");
      nebula1.addColorStop(0.3, "rgba(99, 102, 241, 0.15)");
      nebula1.addColorStop(0.6, "rgba(79, 70, 229, 0.08)");
      nebula1.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = nebula1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Blue nebula
      const nebula2 = ctx.createRadialGradient(
        canvas.width * 0.7 + Math.cos(time * 0.00025) * 40,
        canvas.height * 0.6 + Math.sin(time * 0.0002) * 50,
        0,
        canvas.width * 0.7,
        canvas.height * 0.6,
        canvas.width * 0.5
      );
      nebula2.addColorStop(0, "rgba(59, 130, 246, 0.2)");
      nebula2.addColorStop(0.4, "rgba(37, 99, 235, 0.1)");
      nebula2.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = nebula2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Cyan accent nebula
      const nebula3 = ctx.createRadialGradient(
        canvas.width * 0.5 + Math.sin(time * 0.00018) * 60,
        canvas.height * 0.8,
        0,
        canvas.width * 0.5,
        canvas.height * 0.8,
        canvas.width * 0.4
      );
      nebula3.addColorStop(0, "rgba(34, 211, 238, 0.12)");
      nebula3.addColorStop(0.5, "rgba(6, 182, 212, 0.06)");
      nebula3.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = nebula3;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Pink/magenta accent
      const nebula4 = ctx.createRadialGradient(
        canvas.width * 0.2 + Math.cos(time * 0.0003) * 30,
        canvas.height * 0.7 + Math.sin(time * 0.00025) * 25,
        0,
        canvas.width * 0.2,
        canvas.height * 0.7,
        canvas.width * 0.3
      );
      nebula4.addColorStop(0, "rgba(236, 72, 153, 0.15)");
      nebula4.addColorStop(0.5, "rgba(219, 39, 119, 0.08)");
      nebula4.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = nebula4;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const drawFloatingOrbs = (time: number) => {
      orbsRef.current.forEach((orb) => {
        // Update position
        orb.x += orb.speedX;
        orb.y += orb.speedY;

        // Bounce off edges
        if (orb.x < -orb.size) orb.x = canvas.width + orb.size;
        if (orb.x > canvas.width + orb.size) orb.x = -orb.size;
        if (orb.y < -orb.size) orb.y = canvas.height + orb.size;
        if (orb.y > canvas.height + orb.size) orb.y = -orb.size;

        // Pulsing effect
        const pulse = Math.sin(time * 0.001 + orb.hue) * 0.3 + 1;
        const currentSize = orb.size * pulse;
        const currentOpacity = orb.opacity * (0.7 + Math.sin(time * 0.0015 + orb.hue) * 0.3);

        // Draw orb with glow
        const gradient = ctx.createRadialGradient(
          orb.x, orb.y, 0,
          orb.x, orb.y, currentSize
        );
        gradient.addColorStop(0, `hsla(${orb.hue}, 80%, 60%, ${currentOpacity})`);
        gradient.addColorStop(0.4, `hsla(${orb.hue}, 70%, 50%, ${currentOpacity * 0.5})`);
        gradient.addColorStop(1, `hsla(${orb.hue}, 60%, 40%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const drawStars = (time: number) => {
      starsRef.current.forEach((star) => {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
        const currentOpacity = star.opacity * (0.4 + twinkle * 0.6);

        // Star glow
        const gradient = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, star.size * 4
        );
        gradient.addColorStop(0, `rgba(${star.color}, ${currentOpacity})`);
        gradient.addColorStop(0.3, `rgba(${star.color}, ${currentOpacity * 0.4})`);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 4, 0, Math.PI * 2);
        ctx.fill();

        // Star core with cross sparkle for larger stars
        if (star.size > 1.5) {
          const sparkleSize = star.size * 6 * (0.5 + twinkle * 0.5);
          ctx.strokeStyle = `rgba(${star.color}, ${currentOpacity * 0.5})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(star.x - sparkleSize, star.y);
          ctx.lineTo(star.x + sparkleSize, star.y);
          ctx.moveTo(star.x, star.y - sparkleSize);
          ctx.lineTo(star.x, star.y + sparkleSize);
          ctx.stroke();
        }

        // Bright center
        ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const drawCosmicDust = (time: number) => {
      dustRef.current.forEach((particle) => {
        // Update position - slow falling with drift
        particle.y += particle.speedY;
        particle.x += Math.sin(time * 0.001 + particle.y * 0.01) * particle.drift;

        // Reset when out of bounds
        if (particle.y > canvas.height) {
          particle.y = -10;
          particle.x = Math.random() * canvas.width;
        }

        // Draw particle
        const opacity = particle.opacity * (0.5 + Math.sin(time * 0.002 + particle.x) * 0.5);
        ctx.fillStyle = `rgba(180, 200, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const drawShootingStars = () => {
      shootingStarsRef.current.forEach((star) => {
        if (!star.active) return;

        const endX = star.x + Math.cos(star.angle) * star.length;
        const endY = star.y + Math.sin(star.angle) * star.length;

        // Draw trail with gradient
        const gradient = ctx.createLinearGradient(star.x, star.y, endX, endY);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity})`);
        gradient.addColorStop(0.2, `rgba(180, 200, 255, ${star.opacity * 0.8})`);
        gradient.addColorStop(0.5, `rgba(139, 92, 246, ${star.opacity * 0.4})`);
        gradient.addColorStop(1, "rgba(79, 70, 229, 0)");

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Bright head with glow
        const headGlow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, 8);
        headGlow.addColorStop(0, `rgba(255, 255, 255, ${star.opacity})`);
        headGlow.addColorStop(0.5, `rgba(200, 220, 255, ${star.opacity * 0.5})`);
        headGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = headGlow;
        ctx.beginPath();
        ctx.arc(star.x, star.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Update
        star.x += Math.cos(star.angle) * star.speed;
        star.y += Math.sin(star.angle) * star.speed;
        star.opacity -= 0.008;

        if (star.x > canvas.width || star.y > canvas.height || star.opacity <= 0) {
          star.active = false;
        }
      });
    };

    const animate = (timestamp: number) => {
      drawBackground(timestamp);
      drawNebulae(timestamp);
      drawFloatingOrbs(timestamp);
      drawCosmicDust(timestamp);
      drawStars(timestamp);
      drawShootingStars();

      // Spawn shooting stars more frequently
      if (Math.random() < 0.008) {
        createShootingStar();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Overlay gradients for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/30" />

      {/* Animated glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] animate-aurora-1" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-blue-500/25 rounded-full blur-[60px] animate-aurora-2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-indigo-500/15 rounded-full blur-[100px] animate-aurora-3" />
        <div className="absolute bottom-1/4 left-1/3 w-40 h-40 bg-cyan-500/20 rounded-full blur-[50px] animate-aurora-1" style={{ animationDelay: "-5s" }} />
      </div>

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
        <div className="text-center space-y-5 animate-fade-in-up max-w-md">
          {/* Logo/Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-lg shadow-purple-500/10">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400"></span>
            </span>
            <span className="text-sm font-medium tracking-wide">AI 创作平台</span>
          </div>

          {/* Main heading */}
          <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent drop-shadow-lg">
              探索无限创意
            </span>
          </h2>

          {/* Subtitle */}
          <p className="text-white/60 text-base md:text-lg max-w-sm mx-auto leading-relaxed">
            AI驱动的TikTok电商视频创作平台
            <br />
            <span className="text-white/80">让每一个创意都能闪耀</span>
          </p>

          {/* Feature highlights */}
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            {[
              { icon: "✨", text: "AI视频生成" },
              { icon: "🎯", text: "智能达人匹配" },
              { icon: "🚀", text: "一键批量创作" },
            ].map((feature, i) => (
              <div
                key={feature.text}
                className="group flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300 cursor-default"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <span className="text-base group-hover:scale-110 transition-transform">{feature.icon}</span>
                <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Decorative elements */}
          <div className="flex justify-center gap-2 pt-6">
            <div className="w-12 h-1 rounded-full bg-gradient-to-r from-purple-500 to-transparent" />
            <div className="w-8 h-1 rounded-full bg-gradient-to-r from-blue-500 to-transparent" />
            <div className="w-4 h-1 rounded-full bg-gradient-to-r from-cyan-500 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
