"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { FadeIn } from "@/components/motion";
import { TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";

interface Projection {
  weeksAhead: number;
  week: string;
  projected: number;
  ciLower: number;
  ciUpper: number;
}

interface CompositeForecast {
  official: string;
  officialName: string;
  direction: string;
  contributingSignals: number;
  projections: Projection[];
}

interface SignalForecast {
  behavioralName: string;
  officialName: string;
  leadWeeks: number;
  direction: string;
  narrative: string;
  regression: { r_squared: number };
}

interface Props {
  compositeForecasts: CompositeForecast[];
  signalForecasts: SignalForecast[];
  lastDataWeek: string;
}

export function ForecastSection({ compositeForecasts, signalForecasts, lastDataWeek }: Props) {
  if (!compositeForecasts.length) return null;

  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-7xl mx-auto">
      <FadeIn>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-300/30 to-transparent" />
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl tracking-tight text-foreground mb-2">
          <span className="font-[family-name:var(--font-instrument)] italic">Forecast</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mb-10">
          Where are official indicators heading? Using validated lead/lag relationships, we project
          unemployment, jobless claims, and business formation 8-16 weeks forward from current behavioral signals.
        </p>
      </FadeIn>

      {/* Forecast cards with charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {compositeForecasts.map((fc) => (
          <FadeIn key={fc.official} delay={0.1}>
            <div className="surface rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">{fc.officialName}</h3>
                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  fc.direction === "improving" ? "bg-emerald-50 text-emerald-700" :
                  fc.direction === "worsening" ? "bg-red-50 text-red-700" :
                  "bg-zinc-100 text-zinc-600"
                }`}>
                  {fc.direction === "improving" ? <TrendingUp className="h-3 w-3" /> :
                   fc.direction === "worsening" ? <TrendingDown className="h-3 w-3" /> :
                   <Minus className="h-3 w-3" />}
                  {fc.direction}
                </span>
              </div>

              {/* Mini projection chart */}
              <div className="h-32 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={fc.projections} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`grad-${fc.official}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={fc.direction === "worsening" ? "#ef4444" : "#6366f1"} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={fc.direction === "worsening" ? "#ef4444" : "#6366f1"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="weeksAhead" tick={{ fill: "#a1a1aa", fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#a1a1aa", fontSize: 9 }} tickLine={false} axisLine={false} />
                    <ReferenceLine y={0} stroke="#d4d4d8" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-lg text-xs">
                            <div>+{d.weeksAhead} weeks</div>
                            <div className="font-mono">z = {d.projected.toFixed(3)}</div>
                            <div className="text-muted-foreground">CI: [{d.ciLower.toFixed(3)}, {d.ciUpper.toFixed(3)}]</div>
                          </div>
                        );
                      }}
                    />
                    <Area type="monotone" dataKey="ciUpper" stroke="none" fill={fc.direction === "worsening" ? "#fecaca" : "#c7d2fe"} fillOpacity={0.3} />
                    <Area type="monotone" dataKey="ciLower" stroke="none" fill="#ffffff" />
                    <Area
                      type="monotone"
                      dataKey="projected"
                      stroke={fc.direction === "worsening" ? "#ef4444" : "#6366f1"}
                      strokeWidth={2}
                      fill={`url(#grad-${fc.official})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                <span>{fc.contributingSignals} contributing signals</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {fc.projections.length}w horizon
                </span>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>

      {/* Signal narratives */}
      <FadeIn delay={0.2}>
        <div className="surface rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Signal Narratives</h3>
          <div className="space-y-3">
            {signalForecasts.slice(0, 5).map((sf, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-zinc-50 last:border-0">
                <span className={`mt-0.5 flex-shrink-0 ${
                  sf.direction === "worsening" ? "text-red-500" :
                  sf.direction === "improving" ? "text-emerald-500" :
                  "text-zinc-400"
                }`}>
                  {sf.direction === "worsening" ? <TrendingDown className="h-4 w-4" /> :
                   sf.direction === "improving" ? <TrendingUp className="h-4 w-4" /> :
                   <Minus className="h-4 w-4" />}
                </span>
                <div>
                  <div className="text-sm text-foreground leading-relaxed">{sf.narrative}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                    {sf.behavioralName} → {sf.officialName} | +{sf.leadWeeks}w lead | r²={sf.regression.r_squared.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
