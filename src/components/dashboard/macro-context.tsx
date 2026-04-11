"use client";

import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion";
import { TrendingUp, TrendingDown, Minus, DollarSign, Fuel, BarChart3, Users, CreditCard, Factory, Home, Building, Briefcase, PiggyBank, LineChart } from "lucide-react";

interface MacroSeries {
  name: string;
  unit: string;
  points: Array<{ date: string; value: number; raw?: number | null }>;
}

interface ExpandedSeries {
  name: string;
  unit: string;
  frequency: string;
  points: Array<{ date: string; value: number }>;
}

interface Props {
  macro: Record<string, MacroSeries>;
  expanded?: Record<string, ExpandedSeries>;
  cpi: { points?: Array<{ month: string; cpi_index: number; inflation_yoy?: number }> };
  gas: { points?: Array<{ week: string; price: number }> };
}

interface Indicator {
  key: string;
  label: string;
  value: string;
  change?: string;
  changeDirection?: "up" | "down" | "flat";
  sublabel: string;
  icon: React.ReactNode;
  category: "growth" | "prices" | "labor" | "rates";
}

export function MacroContext({ macro, expanded, cpi, gas }: Props) {
  const indicators: Indicator[] = [];

  // GDP Growth
  const gdpGrowth = macro["gdp_growth"];
  if (gdpGrowth?.points?.length) {
    const latest = gdpGrowth.points[gdpGrowth.points.length - 1];
    const prev = gdpGrowth.points.length > 1 ? gdpGrowth.points[gdpGrowth.points.length - 2] : null;
    indicators.push({
      key: "gdp",
      label: "GDP Growth",
      value: `${latest.value > 0 ? "+" : ""}${latest.value.toFixed(1)}%`,
      change: prev ? `${(latest.value - prev.value) > 0 ? "+" : ""}${(latest.value - prev.value).toFixed(1)}pp` : undefined,
      changeDirection: prev ? (latest.value > prev.value ? "up" : latest.value < prev.value ? "down" : "flat") : undefined,
      sublabel: `Q${Math.ceil(parseInt(latest.date.slice(5, 7)) / 3)} ${latest.date.slice(0, 4)}`,
      icon: <BarChart3 className="h-4 w-4" />,
      category: "growth",
    });
  }

  // CPI Inflation
  const cpiSeries = macro["cpi"];
  if (cpiSeries?.points?.length) {
    const latest = cpiSeries.points[cpiSeries.points.length - 1];
    const prev = cpiSeries.points.length > 1 ? cpiSeries.points[cpiSeries.points.length - 2] : null;
    indicators.push({
      key: "cpi",
      label: "CPI Inflation",
      value: `${latest.value.toFixed(1)}%`,
      change: prev ? `${(latest.value - prev.value) > 0 ? "+" : ""}${(latest.value - prev.value).toFixed(1)}pp` : undefined,
      changeDirection: prev ? (latest.value > prev.value ? "up" : latest.value < prev.value ? "down" : "flat") : undefined,
      sublabel: "YoY, all items",
      icon: <DollarSign className="h-4 w-4" />,
      category: "prices",
    });
  }

  // Consumer Sentiment
  const sentiment = macro["consumer_sentiment"];
  if (sentiment?.points?.length) {
    const latest = sentiment.points[sentiment.points.length - 1];
    const prev = sentiment.points.length > 1 ? sentiment.points[sentiment.points.length - 2] : null;
    indicators.push({
      key: "sentiment",
      label: "Consumer Sentiment",
      value: latest.value.toFixed(1),
      change: prev ? `${(latest.value - prev.value) > 0 ? "+" : ""}${(latest.value - prev.value).toFixed(1)}` : undefined,
      changeDirection: prev ? (latest.value > prev.value ? "up" : latest.value < prev.value ? "down" : "flat") : undefined,
      sublabel: "UMich Index",
      icon: <Users className="h-4 w-4" />,
      category: "growth",
    });
  }

  // Unemployment
  const unemp = macro["unemployment_rate_national"];
  if (unemp?.points?.length) {
    const latest = unemp.points[unemp.points.length - 1];
    const prev = unemp.points.length > 1 ? unemp.points[unemp.points.length - 2] : null;
    indicators.push({
      key: "unemployment",
      label: "Unemployment",
      value: `${latest.value.toFixed(1)}%`,
      change: prev ? `${(latest.value - prev.value) > 0 ? "+" : ""}${(latest.value - prev.value).toFixed(1)}pp` : undefined,
      changeDirection: prev ? (latest.value < prev.value ? "up" : latest.value > prev.value ? "down" : "flat") : undefined,  // inverted: lower is better
      sublabel: "National rate",
      icon: <Users className="h-4 w-4" />,
      category: "labor",
    });
  }

  // Nonfarm Payrolls
  const payrolls = macro["nonfarm_payrolls"];
  if (payrolls?.points?.length) {
    const latest = payrolls.points[payrolls.points.length - 1];
    indicators.push({
      key: "payrolls",
      label: "Nonfarm Payrolls",
      value: `${latest.value > 0 ? "+" : ""}${Math.round(latest.value)}K`,
      changeDirection: latest.value > 0 ? "up" : latest.value < 0 ? "down" : "flat",
      sublabel: "MoM change",
      icon: <Factory className="h-4 w-4" />,
      category: "labor",
    });
  }

  // Fed Funds Rate
  const fedRate = macro["fed_funds_rate"];
  if (fedRate?.points?.length) {
    const latest = fedRate.points[fedRate.points.length - 1];
    indicators.push({
      key: "fed_rate",
      label: "Fed Funds Rate",
      value: `${latest.value.toFixed(2)}%`,
      sublabel: "Effective rate",
      icon: <CreditCard className="h-4 w-4" />,
      category: "rates",
    });
  }

  // 10Y Treasury
  const t10 = macro["treasury_10y"];
  if (t10?.points?.length) {
    const latest = t10.points[t10.points.length - 1];
    const prev = t10.points.length > 1 ? t10.points[t10.points.length - 2] : null;
    indicators.push({
      key: "t10y",
      label: "10Y Treasury",
      value: `${latest.value.toFixed(2)}%`,
      change: prev ? `${(latest.value - prev.value) > 0 ? "+" : ""}${(latest.value - prev.value).toFixed(2)}` : undefined,
      changeDirection: prev ? (latest.value > prev.value ? "up" : latest.value < prev.value ? "down" : "flat") : undefined,
      sublabel: "Yield",
      icon: <BarChart3 className="h-4 w-4" />,
      category: "rates",
    });
  }

  // Gas Price
  const gasPoints = gas?.points;
  if (gasPoints?.length) {
    const latest = gasPoints[gasPoints.length - 1];
    const fourWeeksAgo = gasPoints.length > 4 ? gasPoints[gasPoints.length - 5] : null;
    indicators.push({
      key: "gas",
      label: "Gas Price",
      value: `$${latest.price.toFixed(2)}`,
      change: fourWeeksAgo ? `${(latest.price - fourWeeksAgo.price) > 0 ? "+" : ""}$${(latest.price - fourWeeksAgo.price).toFixed(2)}` : undefined,
      changeDirection: fourWeeksAgo ? (latest.price > fourWeeksAgo.price ? "up" : latest.price < fourWeeksAgo.price ? "down" : "flat") : undefined,
      sublabel: "Regular, national avg",
      icon: <Fuel className="h-4 w-4" />,
      category: "prices",
    });
  }

  // Retail Sales
  const retail = macro["retail_sales"];
  if (retail?.points?.length) {
    const latest = retail.points[retail.points.length - 1];
    indicators.push({
      key: "retail",
      label: "Retail Sales",
      value: `${latest.value > 0 ? "+" : ""}${latest.value.toFixed(1)}%`,
      changeDirection: latest.value > 0 ? "up" : latest.value < 0 ? "down" : "flat",
      sublabel: "YoY growth",
      icon: <CreditCard className="h-4 w-4" />,
      category: "growth",
    });
  }

  // --- Expanded FRED data ---
  const exp = expanded || {};

  const addExpanded = (key: string, label: string, icon: React.ReactNode, cat: Indicator["category"], fmt: (v: number) => string, sublabel: string, invertChange = false) => {
    const series = exp[key];
    if (!series?.points?.length) return;
    const latest = series.points[series.points.length - 1];
    const prev = series.points.length > 1 ? series.points[series.points.length - 2] : null;
    const diff = prev ? latest.value - prev.value : null;
    indicators.push({
      key,
      label,
      value: fmt(latest.value),
      change: diff !== null ? `${diff > 0 ? "+" : ""}${Math.abs(diff) > 100 ? Math.round(diff).toLocaleString() : diff.toFixed(2)}` : undefined,
      changeDirection: diff !== null ? (invertChange ? (diff < 0 ? "up" : diff > 0 ? "down" : "flat") : (diff > 0 ? "up" : diff < 0 ? "down" : "flat")) : undefined,
      sublabel,
      icon,
      category: cat,
    });
  };

  addExpanded("mortgage_30y", "30Y Mortgage", <Home className="h-4 w-4" />, "rates", v => `${v.toFixed(2)}%`, "Fixed rate");
  addExpanded("sp500", "S&P 500", <LineChart className="h-4 w-4" />, "rates", v => v.toLocaleString(undefined, { maximumFractionDigits: 0 }), "Weekly avg");
  addExpanded("vix", "VIX", <BarChart3 className="h-4 w-4" />, "rates", v => v.toFixed(1), "Volatility index", true);
  addExpanded("yield_curve", "Yield Curve", <LineChart className="h-4 w-4" />, "rates", v => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`, "10Y-2Y spread");
  addExpanded("new_biz_apps", "New Businesses", <Building className="h-4 w-4" />, "growth", v => Math.round(v).toLocaleString(), "Weekly applications");
  addExpanded("case_shiller", "Home Prices", <Home className="h-4 w-4" />, "prices", v => v.toFixed(1), "Case-Shiller index");
  addExpanded("savings_rate", "Savings Rate", <PiggyBank className="h-4 w-4" />, "growth", v => `${v.toFixed(1)}%`, "Personal savings");
  addExpanded("job_openings", "Job Openings", <Briefcase className="h-4 w-4" />, "labor", v => `${(v / 1000).toFixed(1)}M`, "JOLTS");
  addExpanded("quit_rate", "Quit Rate", <Users className="h-4 w-4" />, "labor", v => `${v.toFixed(1)}%`, "JOLTS — confidence signal");
  addExpanded("continued_claims", "Cont. Claims", <Users className="h-4 w-4" />, "labor", v => `${(v / 1000000).toFixed(2)}M`, "Ongoing unemployment", true);
  addExpanded("vehicle_sales", "Vehicle Sales", <Factory className="h-4 w-4" />, "growth", v => `${v.toFixed(1)}M`, "Total, annualized");

  if (indicators.length === 0) return null;

  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-7xl mx-auto">
      <FadeIn>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-300/30 to-transparent" />
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl tracking-tight text-foreground mb-2">
          <span className="font-[family-name:var(--font-instrument)] italic">Macro Context</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mb-10">
          Ground truth economic indicators — GDP, inflation, employment, rates, and consumer data.
          These quarterly and monthly benchmarks contextualize the behavioral signals above.
        </p>
      </FadeIn>

      <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" staggerDelay={0.05}>
        {indicators.map((ind) => (
          <StaggerItem key={ind.key}>
            <div className="surface rounded-xl p-4 hover:border-zinc-300 transition-all">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-muted-foreground">{ind.icon}</span>
                <span className="text-xs font-medium text-muted-foreground truncate">{ind.label}</span>
              </div>
              <div className="text-2xl font-mono font-bold text-foreground tabular-nums leading-tight">
                {ind.value}
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-muted-foreground">{ind.sublabel}</span>
                {ind.change && (
                  <span className={`flex items-center gap-0.5 text-xs font-mono ${
                    ind.changeDirection === "up" ? "text-emerald-600" :
                    ind.changeDirection === "down" ? "text-red-600" : "text-zinc-500"
                  }`}>
                    {ind.changeDirection === "up" ? <TrendingUp className="h-3 w-3" /> :
                     ind.changeDirection === "down" ? <TrendingDown className="h-3 w-3" /> :
                     <Minus className="h-3 w-3" />}
                    {ind.change}
                  </span>
                )}
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}
