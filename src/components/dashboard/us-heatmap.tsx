"use client";

import { useState } from "react";
import Link from "next/link";
import { Metro } from "@/lib/types";
import { scoreColor, scoreLabel } from "@/lib/colors";
import { FadeIn } from "@/components/motion";

// Approximate lat/lng for each metro, mapped to SVG viewbox (0-960 x 0-600)
// Using Albers USA-like projection: lng mapped to x, lat mapped to y (inverted)
const METRO_COORDS: Record<string, { x: number; y: number }> = {
  nyc: { x: 853, y: 190 }, lax: { x: 118, y: 340 }, chi: { x: 628, y: 185 },
  hou: { x: 502, y: 430 }, phx: { x: 195, y: 370 }, phl: { x: 838, y: 210 },
  sat: { x: 460, y: 440 }, sdg: { x: 138, y: 365 }, dal: { x: 490, y: 380 },
  sjc: { x: 95, y: 275 }, aus: { x: 470, y: 420 }, jax: { x: 755, y: 385 },
  sfo: { x: 82, y: 260 }, cmh: { x: 720, y: 210 }, clt: { x: 762, y: 310 },
  ind: { x: 665, y: 220 }, sea: { x: 120, y: 80 }, den: { x: 320, y: 230 },
  dca: { x: 810, y: 240 }, bna: { x: 670, y: 310 },
  ftw: { x: 480, y: 378 }, okc: { x: 440, y: 340 }, elp: { x: 290, y: 400 },
  las: { x: 185, y: 295 }, pdx: { x: 108, y: 105 }, mem: { x: 610, y: 335 },
  lou: { x: 665, y: 260 }, bal: { x: 820, y: 230 }, mil: { x: 615, y: 155 },
  abq: { x: 275, y: 340 }, tuc: { x: 210, y: 385 }, msa: { x: 200, y: 372 },
  atl: { x: 720, y: 335 }, kcm: { x: 520, y: 265 }, ral: { x: 785, y: 300 },
  mia: { x: 790, y: 470 }, tpa: { x: 745, y: 430 }, stl: { x: 580, y: 265 },
  pit: { x: 765, y: 205 }, cin: { x: 690, y: 235 }, orl: { x: 760, y: 420 },
  cle: { x: 720, y: 185 }, min: { x: 530, y: 130 }, det: { x: 695, y: 170 },
  slc: { x: 230, y: 215 }, bos: { x: 880, y: 165 }, ric: { x: 800, y: 268 },
  bir: { x: 665, y: 345 }, har: { x: 865, y: 175 }, buf: { x: 790, y: 155 },
};

interface Props {
  metros: Metro[];
}

export function UsHeatmap({ metros }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const hoveredMetro = hovered ? metros.find((m) => m.id === hovered) : null;

  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-7xl mx-auto">
      <FadeIn>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-300/30 to-transparent" />
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl tracking-tight text-foreground mb-2">
          <span className="font-[family-name:var(--font-instrument)] italic">National Map</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mb-8">
          50 US metros colored by composite behavioral index score. Larger dots = higher population. Hover for details.
        </p>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="surface rounded-2xl p-4 sm:p-6 relative">
          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 text-[10px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#16a34a" }} />
              70+ Thriving
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#65a30d" }} />
              60-69
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ca8a04" }} />
              50-59
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ea580c" }} />
              40-49
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#dc2626" }} />
              &lt;40
            </span>
          </div>

          <svg viewBox="0 0 960 540" className="w-full h-auto" style={{ minHeight: 300 }}>
            {/* US outline (simplified) */}
            <path
              d="M60,60 L60,120 L30,180 L50,200 L60,250 L80,300 L100,370 L140,400 L180,390 L220,400 L290,420 L350,430 L400,440 L450,460 L500,460 L520,440 L560,430 L600,420 L650,400 L700,430 L740,460 L780,480 L800,470 L790,440 L770,400 L760,360 L780,320 L800,280 L830,260 L860,250 L890,220 L900,180 L890,150 L860,140 L830,150 L800,140 L770,130 L740,140 L700,150 L660,140 L620,130 L580,130 L540,110 L500,100 L460,110 L420,120 L380,120 L340,130 L300,140 L260,150 L220,155 L180,150 L140,130 L110,100 L80,70 Z"
              fill="none"
              stroke="#e4e4e7"
              strokeWidth="1.5"
            />

            {/* Metro dots */}
            {metros.map((metro) => {
              const coords = METRO_COORDS[metro.id];
              if (!coords) return null;
              const color = scoreColor(metro.currentScore);
              const radius = Math.max(5, Math.min(14, Math.sqrt(metro.population / 100000) * 1.8));
              const isHovered = hovered === metro.id;

              return (
                <g key={metro.id}>
                  {/* Glow ring on hover */}
                  {isHovered && (
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r={radius + 6}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      opacity="0.4"
                    />
                  )}
                  <Link href={`/metro/${metro.id}`}>
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r={isHovered ? radius + 2 : radius}
                      fill={color}
                      opacity={isHovered ? 1 : 0.75}
                      stroke="white"
                      strokeWidth="1.5"
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHovered(metro.id)}
                      onMouseLeave={() => setHovered(null)}
                    />
                  </Link>
                  {/* Label for larger metros */}
                  {metro.population > 1_500_000 && !isHovered && (
                    <text
                      x={coords.x}
                      y={coords.y - radius - 4}
                      textAnchor="middle"
                      fill="#71717a"
                      fontSize="9"
                      fontFamily="var(--font-geist-mono)"
                    >
                      {metro.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Hover tooltip */}
          {hoveredMetro && (
            <div className="absolute top-4 right-4 bg-white border border-zinc-200 rounded-xl shadow-lg px-4 py-3 min-w-[200px]">
              <div className="text-sm font-semibold text-foreground">{hoveredMetro.name}, {hoveredMetro.state}</div>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-2xl font-mono font-bold" style={{ color: scoreColor(hoveredMetro.currentScore) }}>
                  {hoveredMetro.currentScore}
                </span>
                <div className="text-xs text-muted-foreground">
                  <div>{scoreLabel(hoveredMetro.currentScore)}</div>
                  <div>Gap: {hoveredMetro.vibesGap > 0 ? "+" : ""}{hoveredMetro.vibesGap}</div>
                </div>
              </div>
              {hoveredMetro.context?.affordability && (
                <div className="mt-1.5 pt-1.5 border-t border-zinc-100 text-[10px] text-muted-foreground">
                  Affordability: {hoveredMetro.context.affordability.score}/100 &middot; ${(hoveredMetro.context.affordability.homePrice / 1000).toFixed(0)}K home
                </div>
              )}
            </div>
          )}
        </div>
      </FadeIn>
    </section>
  );
}
