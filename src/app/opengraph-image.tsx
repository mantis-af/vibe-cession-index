import { ImageResponse } from "next/og";
import { NATIONAL_SUMMARY, METROS } from "@/lib/load-data";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  const score = NATIONAL_SUMMARY.averageScore;
  const gap = NATIONAL_SUMMARY.averageVibesGap;
  const top3 = [...METROS].sort((a, b) => b.currentScore - a.currentScore).slice(0, 3);
  const bottom3 = [...METROS].sort((a, b) => a.currentScore - b.currentScore).slice(0, 3);

  const scoreColor =
    score >= 70 ? "#16a34a" : score >= 60 ? "#65a30d" : score >= 50 ? "#ca8a04" : score >= 40 ? "#ea580c" : "#dc2626";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#fafafa",
          padding: "56px 64px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "36px" }}>
          <div style={{ display: "flex", width: "10px", height: "10px", borderRadius: "50%", background: "#6366f1" }} />
          <div style={{ display: "flex", fontSize: "20px", color: "#18181b", fontWeight: 600, fontStyle: "italic" }}>
            Undercurrent
          </div>
          <div style={{ display: "flex", fontSize: "14px", color: "#a1a1aa", marginLeft: "auto" }}>
            Week of {NATIONAL_SUMMARY.weekOf}
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flex: "1", gap: "56px", alignItems: "center" }}>
          {/* Left: Score */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "280px" }}>
            <div style={{ display: "flex", fontSize: "13px", color: "#71717a", textTransform: "uppercase" as const, letterSpacing: "0.2em", marginBottom: "12px" }}>
              National Score
            </div>
            <div style={{ display: "flex", fontSize: "140px", fontWeight: 900, color: scoreColor, lineHeight: "1", fontFamily: "monospace" }}>
              {score}
            </div>
            <div style={{ display: "flex", fontSize: "15px", color: "#a1a1aa", marginTop: "8px" }}>
              out of 100
            </div>
            <div
              style={{
                display: "flex",
                marginTop: "20px",
                padding: "6px 16px",
                borderRadius: "8px",
                background: gap >= 0 ? "#f0fdf4" : "#fef2f2",
                fontSize: "18px",
                fontWeight: 700,
                color: gap >= 0 ? "#16a34a" : "#dc2626",
                fontFamily: "monospace",
              }}
            >
              Sentiment Gap: {gap > 0 ? "+" : ""}{gap.toFixed(1)}
            </div>
          </div>

          {/* Right: Top/Bottom metros */}
          <div style={{ display: "flex", flexDirection: "column", flex: "1", gap: "14px" }}>
            <div style={{ display: "flex", fontSize: "12px", color: "#a1a1aa", textTransform: "uppercase" as const, letterSpacing: "0.15em" }}>
              Strongest Metros
            </div>
            {top3.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: "#ffffff", borderRadius: "10px", border: "1px solid #e4e4e7" }}>
                <div style={{ display: "flex", fontSize: "20px", color: "#18181b", fontWeight: 600 }}>
                  {m.name}, {m.state}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: "26px",
                    fontWeight: 800,
                    fontFamily: "monospace",
                    color: m.currentScore >= 60 ? "#65a30d" : m.currentScore >= 50 ? "#ca8a04" : "#ea580c",
                  }}
                >
                  {m.currentScore}
                </div>
              </div>
            ))}

            <div style={{ display: "flex", height: "1px", background: "#e4e4e7", width: "100%", margin: "4px 0" }} />

            <div style={{ display: "flex", fontSize: "12px", color: "#a1a1aa", textTransform: "uppercase" as const, letterSpacing: "0.15em" }}>
              Most Stressed
            </div>
            {bottom3.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: "#ffffff", borderRadius: "10px", border: "1px solid #e4e4e7" }}>
                <div style={{ display: "flex", fontSize: "20px", color: "#71717a", fontWeight: 600 }}>
                  {m.name}, {m.state}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: "26px",
                    fontWeight: 800,
                    fontFamily: "monospace",
                    color: m.currentScore >= 50 ? "#ca8a04" : m.currentScore >= 40 ? "#ea580c" : "#dc2626",
                  }}
                >
                  {m.currentScore}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e4e4e7" }}>
          <div style={{ display: "flex", fontSize: "14px", color: "#a1a1aa" }}>
            50 US metros &middot; Updated weekly
          </div>
          <div style={{ display: "flex", fontSize: "14px", color: "#a1a1aa" }}>
            10 pipelines &middot; 40+ indicators
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
