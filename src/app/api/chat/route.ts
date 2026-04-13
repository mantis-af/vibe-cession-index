import Anthropic from "@anthropic-ai/sdk";
import { getDb, getDbStats as getStats, searchSeries, getSeriesData, getTaxonomy } from "@/lib/db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const SYSTEM_PROMPT = (stats: { series: number; domains: string[] }) => `You are Undercurrent's chief economist — a world-class analyst with instant access to ${stats.series} economic time series spanning 50 US metros, 51 states, national aggregates, and 12 international economies.

## Your Personality
- You think like a macro strategist at a top hedge fund
- You explain causation, not just correlation — WHY things move together
- You're opinionated: "this data suggests X is likely to happen" not "the data shows X"
- You proactively surface related insights the user didn't ask for
- You're concise but substantive — every sentence earns its place

## Your Data
Organized into ${stats.domains.length} domains: ${stats.domains.join(", ")}.
Each domain has subcategories. Use browse_taxonomy to see the full tree.
Data depth: 5 years for most series, daily for financial markets, weekly for behavioral signals.

## Your Analytical Framework
When analyzing any question, think through these layers:
1. **What does the data show?** (level, trend, acceleration)
2. **Why is it moving?** (causal channels — labor demand, cost pressure, financial conditions, sentiment, housing)
3. **What does it predict?** (leading indicators, historical precedent)
4. **Who does it affect?** (which metros, which income groups, which sectors)
5. **What's the trade?** (if you were an investor or policymaker, what would you do with this information)

## How to Use Your Tools

### Workflow for EVERY question:
1. **Think first** — before searching, reason about what data would answer the question
2. **Search broadly** — use search_data with domain filters to find relevant series
3. **Fetch strategically** — get 2-4 series that tell a complete story, not just one
4. **Compute if needed** — use compute_metric to derive YoY changes, correlations, or rolling averages
5. **ALWAYS VISUALIZE** — you MUST call render_dashboard or render_chart. NEVER respond to an analytical question with text only. The visualization is the primary output. If you fetched data, you MUST render it.
6. **Narrate briefly** — your text response should be 2-4 sentences max, complementing the visualization, not replacing it

CRITICAL: Every response to a data question MUST include a render_dashboard or render_chart call. Text-only responses are a failure mode.

### Search Tips (IMPORTANT — read these):
- The query parameter does keyword matching on series names. Keep queries simple: "treasury", "bitcoin", "unemployment"
- Use domain parameter to filter: domain="monetary" for rates/yields, domain="markets" for stocks/bonds/forex, domain="labor" for employment, domain="housing" for real estate, domain="prices" for CPI/inflation
- For yield curve data: search_data(query="yield", domain="monetary")
- For stock indices: search_data(query="s&p", domain="markets") or search_data(query="nasdaq", domain="markets")
- For metro data: search_data(query="", metro="nyc") to get all NYC series
- For state data: search_data(query="unemployment", scope="state")
- If a search returns empty, try broader: remove the query and just use domain, or try different keywords
- Series IDs look like: yield_10y, yield_2y, expanded_sp500, crypto_cbbtcusd, metro_nyc_index, state_ca_unemployment

### Visualization Rules:
- ALWAYS use render_dashboard (not render_chart) when you have 2+ dimensions to show
- Layout "2col" for comparisons, "2x2" for comprehensive analysis, "1col" for narratives
- Color palette: #6366f1 (primary), #22c55e (positive), #ef4444 (negative), #f59e0b (warning), #8b5cf6 (secondary), #06b6d4 (tertiary)
- Every chart MUST have an insight string — the "so what" takeaway
- Use annotations for key events (COVID, rate hikes, etc.)
- Dashed lines for reference/benchmark series, solid for the main story
- Title format: "[Subject]: [Observation]" e.g., "Austin Housing: Inventory Surge Signals Correction"

