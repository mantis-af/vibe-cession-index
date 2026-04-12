"use client";

import { FadeIn, StaggerContainer, StaggerItem, CountUp } from "@/components/motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";
import { Clock, ArrowRight, Check, X } from "lucide-react";

interface CorrelationPoint {
  lag: number;
  correlation: number;
  pValue: number;
  significant: boolean;
}

interface SignalPair {
  behavioral: string;
  official: string;
  behavioralName: string;
  officialName: string;
  peakLag: number;
  peakCorrelation: number;
  pValue: number;
  significant: boolean;
  interpretation: string;
}

interface Props {
  national: {
    peakLag: number;
    peakCorrelation: number;
    pValue: number;
    significant: boolean;
    correlations: CorrelationPoint[];
    interpretation: string;
  };
  signalPairs: SignalPair[];
  signalSummary: {
    totalPairsTested: number;
    significantLeading: number;
    significantLagging: number;
    topLeadingPair: SignalPair | null;
  };
  summary: {
    metrosAnalyzed: number;
    metrosLeading: number;
    metrosLagging: number;
    metrosInsignificant: number;
    avgLeadWeeks: number;
  };
  metros: Array<{
    id: string;
    name: string;
    state: string;
    peakLag: number;
    peakCorrelation: number;
    pValue: number;
    significant: boolean;
  }>;
}

export function LeadLagSection({ national, signalPairs, signalSummary, summary }: Props) {
  const leadingPairs = signalPairs.filter((p) => p.significant && p.peakLag > 0);
  const topPair = signalSummary.topLeadingPair;

  const corrData = national.correlations.map((c) => ({
    lag: c.lag,
    correlation: c.correlation,
    significant: c.significant,
    label: c.lag === 0 ? "0" : c.lag > 0 ? `+${c.lag}` : `${c.lag}`,
  }));

  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-7xl mx-auto">
      <FadeIn>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-300/30 to-transparent" />
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl tracking-tight text-foreground mb-2">
          <span className="font-[family-name:var(--font-instrument)] italic">Predictive Power</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mb-10">
          Cross-correlation analysis with permutation-tested significance (p&lt;0.05). We test each behavioral signal
          against each official indicator at time offsets of -16 to +16 weeks.
        </p>
      </FadeIn>

      {/* Key finding */}
      {topPair && (
        <FadeIn delay={0.05}>
          <div className="surface rounded-2xl p-6 sm:p-8 mb-10 border-l-4 border-indigo-500">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-indigo-500" />
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Strongest Predictive Signal</div>
                  <div className="text-3xl sm:text-4xl font-mono font-black text-indigo-600">
                    <CountUp target={topPair.peakLag} /> <span className="text-lg font-semibold">weeks</span>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground leading-relaxed">
                  <strong>{topPair.behavioralName}</strong> leads <strong>{topPair.officialName}</strong> by{" "}
                  <strong>{topPair.peakLag} weeks</strong> (r={topPair.peakCorrelation.toFixed(3)}, p={topPair.pValue.toFixed(3)}).
                  {topPair.peakLag >= 8 && (
                    <> This means changes in {topPair.behavioralName.toLowerCase()} appear roughly <strong>{Math.round(topPair.peakLag / 4)} months before</strong> they show up in {topPair.officialName.toLowerCase()} data.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </FadeIn>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Per-signal pair results */}
        <FadeIn delay={0.1}>
          <div className="surface rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Signal-by-Signal Lead/Lag</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {signalSummary.totalPairsTested} pairs tested. {signalSummary.significantLeading} show behavioral leading (p&lt;0.05).
            </p>
            <StaggerContainer className="space-y-2" staggerDelay={0.03}>
              {signalPairs.filter((p) => p.significant).map((pair) => (
                <StaggerItem key={`${pair.behavioral}-${pair.official}`}>
                  <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-zinc-50">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-xs font-medium text-foreground truncate">{pair.behavioralName}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">{pair.officialName}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-mono font-bold ${pair.peakLag > 0 ? "text-indigo-600" : pair.peakLag < 0 ? "text-amber-600" : "text-zinc-500"}`}>
                        {pair.peakLag > 0 ? "+" : ""}{pair.peakLag}w
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        r={pair.peakCorrelation > 0 ? "+" : ""}{pair.peakCorrelation.toFixed(2)}
                      </span>
                      {pair.significant ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <X className="h-3 w-3 text-zinc-300" />
                      )}
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
            <p className="text-[10px] text-muted-foreground mt-3">
              Positive lag = behavioral leads. Significance via permutation test (n=100). Check mark = p&lt;0.05.
            </p>
          </div>
        </FadeIn>

        {/* Correlogram */}
        <FadeIn delay={0.15}>
          <div className="surface rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Composite Cross-Correlation</h3>
            <p className="text-xs text-muted-foreground mb-4">
              National avg behavioral vs official. Peak at lag {national.peakLag} (r={national.peakCorrelation.toFixed(3)}, p={national.pValue.toFixed(3)}).
            </p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={corrData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#a1a1aa", fontSize: 9 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e4e4e7" }}
                />
                <YAxis
                  tick={{ fill: "#a1a1aa", fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e4e4e7" }}
                />
                <ReferenceLine y={0} stroke="#a1a1aa" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-lg text-xs">
                        <div>Lag: <span className="font-mono font-semibold">{d.label} weeks</span></div>
                        <div>r: <span className="font-mono font-semibold">{d.correlation.toFixed(4)}</span></div>
                        <div>Significant: <span className="font-mono">{d.significant ? "yes" : "no"}</span></div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="correlation" radius={[2, 2, 0, 0]}>
                  {corrData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.significant ? (entry.correlation > 0 ? "#6366f1" : "#f87171") : "#d4d4d8"}
                      opacity={entry.significant ? 0.8 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-muted-foreground mt-2">
              Colored bars = statistically significant (p&lt;0.05). Gray = not significant.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
