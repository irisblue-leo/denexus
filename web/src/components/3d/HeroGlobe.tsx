"use client";

import { useEffect, useRef } from "react";
import createGlobe from "cobe";

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

// Brand colors - soft purple theme matching the site
const theme = {
  baseColor: [0.75, 0.70, 0.95] as [number, number, number],
  glowColor: [0.70, 0.65, 0.92] as [number, number, number],
  markerColor: [0.55, 0.45, 0.90] as [number, number, number],
};

export default function HeroGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);

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
      baseColor: theme.baseColor,
      markerColor: theme.markerColor,
      glowColor: theme.glowColor,
      markers: markers,
      onRender: (state) => {
        // Auto rotation
        if (!pointerInteracting.current) {
          phi += 0.003;
        }
        state.phi = phi + pointerInteractionMovement.current;
        state.width = width * 2;
        state.height = width * 2;
      },
    });

    return () => {
      globeRef.current?.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="relative w-full aspect-square max-w-[550px]">
        {/* Glow effect behind globe */}
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-25"
          style={{
            background: `radial-gradient(circle, rgb(${theme.glowColor.map(c => Math.round(c * 255)).join(',')}), transparent 70%)`,
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
            className="absolute inset-[5%] border-2 rounded-full"
            style={{
              borderColor: `rgb(${theme.markerColor.map(c => Math.round(c * 255)).join(',')})`,
              transform: "rotateX(75deg)",
              opacity: 0.4,
            }}
          />
          {/* Ring 2 - tilted at angle */}
          <div
            className="absolute inset-[2%] border rounded-full"
            style={{
              borderColor: `rgb(${theme.glowColor.map(c => Math.round(c * 255)).join(',')})`,
              transform: "rotateX(75deg) rotateY(25deg)",
              opacity: 0.25,
            }}
          />
          {/* Ring 3 - opposite angle */}
          <div
            className="absolute inset-[-2%] border rounded-full"
            style={{
              borderColor: `rgb(${theme.baseColor.map(c => Math.round(c * 255)).join(',')})`,
              transform: "rotateX(70deg) rotateY(-20deg)",
              opacity: 0.2,
            }}
          />
        </div>

        {/* Decorative outer rings */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-[-10%] border rounded-full opacity-15"
            style={{ borderColor: `rgb(${theme.markerColor.map(c => Math.round(c * 255)).join(',')})` }}
          />
          <div
            className="absolute inset-[-20%] border rounded-full opacity-10"
            style={{ borderColor: `rgb(${theme.markerColor.map(c => Math.round(c * 255)).join(',')})` }}
          />
        </div>
      </div>
    </div>
  );
}