### Common Analysis Patterns:
- **Metro comparison**: Always include the national average as a reference line
- **Trend analysis**: Show both level AND rate-of-change (YoY or MoM)
- **Affordability**: Combine housing costs, wages, and CPI for the full picture
- **Labor market**: Claims + openings + participation tell different stories — show all three
- **Financial conditions**: Yield curve + credit spreads + lending standards = credit cycle position

## Key Economic Relationships You Should Know:
- Housing inventory leads unemployment by ~14 weeks (validated in our data)
- Search anxiety leads jobless claims by ~11 weeks
- New business applications are the best leading indicator of local economic vitality
- The yield curve (10Y-2Y) leads recessions by 12-18 months
- Real wages (nominal minus CPI) matter more than nominal wages for sentiment
- Consumer credit card spending leads retail sales by 4-6 weeks
- Construction employment is the most cyclically sensitive sector`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_data",
    description: "Search the database for series by keyword, domain, scope, or geography. Returns metadata only. Use this first to find what's available.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search keywords" },
        domain: { type: "string", description: "Domain filter: labor, housing, prices, markets, consumer, production, trade, fiscal, monetary, energy, business, index, demographics" },
        tag: { type: "string", description: "Tag slug filter (e.g., 'labor.unemployment', 'markets.crypto')" },
        scope: { type: "string", description: "Scope: national, metro, state, regional, international" },
        metro: { type: "string", description: "Metro ID (e.g., 'nyc', 'aus')" },
        state: { type: "string", description: "State code (e.g., 'TX', 'CA')" },
        limit: { type: "number", description: "Max results (default 25)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_series",
    description: "Fetch time series datapoints. Returns date-value pairs. Limit to 5 series per call for performance.",
    input_schema: {
      type: "object" as const,
      properties: {
        seriesIds: { type: "array", items: { type: "string" }, description: "Series IDs from search_data results" },
        dateFrom: { type: "string", description: "Start date (YYYY-MM-DD)" },
        dateTo: { type: "string", description: "End date (YYYY-MM-DD)" },
      },
      required: ["seriesIds"],
    },
  },
  {
    name: "compute_metric",
    description: "Compute derived metrics from raw series. Use this to create YoY changes, rolling averages, correlations, or spreads that don't exist as raw series.",
    input_schema: {
      type: "object" as const,
      properties: {
        operation: {
          type: "string",
          enum: ["yoy_pct", "mom_pct", "rolling_avg", "rolling_std", "diff", "ratio", "correlation", "zscore"],
          description: "yoy_pct: year-over-year %. mom_pct: month-over-month %. rolling_avg: N-period moving average. diff: series1 - series2. ratio: series1 / series2. correlation: rolling correlation between two series. zscore: standardize to mean=0, std=1.",
        },
        seriesId: { type: "string", description: "Primary series ID" },
        seriesId2: { type: "string", description: "Second series ID (for diff, ratio, correlation)" },
        window: { type: "number", description: "Window size for rolling operations (default 12 for monthly, 52 for weekly)" },
        dateFrom: { type: "string" },
        dateTo: { type: "string" },
      },
      required: ["operation", "seriesId"],
    },
  },
  {
    name: "get_metro_summary",
    description: "Get a metro's current snapshot: behavioral score, official score, vibes gap, and all available series for that metro.",
    input_schema: {
      type: "object" as const,
      properties: {
        metroId: { type: "string", description: "Metro ID (e.g., 'nyc', 'aus', 'den')" },
      },
      required: ["metroId"],
    },
  },
  {
    name: "browse_taxonomy",
    description: "Browse the full data taxonomy — shows all domains, categories, and series counts. Use this to discover what data is available.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "render_chart",
    description: "Render a single focused chart. Use render_dashboard instead for multi-faceted analysis.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: { type: "string", enum: ["line", "area", "bar"] },
        title: { type: "string" },
        subtitle: { type: "string" },
        series: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" }, label: { type: "string" },
              axis: { type: "string", enum: ["left", "right"] },
              color: { type: "string" }, style: { type: "string", enum: ["solid", "dashed", "dotted"] },
            },
            required: ["id", "label"],
          },
        },
        dateRange: { type: "object", properties: { from: { type: "string" }, to: { type: "string" } } },
        annotations: { type: "array", items: { type: "object", properties: { date: { type: "string" }, label: { type: "string" } } } },
        insight: { type: "string", description: "REQUIRED: the key takeaway — what should the viewer learn from this chart?" },
      },
      required: ["type", "title", "series", "insight"],
    },
  },
  {
    name: "render_dashboard",
    description: "Render a multi-chart dashboard. STRONGLY PREFERRED for most analysis. Each chart gets independent axes.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
        layout: { type: "string", enum: ["2col", "3col", "1col", "2x2"], description: "2col for comparisons, 2x2 for comprehensive, 1col for narrative" },
        charts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["line", "area", "bar"] },
              title: { type: "string" },
              series: {
                type: "array",
                items: {
                  type: "object",
                  properties: { id: { type: "string" }, label: { type: "string" }, axis: { type: "string", enum: ["left", "right"] }, color: { type: "string" }, style: { type: "string", enum: ["solid", "dashed", "dotted"] } },
                  required: ["id", "label"],
                },
              },
              dateRange: { type: "object", properties: { from: { type: "string" }, to: { type: "string" } } },
              annotations: { type: "array", items: { type: "object", properties: { date: { type: "string" }, label: { type: "string" } } } },
              insight: { type: "string" },
            },
            required: ["type", "title", "series"],
          },
        },
        insight: { type: "string", description: "REQUIRED: the overarching takeaway from the full dashboard" },
      },
      required: ["title", "charts", "insight"],
    },
  },
];

function executeTool(name: string, input: Record<string, unknown>): unknown {
  const d = getDb();

  switch (name) {
    case "search_data": {
      const result = searchSeries({
        query: (input.query as string) || "",
        domain: input.domain as string | undefined,
        tagSlug: input.tag as string | undefined,
        scope: input.scope as string | undefined,
        metro: input.metro as string | undefined,
        state: input.state as string | undefined,
        limit: (input.limit as number) || 25,
      });
      return result.series;
    }

    case "browse_taxonomy": {
      const taxonomy = getTaxonomy();
      const tree: Record<string, Array<{ category: string; count: number }>> = {};
      for (const t of taxonomy) {
        if (!tree[t.domain]) tree[t.domain] = [];
        tree[t.domain].push({ category: t.category, count: t.series_count });
      }
      return tree;
    }

    case "get_series": {
      const ids = (input.seriesIds as string[]).slice(0, 5);
      const dateFrom = input.dateFrom as string | undefined;
      const dateTo = input.dateTo as string | undefined;
      const result: Record<string, unknown> = {};
      for (const id of ids) {
        const data = getSeriesData(id, dateFrom, dateTo);
        if (data) result[id] = data;
      }
      return result;
    }

    case "compute_metric": {
      const op = input.operation as string;
      const sid = input.seriesId as string;
      const sid2 = input.seriesId2 as string | undefined;
      const window = (input.window as number) || 12;
      const dateFrom = input.dateFrom as string | undefined;
      const dateTo = input.dateTo as string | undefined;

      const data1 = getSeriesData(sid, dateFrom, dateTo);
      if (!data1 || !data1.points.length) return { error: `No data for ${sid}` };

      const pts = data1.points;
      let resultPts: Array<{ date: string; value: number }> = [];
      const resultId = `computed_${op}_${sid.slice(0, 20)}`;

      switch (op) {
        case "yoy_pct": {
          // Find matching points ~52 weeks / 12 months ago
          for (let i = 12; i < pts.length; i++) {
            const current = pts[i].value;
            const prev = pts[i - 12].value;
            if (prev !== 0) {
              resultPts.push({ date: pts[i].date, value: Math.round(((current - prev) / Math.abs(prev)) * 10000) / 100 });
            }
          }
          break;
        }
        case "mom_pct": {
          for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1].value;
            if (prev !== 0) {
              resultPts.push({ date: pts[i].date, value: Math.round(((pts[i].value - prev) / Math.abs(prev)) * 10000) / 100 });
            }
          }
          break;
        }
        case "rolling_avg": {
          for (let i = window - 1; i < pts.length; i++) {
            const slice = pts.slice(i - window + 1, i + 1);
            const avg = slice.reduce((s, p) => s + p.value, 0) / slice.length;
            resultPts.push({ date: pts[i].date, value: Math.round(avg * 1000) / 1000 });
          }
          break;
        }
        case "zscore": {
          const values = pts.map(p => p.value);
          const mean = values.reduce((s, v) => s + v, 0) / values.length;
          const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
          if (std > 0) {
            resultPts = pts.map(p => ({ date: p.date, value: Math.round(((p.value - mean) / std) * 1000) / 1000 }));
          }
          break;
        }
        case "diff":
        case "ratio": {
          if (!sid2) return { error: "seriesId2 required for diff/ratio" };
          const data2 = getSeriesData(sid2, dateFrom, dateTo);
          if (!data2) return { error: `No data for ${sid2}` };
          const map2 = new Map(data2.points.map(p => [p.date, p.value]));
          for (const p of pts) {
            const v2 = map2.get(p.date);
            if (v2 !== undefined) {
              const val = op === "diff" ? p.value - v2 : (v2 !== 0 ? p.value / v2 : 0);
              resultPts.push({ date: p.date, value: Math.round(val * 1000) / 1000 });
            }
          }
          break;
        }
        case "correlation": {
          if (!sid2) return { error: "seriesId2 required for correlation" };
          const data2 = getSeriesData(sid2, dateFrom, dateTo);
          if (!data2) return { error: `No data for ${sid2}` };
          const map2 = new Map(data2.points.map(p => [p.date, p.value]));
          // Rolling correlation
          const aligned = pts.filter(p => map2.has(p.date)).map(p => ({ date: p.date, v1: p.value, v2: map2.get(p.date)! }));
          for (let i = window - 1; i < aligned.length; i++) {
            const slice = aligned.slice(i - window + 1, i + 1);
            const x = slice.map(s => s.v1);
            const y = slice.map(s => s.v2);
            const mx = x.reduce((s, v) => s + v, 0) / x.length;
            const my = y.reduce((s, v) => s + v, 0) / y.length;
            const num = x.reduce((s, v, j) => s + (v - mx) * (y[j] - my), 0);
            const dx = Math.sqrt(x.reduce((s, v) => s + (v - mx) ** 2, 0));
            const dy = Math.sqrt(y.reduce((s, v) => s + (v - my) ** 2, 0));
            const r = dx > 0 && dy > 0 ? num / (dx * dy) : 0;
            resultPts.push({ date: aligned[i].date, value: Math.round(r * 1000) / 1000 });
          }
          break;
        }
        default:
          resultPts = pts;
      }

      return { id: resultId, name: `${op}(${data1.name})`, unit: op.includes("pct") ? "%" : op === "zscore" ? "σ" : data1.unit, points: resultPts };
    }

    case "get_metro_summary": {
      const metroId = input.metroId as string;
      const metroInfo = d.prepare("SELECT metro, metro_name, state FROM series WHERE metro = ? AND scope = 'metro' LIMIT 1").get(metroId) as { metro: string; metro_name: string; state: string } | undefined;
      if (!metroInfo) return { error: `Metro '${metroId}' not found` };
      const indexPt = d.prepare("SELECT value FROM datapoints WHERE series_id = ? ORDER BY date DESC LIMIT 1").get(`metro_${metroId}_index`) as { value: number } | undefined;
      const officialPt = d.prepare("SELECT value FROM datapoints WHERE series_id = ? ORDER BY date DESC LIMIT 1").get(`metro_${metroId}_official`) as { value: number } | undefined;
      const metroSeries = d.prepare("SELECT id, name, category FROM series WHERE metro = ?").all(metroId) as Array<{ id: string; name: string; category: string }>;
      return {
        id: metroId, name: metroInfo.metro_name, state: metroInfo.state,
        currentScore: indexPt ? Math.round(indexPt.value) : null,
        officialIndex: officialPt ? Math.round(officialPt.value) : null,
        vibesGap: indexPt && officialPt ? Math.round(indexPt.value - officialPt.value) : null,
        availableSeries: metroSeries.map(s => ({ id: s.id, name: s.name })),
      };
    }

    case "render_chart": {
      const series = input.series as Array<{ id: string }>;
      const dateRange = input.dateRange as { from?: string; to?: string } | undefined;
      const chartData: Record<string, Array<{ date: string; value: number }>> = {};
      for (const s of (series || []).slice(0, 10)) {
        const data = getSeriesData(s.id, dateRange?.from, dateRange?.to);
        if (data?.points.length) chartData[s.id] = data.points;
      }
      return { rendered: true, seriesCount: series?.length || 0, data: chartData };
    }

    case "render_dashboard": {
      const charts = input.charts as Array<{ series: Array<{ id: string }>; dateRange?: { from?: string; to?: string } }>;
      const allData: Record<string, Array<{ date: string; value: number }>> = {};
      for (const chart of (charts || []).slice(0, 6)) {
        for (const s of (chart.series || []).slice(0, 10)) {
          if (allData[s.id]) continue;
          const data = getSeriesData(s.id, chart.dateRange?.from, chart.dateRange?.to);
          if (data?.points.length) allData[s.id] = data.points;
        }
      }
      return { rendered: true, chartCount: charts?.length || 0, data: allData };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY not set. Add it to .env.local" }, { status: 500 });
  }

  const stats = getStats();
  const systemPrompt = SYSTEM_PROMPT(stats);

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m: { role: string; content: string }) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  try {
    let currentMessages = [...anthropicMessages];
    const allContent: Array<{ type: string; text?: string; chart?: unknown; dashboard?: unknown; seriesData?: unknown }> = [];
    let iterations = 0;

    while (iterations < 10) {
      iterations++;

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: systemPrompt,
        tools: TOOLS,
        messages: currentMessages,
      });

      let hasToolUse = false;
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "text") {
          allContent.push({ type: "text", text: block.text });
        } else if (block.type === "tool_use") {
          hasToolUse = true;
          const result = executeTool(block.name, block.input as Record<string, unknown>);

          if (block.name === "render_chart") {
            const chartResult = result as { data?: Record<string, unknown> };
            allContent.push({ type: "chart", chart: block.input, seriesData: chartResult.data });
          } else if (block.name === "render_dashboard") {
            const dashResult = result as { data?: Record<string, unknown> };
            allContent.push({ type: "dashboard", dashboard: block.input, seriesData: dashResult.data });
          }

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }

      if (hasToolUse) {
        currentMessages = [
          ...currentMessages,
          { role: "assistant" as const, content: response.content },
          { role: "user" as const, content: toolResults },
        ];
        continue;
      }

      // If the model responded with text only and no tools on an early iteration,
      // nudge it to actually use tools and visualize
      if (iterations <= 2 && !allContent.some(c => c.type === "chart" || c.type === "dashboard")) {
        currentMessages = [
          ...currentMessages,
          { role: "assistant" as const, content: response.content },
          { role: "user" as const, content: "Now search for the relevant data using your tools, fetch the series, and create a visualization with render_dashboard. Do not respond with text only." },
        ];
        continue;
      }

      break;
    }

    return Response.json({ content: allContent });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
