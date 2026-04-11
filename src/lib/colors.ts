/** Map a 0-100 composite score to a color for the index. */
export function scoreColor(score: number): string {
  if (score >= 70) return "#22c55e"; // green-500
  if (score >= 60) return "#84cc16"; // lime-500
  if (score >= 50) return "#eab308"; // yellow-500
  if (score >= 40) return "#f97316"; // orange-500
  if (score >= 30) return "#ef4444"; // red-500
  return "#dc2626"; // red-600
}

export function scoreBg(score: number): string {
  if (score >= 70) return "bg-green-500/15 text-green-400";
  if (score >= 60) return "bg-lime-500/15 text-lime-400";
  if (score >= 50) return "bg-yellow-500/15 text-yellow-400";
  if (score >= 40) return "bg-orange-500/15 text-orange-400";
  if (score >= 30) return "bg-red-500/15 text-red-400";
  return "bg-red-600/15 text-red-500";
}

export function scoreLabel(score: number): string {
  if (score >= 70) return "Thriving";
  if (score >= 60) return "Healthy";
  if (score >= 50) return "Neutral";
  if (score >= 40) return "Stressed";
  if (score >= 30) return "Distressed";
  return "Severe";
}

export function trendColor(trend: "improving" | "declining" | "stable"): string {
  switch (trend) {
    case "improving": return "text-green-400";
    case "declining": return "text-red-400";
    case "stable": return "text-zinc-400";
  }
}

export function changeColor(change: number): string {
  if (change > 0) return "text-green-400";
  if (change < 0) return "text-red-400";
  return "text-zinc-400";
}

export function gapColor(gap: number): string {
  if (gap > 5) return "text-green-400";
  if (gap > 0) return "text-green-400/60";
  if (gap > -5) return "text-red-400/60";
  return "text-red-400";
}

export function gapLabel(gap: number): string {
  if (gap > 10) return "Hidden strength";
  if (gap > 5) return "Vibes ahead";
  if (gap > -5) return "Aligned";
  if (gap > -10) return "Vibes lagging";
  return "Severe disconnect";
}

export const CHART_COLORS = {
  composite: "#a78bfa",    // violet-400
  official: "#60a5fa",     // blue-400
  vibesGap: "#f472b6",     // pink-400
  jobPostings: "#34d399",  // emerald-400
  wageToRent: "#fbbf24",   // amber-400
  smallBiz: "#fb923c",     // orange-400
  googleTrends: "#a78bfa", // violet-400
  housing: "#38bdf8",      // sky-400
  unemployment: "#f87171", // red-400
  restaurant: "#4ade80",   // green-400
  permits: "#94a3b8",      // slate-400
};
