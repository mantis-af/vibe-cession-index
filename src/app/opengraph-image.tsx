import { ImageResponse } from "next/og";
import { NATIONAL_SUMMARY, METROS } from "@/lib/load-data";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  const score = NATIONAL_SUMMARY.averageScore;
  const gap = NATIONAL_SUMMARY.averageVibesGap;
  const top3 = [...METROS]
    .sort((a, b) => b.currentScore - a.currentScore)
    .slice(0, 3);
  const bottom3 = [...METROS]
    .sort((a, b) => a.currentScore - b.currentScore)
    .slice(0, 3);

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
          background: "linear-gradient(145deg, #0c0a14 0%, #12101f 50%, #0e0b18 100%)",
          padding: "60px 70px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
          <div style={{ display: "flex", width: "8px", height: "8px", borderRadius: "50%", background: "#a78bfa" }} />
          <div style={{ display: "flex", fontSize: "18px", color: "#a1a1aa", letterSpacing: "0.15em", textTransform: "uppercase" as const }}>
            Undercurrent Index
          </div>
          <div style={{ display: "flex", fontSize: "14px", color: "#52525b", marginLeft: "auto" }}>
            Week of {NATIONAL_SUMMARY.weekOf}
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flex: "1", gap: "60px", alignItems: "center" }}>
          {/* Left: Score */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "280px" }}>
            <div style={{ display: "flex", fontSize: "14px", color: "#71717a", textTransform: "uppercase" as const, letterSpacing: "0.2em", marginBottom: "12px" }}>
              National Score
            </div>
            <div style={{ display: "flex", fontSize: "140px", fontWeight: 900, color: scoreColor, lineHeight: "1", fontFamily: "monospace" }}>
              {score}
            </div>
            <div style={{ display: "flex", fontSize: "16px", color: "#71717a", marginTop: "8px" }}>
              out of 100
            </div>
            <div
              style={{
                display: "flex",
                marginTop: "20px",
                fontSize: "20px",
                fontWeight: 700,
                color: gap >= 0 ? "#4ade80" : "#f87171",
                fontFamily: "monospace",
              }}
            >
              Sentiment Gap: {gap > 0 ? "+" : ""}{gap.toFixed(1)}
            </div>
          </div>

          {/* Right: Top/Bottom metros */}
          <div style={{ display: "flex", flexDirection: "column", flex: "1", gap: "16px" }}>
            <div style={{ display: "flex", fontSize: "13px", color: "#71717a", textTransform: "uppercase" as const, letterSpacing: "0.15em" }}>
              Strongest Metros
            </div>
            {top3.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", fontSize: "22px", color: "#e4e4e7", fontWeight: 600 }}>
                  {m.name}, {m.state}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: "28px",
                    fontWeight: 800,
                    fontFamily: "monospace",
                    color: m.currentScore >= 60 ? "#84cc16" : m.currentScore >= 50 ? "#eab308" : "#f97316",
                  }}
                >
                  {m.currentScore}
                </div>
              </div>
            ))}

            <div style={{ display: "flex", height: "1px", background: "rgba(255,255,255,0.06)", width: "100%" }} />

            <div style={{ display: "flex", fontSize: "13px", color: "#71717a", textTransform: "uppercase" as const, letterSpacing: "0.15em" }}>
              Most Stressed
            </div>
            {bottom3.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", fontSize: "22px", color: "#a1a1aa", fontWeight: 600 }}>
                  {m.name}, {m.state}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: "28px",
                    fontWeight: 800,
                    fontFamily: "monospace",
                    color: m.currentScore >= 50 ? "#eab308" : m.currentScore >= 40 ? "#f97316" : "#ef4444",
                  }}
                >
                  {m.currentScore}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "30px" }}>
          <div style={{ display: "flex", fontSize: "16px", color: "#52525b" }}>
            20 US metros tracked weekly
          </div>
          <div style={{ display: "flex", fontSize: "16px", color: "#52525b" }}>
            Google Trends + BLS + FRED + Redfin
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
