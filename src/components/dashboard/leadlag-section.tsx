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
import { Clock, TrendingUp, Minus, ChevronRight } from "lucide-react";
import Link from "next/link";

interface CorrelationPoint {
  lag: number;
  correlation: number;
}

interface MetroLeadLag {
  id: string;
  name: string;
  state: string;
  peakLag: number;
  peakCorrelation: number;
  leads: boolean | null;
  interpretation: string;
}

interface Props {
  national: {
    peakLag: number;
    peakCorrelation: number;
    correlations: CorrelationPoint[];
    interpretation: string;
  };
  summary: {
    metrosAnalyzed: number;
    metrosLeading: number;
    metrosLagging: number;
    metrosSynced: number;
    avgLeadWeeks: number;
  };
  metros: MetroLeadLag[];
}

export function LeadLagSection({ national, summary, metros }: Props) {
  const leadingMetros = metros.filter((m) => m.leads === true).slice(0, 8);
  const corrData = national.correlations.map((c) => ({
    lag: c.lag,
    correlation: c.correlation,
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
          Does the behavioral index actually predict official economic data? We compute the cross-correlation between
          behavioral signals (search anxiety, housing sentiment) and official signals (unemployment, claims, business formation)
          at different time offsets to find out.
        </p>
      </FadeIn>

      {/* Key finding */}
      <FadeIn delay={0.05}>
        <div className="surface rounded-2xl p-6 sm:p-8 mb-10 border-l-4 border-indigo-500">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-indigo-500" />
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">National Lead Time</div>
                <div className="text-4xl font-mono font-black text-indigo-600">
                  {national.peakLag > 0 ? <CountUp target={national.peakLag} /> : "0"} <span className="text-lg font-semibold">weeks</span>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground leading-relaxed">
                {national.peakLag > 0 ? (
                  <>
                    Behavioral signals lead official economic data by <strong>{national.peakLag} weeks</strong> nationally.
                    Across {summary.metrosAnalyzed} metros, <strong>{summary.metrosLeading} show the behavioral index predicting</strong> official
                    data movements with an average lead of <strong>{summary.avgLeadWeeks} weeks</strong>.
                    This means changes in search behavior, housing market sentiment, and AI adoption appear
                    in the data roughly <strong>{Math.round(national.peakLag / 4)} months before</strong> they show up in government statistics.
                  </>
                ) : (
                  <>Behavioral and official signals are currently synchronized — no significant lead or lag detected at the national level.</>
                )}
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Two columns: Correlogram + Leading metros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Correlogram */}
        <FadeIn delay={0.1}>
          <div className="surface rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Cross-Correlation by Lag</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Positive lag = behavioral leads. Peak at +{national.peakLag} weeks (r={national.peakCorrelation.toFixed(3)}).
            </p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={corrData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#a1a1aa", fontSize: 9 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e4e4e7" }}
                  label={{ value: "Lag (weeks)", position: "bottom", fill: "#a1a1aa", fontSize: 10, dy: 10 }}
                />
                <YAxis
                  tick={{ fill: "#a1a1aa", fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e4e4e7" }}
                  domain={[-0.3, 0.4]}
                />
                <ReferenceLine y={0} stroke="#a1a1aa" />
                <ReferenceLine x={`+${national.peakLag}`} stroke="#6366f1" strokeDasharray="4 4" strokeWidth={1.5} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-lg text-xs">
                        <div>Lag: <span className="font-mono font-semibold">{d.label} weeks</span></div>
                        <div>Correlation: <span className="font-mono font-semibold">{d.correlation.toFixed(4)}</span></div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="correlation" radius={[2, 2, 0, 0]}>
                  {corrData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.lag === national.peakLag ? "#6366f1" : entry.correlation > 0 ? "#a5b4fc" : "#fca5a5"}
                      opacity={entry.lag === national.peakLag ? 1 : 0.5}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FadeIn>

        {/* Leading metros */}
        <FadeIn delay={0.15}>
          <div className="surface rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-foreground">Metros Where Behavioral Leads</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-200 rounded-xl overflow-hidden mb-4">
              <div className="bg-white px-3 py-2.5 text-center">
                <div className="text-xl font-mono font-bold text-indigo-600">{summary.metrosLeading}</div>
                <div className="text-[9px] text-muted-foreground">Leading</div>
              </div>
              <div className="bg-white px-3 py-2.5 text-center">
                <div className="text-xl font-mono font-bold text-zinc-500">{summary.metrosSynced}</div>
                <div className="text-[9px] text-muted-foreground">Synced</div>
              </div>
              <div className="bg-white px-3 py-2.5 text-center">
                <div className="text-xl font-mono font-bold text-red-600">{summary.metrosLagging}</div>
                <div className="text-[9px] text-muted-foreground">Lagging</div>
              </div>
              <div className="bg-white px-3 py-2.5 text-center">
                <div className="text-xl font-mono font-bold text-foreground">{summary.avgLeadWeeks}</div>
                <div className="text-[9px] text-muted-foreground">Avg weeks</div>
              </div>
            </div>
            <StaggerContainer className="space-y-1" staggerDelay={0.03}>
              {leadingMetros.map((m) => (
                <StaggerItem key={m.id}>
                  <Link
                    href={`/metro/${m.id}`}
                    className="group flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-zinc-50 transition-colors"
                  >
                    <span className="text-sm text-foreground group-hover:text-indigo-600 transition-colors">
                      {m.name}, {m.state}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-indigo-600 font-semibold">
                        +{m.peakLag}w
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        r={m.peakCorrelation.toFixed(2)}
                      </span>
                      <ChevronRight className="h-3 w-3 text-zinc-300 group-hover:text-indigo-500" />
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
