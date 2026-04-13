import Anthropic from "@anthropic-ai/sdk";
import { getDb, getDbStats as getStats, searchSeries, getSeriesData, getTaxonomy } from "@/lib/db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const SYSTEM_PROMPT_TEMPLATE = (stats: { series: number; domains: string[] }) => `You are Undercurrent's data analyst agent. You have access to ${stats.series} economic time series in a SQLite database spanning 50 US metros and national/state-level data.

Data is organized into ${stats.domains.length} domains: ${stats.domains.join(", ")}.
Each domain has categories (e.g., labor → unemployment, employment, wages, claims, jolts).
Use the domain parameter in search_data to filter by domain, or browse_taxonomy to see the full hierarchy.

Data spans up to 5 years. Sources include FRED, BLS, Redfin, Zillow, Google Trends, and EIA.

Your job: answer the user's questions by searching for relevant data, fetching time series, and rendering charts. Be concise and insight-driven — explain the "so what", not just the "what".

Workflow:
1. Use search_data to find relevant series
2. Use get_series to fetch the actual data points
3. Visualize using render_chart (single chart) or render_dashboard (multiple charts in a grid)
4. Provide a brief insight in your chat response

IMPORTANT visualization guidelines:
- Use render_dashboard when the analysis involves DIFFERENT aspects that deserve separate axes. Each chart gets independent Y-axes.
- Use render_chart for a focused single visualization where series are directly comparable.
- Prefer render_dashboard for most multi-faceted questions.
- Dashboard layouts: "2col" (2 side by side), "3col" (3 across), "2x2" (4 grid), "1col" (stacked).
- Use distinct colors for each series. Use dashed lines for secondary/reference series.
- Keep chart titles short. Always include insight strings.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_data",
    description: "Search the database for series matching a query. Returns metadata (no data points). Use this first to find relevant series IDs.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search term (e.g., 'austin housing', 'S&P', 'unemployment', 'gold price', 'treasury yield')" },
        domain: { type: "string", description: "Filter by domain: labor, housing, prices, markets, consumer, production, trade, fiscal, monetary, energy, business, index, demographics" },
        tag: { type: "string", description: "Filter by tag slug (e.g., 'labor.unemployment', 'markets.crypto', 'housing.prices.state')" },
        scope: { type: "string", description: "Filter: national, metro, state, regional, international" },
        metro: { type: "string", description: "Filter by metro ID (e.g., 'nyc', 'aus')" },
        state: { type: "string", description: "Filter by state code (e.g., 'TX', 'CA')" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_series",
    description: "Fetch actual time series data points for given series IDs. Use after search_data.",
    input_schema: {
      type: "object" as const,
      properties: {
        seriesIds: { type: "array", items: { type: "string" }, description: "Array of series IDs from search_data" },
        dateFrom: { type: "string", description: "Start date (YYYY-MM-DD)" },
        dateTo: { type: "string", description: "End date (YYYY-MM-DD)" },
      },
      required: ["seriesIds"],
    },
  },
  {
    name: "get_metro_summary",
    description: "Get a metro's current snapshot: behavioral score, sentiment gap, affordability, context.",
    input_schema: {
      type: "object" as const,
      properties: {
        metroId: { type: "string", description: "Metro ID (e.g., 'nyc', 'aus', 'den')" },
      },
      required: ["metroId"],
    },
  },
  {
    name: "render_chart",
    description: "Render a single interactive chart in the artifact panel.",
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
              id: { type: "string" },
              label: { type: "string" },
              axis: { type: "string", enum: ["left", "right"] },
              color: { type: "string" },
              style: { type: "string", enum: ["solid", "dashed", "dotted"] },
            },
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
  {
    name: "render_dashboard",
    description: "Render multiple charts in a dashboard grid. Use for multi-faceted analysis with independent axes per chart.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
        layout: { type: "string", enum: ["2col", "3col", "1col", "2x2"] },
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
                  properties: {
                    id: { type: "string" },
                    label: { type: "string" },
                    axis: { type: "string", enum: ["left", "right"] },
                    color: { type: "string" },
                    style: { type: "string", enum: ["solid", "dashed", "dotted"] },
                  },
                  required: ["id", "label"],
                },
              },
              dateRange: { type: "object", properties: { from: { type: "string" }, to: { type: "string" } } },
              insight: { type: "string" },
            },
            required: ["type", "title", "series"],
          },
        },
        insight: { type: "string" },
      },
      required: ["title", "charts"],
    },
  },
  {
    name: "browse_taxonomy",
    description: "Browse the data taxonomy — shows all domains and their categories with series counts. Use this to discover what data is available before searching.",
    input_schema: {
      type: "object" as const,
      properties: {},
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
        limit: (input.limit as number) || 20,
      });
      return result.series;
    }

    case "browse_taxonomy": {
      const taxonomy = getTaxonomy();
      // Group by domain
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

    case "get_metro_summary": {
      const metroId = input.metroId as string;
      // Get metro info from SQLite
      const metroInfo = d.prepare("SELECT metro, metro_name, state FROM series WHERE metro = ? AND scope = 'metro' LIMIT 1").get(metroId) as { metro: string; metro_name: string; state: string } | undefined;
      if (!metroInfo) return { error: `Metro '${metroId}' not found` };

      // Get latest scores
      const indexPt = d.prepare("SELECT value FROM datapoints WHERE series_id = ? ORDER BY date DESC LIMIT 1").get(`metro_${metroId}_index`) as { value: number } | undefined;
      const officialPt = d.prepare("SELECT value FROM datapoints WHERE series_id = ? ORDER BY date DESC LIMIT 1").get(`metro_${metroId}_official`) as { value: number } | undefined;

      // Get all series for this metro
      const metroSeries = d.prepare("SELECT id, name, category FROM series WHERE metro = ?").all(metroId) as Array<{ id: string; name: string; category: string }>;

      return {
        id: metroId,
        name: metroInfo.metro_name,
        state: metroInfo.state,
        currentScore: indexPt ? Math.round(indexPt.value) : null,
        officialIndex: officialPt ? Math.round(officialPt.value) : null,
        vibesGap: indexPt && officialPt ? Math.round(indexPt.value - officialPt.value) : null,
        availableSeries: metroSeries.map(s => ({ id: s.id, name: s.name })),
      };
    }

    case "render_chart": {
      const series = input.series as Array<Record<string, unknown>>;
      // Also fetch data for each series so frontend can render without catalog
      const chartSeriesData: Record<string, Array<{date: string; value: number}>> = {};
      const dateRange = input.dateRange as { from?: string; to?: string } | undefined;
      for (const s of (series || []).slice(0, 10)) {
        const sid = s.id as string;
        let sql = "SELECT date, value FROM datapoints WHERE series_id = ?";
        const params: string[] = [sid];
        if (dateRange?.from) { sql += " AND date >= ?"; params.push(dateRange.from); }
        if (dateRange?.to) { sql += " AND date <= ?"; params.push(dateRange.to); }
        sql += " ORDER BY date";
        const pts = d.prepare(sql).all(...params) as Array<{date: string; value: number}>;
        if (pts.length > 0) chartSeriesData[sid] = pts;
      }
      return { rendered: true, seriesCount: series?.length || 0, data: chartSeriesData };
    }

    case "render_dashboard": {
      const charts = input.charts as Array<{ series: Array<{ id: string }>; dateRange?: { from?: string; to?: string } }>;
      const allData: Record<string, Array<{date: string; value: number}>> = {};
      for (const chart of (charts || []).slice(0, 6)) {
        const dr = chart.dateRange;
        for (const s of (chart.series || []).slice(0, 10)) {
          if (allData[s.id]) continue;
          let sql = "SELECT date, value FROM datapoints WHERE series_id = ?";
          const params: string[] = [s.id];
          if (dr?.from) { sql += " AND date >= ?"; params.push(dr.from); }
          if (dr?.to) { sql += " AND date <= ?"; params.push(dr.to); }
          sql += " ORDER BY date";
          const pts = d.prepare(sql).all(...params) as Array<{date: string; value: number}>;
          if (pts.length > 0) allData[s.id] = pts;
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
  const systemPrompt = SYSTEM_PROMPT_TEMPLATE(stats);

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m: { role: string; content: string }) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  try {
    let currentMessages = [...anthropicMessages];
    const allContent: Array<{ type: string; text?: string; chart?: unknown; dashboard?: unknown; seriesData?: unknown }> = [];
    let iterations = 0;

    while (iterations < 8) {
      iterations++;

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
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
            // Attach fetched data to the chart spec for frontend rendering
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
      break;
    }

    return Response.json({ content: allContent });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
