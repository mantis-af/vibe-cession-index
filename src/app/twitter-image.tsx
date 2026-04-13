import { ImageResponse } from "next/og";
import { NATIONAL_SUMMARY } from "@/lib/load-data";

export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

export default function TwitterImage() {
  const score = NATIONAL_SUMMARY.averageScore;
  const gap = NATIONAL_SUMMARY.averageVibesGap;
  const scoreColor = score >= 60 ? "#16a34a" : score >= 50 ? "#ca8a04" : "#dc2626";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fafafa", fontFamily: "system-ui" }}>
        <div style={{ display: "flex", fontSize: "20px", fontWeight: 600, fontStyle: "italic", color: "#18181b", marginBottom: "8px" }}>Undercurrent</div>
        <div style={{ display: "flex", fontSize: "14px", color: "#a1a1aa", marginBottom: "24px" }}>The economy beneath the economy</div>
        <div style={{ display: "flex", fontSize: "128px", fontWeight: 900, color: scoreColor, lineHeight: "1", fontFamily: "monospace" }}>{score}</div>
        <div style={{ display: "flex", fontSize: "16px", color: "#a1a1aa", marginTop: "12px" }}>National Composite Score</div>
        <div style={{ display: "flex", marginTop: "20px", padding: "8px 20px", borderRadius: "10px", background: gap >= 0 ? "#f0fdf4" : "#fef2f2", border: gap >= 0 ? "1px solid #bbf7d0" : "1px solid #fecaca", fontSize: "18px", fontWeight: 700, color: gap >= 0 ? "#16a34a" : "#dc2626", fontFamily: "monospace" }}>
          Gap: {gap > 0 ? "+" : ""}{gap.toFixed(1)}
        </div>
        <div style={{ display: "flex", fontSize: "13px", color: "#a1a1aa", marginTop: "24px" }}>50 metros &middot; 1,500+ series &middot; AI-powered analysis</div>
      </div>
    ),
    { ...size }
  );
}
