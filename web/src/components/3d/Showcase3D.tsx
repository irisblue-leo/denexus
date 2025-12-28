"use client";

import { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";

interface Scene3DProps {
  activeIndex: number;
  scrollProgress: number;
}

// Color themes for each section (RGB values 0-1) - Soft pastel colors
const colorThemes = [
  {
    baseColor: [0.75, 0.68, 0.92] as [number, number, number], // Soft Purple
    glowColor: [0.70, 0.65, 0.88] as [number, number, number],
    markerColor: [0.80, 0.75, 0.95] as [number, number, number],
  },
  {
    baseColor: [0.65, 0.78, 0.92] as [number, number, number], // Soft Blue
    glowColor: [0.60, 0.75, 0.88] as [number, number, number],
    markerColor: [0.70, 0.82, 0.95] as [number, number, number],
  },
  {
    baseColor: [0.65, 0.85, 0.75] as [number, number, number], // Soft Green
    glowColor: [0.60, 0.82, 0.72] as [number, number, number],
    markerColor: [0.70, 0.88, 0.78] as [number, number, number],
  },
  {
    baseColor: [0.92, 0.78, 0.65] as [number, number, number], // Soft Orange
    glowColor: [0.88, 0.75, 0.60] as [number, number, number],
    markerColor: [0.95, 0.82, 0.70] as [number, number, number],
  },
  {
    baseColor: [0.90, 0.72, 0.80] as [number, number, number], // Soft Pink
    glowColor: [0.88, 0.68, 0.78] as [number, number, number],
    markerColor: [0.95, 0.78, 0.85] as [number, number, number],
  },
];

// Major city coordinates for markers
const markers: Array<{ location: [number, number]; size: number }> = [
  { location: [37.7749, -122.4194], size: 0.08 }, // San Francisco
  { location: [40.7128, -74.0060], size: 0.1 }, // New York
  { location: [51.5074, -0.1278], size: 0.08 }, // London
  { location: [35.6762, 139.6503], size: 0.08 }, // Tokyo
  { location: [31.2304, 121.4737], size: 0.1 }, // Shanghai
  { location: [1.3521, 103.8198], size: 0.06 }, // Singapore
  { location: [-33.8688, 151.2093], size: 0.06 }, // Sydney
  { location: [48.8566, 2.3522], size: 0.07 }, // Paris
  { location: [55.7558, 37.6173], size: 0.07 }, // Moscow
  { location: [19.4326, -99.1332], size: 0.06 }, // Mexico City
  { location: [-23.5505, -46.6333], size: 0.08 }, // São Paulo
  { location: [28.6139, 77.2090], size: 0.08 }, // Delhi
];

export default function Showcase3D({ activeIndex, scrollProgress }: Scene3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const phiRef = useRef(0);
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);
  const [currentTheme, setCurrentTheme] = useState(colorThemes[0]);

  // Smoothly transition colors
  useEffect(() => {
    setCurrentTheme(colorThemes[activeIndex]);
  }, [activeIndex]);

  useEffect(() => {
    let width = 0;
    let phi = 0;

    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
      }
    };

    window.addEventListener("resize", onResize);
    onResize();

    if (!canvasRef.current) return;

    globeRef.current = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: 0,
      diffuse: 1.5,
      mapSamples: 16000,
      mapBrightness: 3,
      baseColor: currentTheme.baseColor,
      markerColor: currentTheme.markerColor,
      glowColor: currentTheme.glowColor,
      markers: markers,
      onRender: (state) => {
        // Auto rotation
        if (!pointerInteracting.current) {
          phi += 0.003;
        }
        state.phi = phi + pointerInteractionMovement.current;
        state.width = width * 2;
        state.height = width * 2;

        // Update colors smoothly
        const theme = colorThemes[activeIndex];
        state.baseColor = theme.baseColor;
        state.markerColor = theme.markerColor;
        state.glowColor = theme.glowColor;
      },
    });

    return () => {
      globeRef.current?.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Update globe colors when theme changes
  useEffect(() => {
    // Globe will pick up new colors in onRender callback
  }, [activeIndex]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="relative w-full aspect-square max-w-[500px]">
        {/* Glow effect behind globe */}
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-20 transition-colors duration-1000"
          style={{
            background: `radial-gradient(circle, rgb(${currentTheme.glowColor.map(c => Math.round(c * 255)).join(',')}), transparent 70%)`,
          }}
        />

        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          style={{
            contain: "layout paint size",
          }}
          onPointerDown={(e) => {
            pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
            if (canvasRef.current) {
              canvasRef.current.style.cursor = "grabbing";
            }
          }}
          onPointerUp={() => {
            pointerInteracting.current = null;
            if (canvasRef.current) {
              canvasRef.current.style.cursor = "grab";
            }
          }}
          onPointerOut={() => {
            pointerInteracting.current = null;
            if (canvasRef.current) {
              canvasRef.current.style.cursor = "grab";
            }
          }}
          onMouseMove={(e) => {
            if (pointerInteracting.current !== null) {
              const delta = e.clientX - pointerInteracting.current;
              pointerInteractionMovement.current = delta / 100;
            }
          }}
          onTouchMove={(e) => {
            if (pointerInteracting.current !== null && e.touches[0]) {
              const delta = e.touches[0].clientX - pointerInteracting.current;
              pointerInteractionMovement.current = delta / 100;
            }
          }}
        />

        {/* Orbital rings around globe */}
        <div className="absolute inset-0 pointer-events-none" style={{ perspective: "1000px" }}>
          {/* Ring 1 - tilted horizontally */}
          <div
            className="absolute inset-[5%] border-2 border-current rounded-full transition-colors duration-1000"
            style={{
              color: `rgb(${currentTheme.markerColor.map(c => Math.round(c * 255)).join(',')})`,
              transform: "rotateX(75deg)",
              opacity: 0.4,
            }}
          />
          {/* Ring 2 - tilted at angle */}
          <div
            className="absolute inset-[2%] border border-current rounded-full transition-colors duration-1000"
            style={{
              color: `rgb(${currentTheme.glowColor.map(c => Math.round(c * 255)).join(',')})`,
              transform: "rotateX(75deg) rotateY(25deg)",
              opacity: 0.25,
            }}
          />
          {/* Ring 3 - opposite angle */}
          <div
            className="absolute inset-[-2%] border border-current rounded-full transition-colors duration-1000"
            style={{
              color: `rgb(${currentTheme.baseColor.map(c => Math.round(c * 255)).join(',')})`,
              transform: "rotateX(70deg) rotateY(-20deg)",
              opacity: 0.2,
            }}
          />
        </div>

        {/* Decorative outer rings */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-[-10%] border border-current rounded-full opacity-10 transition-colors duration-1000"
            style={{ color: `rgb(${currentTheme.markerColor.map(c => Math.round(c * 255)).join(',')})` }}
          />
          <div
            className="absolute inset-[-20%] border border-current rounded-full opacity-5 transition-colors duration-1000"
            style={{ color: `rgb(${currentTheme.markerColor.map(c => Math.round(c * 255)).join(',')})` }}
          />
        </div>
      </div>
    </div>
  );
}
