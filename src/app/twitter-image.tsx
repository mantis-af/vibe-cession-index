import { ImageResponse } from "next/og";
import { NATIONAL_SUMMARY } from "@/lib/load-data";

export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

export default function TwitterImage() {
  const score = NATIONAL_SUMMARY.averageScore;
  const gap = NATIONAL_SUMMARY.averageVibesGap;

  const scoreColor =
    score >= 70 ? "#22c55e" : score >= 60 ? "#84cc16" : score >= 50 ? "#eab308" : score >= 40 ? "#f97316" : "#ef4444";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0c0a14 0%, #12101f 50%, #0e0b18 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: "16px", color: "#71717a", letterSpacing: "0.2em", textTransform: "uppercase" as const, marginBottom: "16px" }}>
          Undercurrent Index
        </div>
        <div style={{ display: "flex", fontSize: "120px", fontWeight: 900, color: scoreColor, lineHeight: "1", fontFamily: "monospace" }}>
          {score}
        </div>
        <div style={{ display: "flex", fontSize: "18px", color: "#71717a", marginTop: "12px" }}>
          National Composite Score
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "20px",
            fontSize: "22px",
            fontWeight: 700,
            color: gap >= 0 ? "#4ade80" : "#f87171",
            fontFamily: "monospace",
          }}
        >
          Sentiment Gap: {gap > 0 ? "+" : ""}{gap.toFixed(1)}
        </div>
        <div style={{ display: "flex", fontSize: "14px", color: "#52525b", marginTop: "24px" }}>
          Real-time behavioral economic tracking for 20 US metros
        </div>
      </div>
    ),
    { ...size }
  );
}
