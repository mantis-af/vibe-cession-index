import { ImageResponse } from "next/og";
import { NATIONAL_SUMMARY, METROS } from "@/lib/load-data";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  const score = NATIONAL_SUMMARY.averageScore;
  const gap = NATIONAL_SUMMARY.averageVibesGap;
  const sorted = [...METROS].sort((a, b) => b.currentScore - a.currentScore);
  const top3 = sorted.slice(0, 3);
  const bottom3 = sorted.slice(-3).reverse();

  const scoreColor = score >= 60 ? "#16a34a" : score >= 50 ? "#ca8a04" : "#dc2626";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#fafafa", padding: "56px 64px", fontFamily: "system-ui" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "36px" }}>
          <div style={{ display: "flex", fontSize: "24px", fontWeight: 600, fontStyle: "italic", color: "#18181b" }}>Undercurrent</div>
          <div style={{ display: "flex", fontSize: "14px", color: "#a1a1aa", marginLeft: "auto" }}>50 metros &middot; 1,500+ series</div>
        </div>

        {/* Score + metros */}
        <div style={{ display: "flex", flex: "1", gap: "56px", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "260px" }}>
            <div style={{ display: "flex", fontSize: "13px", color: "#71717a", textTransform: "uppercase" as const, letterSpacing: "0.2em", marginBottom: "10px" }}>National Score</div>
            <div style={{ display: "flex", fontSize: "140px", fontWeight: 900, color: scoreColor, lineHeight: "1", fontFamily: "monospace" }}>{score}</div>
            <div style={{ display: "flex", marginTop: "16px", padding: "6px 16px", borderRadius: "8px", background: gap >= 0 ? "#f0fdf4" : "#fef2f2", fontSize: "18px", fontWeight: 700, color: gap >= 0 ? "#16a34a" : "#dc2626", fontFamily: "monospace" }}>
              Gap: {gap > 0 ? "+" : ""}{gap.toFixed(1)}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: "1", gap: "12px" }}>
            <div style={{ display: "flex", fontSize: "12px", color: "#a1a1aa", textTransform: "uppercase" as const, letterSpacing: "0.15em" }}>Strongest</div>
            {top3.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "#fff", borderRadius: "8px", border: "1px solid #e4e4e7" }}>
                <div style={{ display: "flex", fontSize: "18px", color: "#18181b", fontWeight: 600 }}>{m.name}, {m.state}</div>
                <div style={{ display: "flex", fontSize: "24px", fontWeight: 800, fontFamily: "monospace", color: "#16a34a" }}>{m.currentScore}</div>
              </div>
            ))}
            <div style={{ display: "flex", height: "1px", background: "#e4e4e7", width: "100%", margin: "4px 0" }} />
            <div style={{ display: "flex", fontSize: "12px", color: "#a1a1aa", textTransform: "uppercase" as const, letterSpacing: "0.15em" }}>Most Stressed</div>
            {bottom3.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "#fff", borderRadius: "8px", border: "1px solid #e4e4e7" }}>
                <div style={{ display: "flex", fontSize: "18px", color: "#71717a", fontWeight: 600 }}>{m.name}, {m.state}</div>
                <div style={{ display: "flex", fontSize: "24px", fontWeight: 800, fontFamily: "monospace", color: "#dc2626" }}>{m.currentScore}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
