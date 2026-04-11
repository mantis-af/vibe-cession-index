/** Map a 0-100 composite score to a color for the index. */
export function scoreColor(score: number): string {
  if (score >= 70) return "#16a34a"; // green-600
  if (score >= 60) return "#65a30d"; // lime-600
  if (score >= 50) return "#ca8a04"; // yellow-600
  if (score >= 40) return "#ea580c"; // orange-600
  if (score >= 30) return "#dc2626"; // red-600
  return "#b91c1c"; // red-700
}

export function scoreBg(score: number): string {
  if (score >= 70) return "bg-green-50 text-green-700";
  if (score >= 60) return "bg-lime-50 text-lime-700";
  if (score >= 50) return "bg-yellow-50 text-yellow-700";
  if (score >= 40) return "bg-orange-50 text-orange-700";
  if (score >= 30) return "bg-red-50 text-red-700";
  return "bg-red-100 text-red-800";
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
    case "improving": return "text-emerald-600";
    case "declining": return "text-red-600";
    case "stable": return "text-zinc-500";
  }
}

export function changeColor(change: number): string {
  if (change > 0) return "text-emerald-600";
  if (change < 0) return "text-red-600";
  return "text-zinc-500";
}

export function gapColor(gap: number): string {
  if (gap > 5) return "text-emerald-600";
  if (gap > 0) return "text-emerald-600/70";
  if (gap > -5) return "text-red-600/70";
  return "text-red-600";
}

export function gapLabel(gap: number): string {
  if (gap > 10) return "Hidden strength";
  if (gap > 5) return "Sentiment ahead";
  if (gap > -5) return "Aligned";
  if (gap > -10) return "Sentiment lagging";
  return "Severe disconnect";
}

export const CHART_COLORS = {
  composite: "#6366f1",    // indigo-500
  official: "#94a3b8",     // slate-400
  vibesGap: "#8b5cf6",     // violet-500
  jobPostings: "#10b981",  // emerald-500
  wageToRent: "#f59e0b",   // amber-500
  smallBiz: "#f97316",     // orange-500
  googleTrends: "#6366f1", // indigo-500
  housing: "#0ea5e9",      // sky-500
  unemployment: "#ef4444", // red-500
  restaurant: "#22c55e",   // green-500
  permits: "#64748b",      // slate-500
};
