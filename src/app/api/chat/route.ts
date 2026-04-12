import Anthropic from "@anthropic-ai/sdk";
import Database from "better-sqlite3";
import path from "path";
import dashboardData from "@/data/dashboard.json";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

// SQLite connection (lazy init)
let db: Database.Database | null = null;
function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), "data", "undercurrent.db");
    db = new Database(dbPath, { readonly: true });
    db.pragma("journal_mode = WAL");
  }
  return db;
}

// Get DB stats for the system prompt
function getDbStats(): { series: number; datapoints: number; categories: string[] } {
  const d = getDb();
  const series = (d.prepare("SELECT COUNT(*) as c FROM series").get() as { c: number }).c;
  const datapoints = (d.prepare("SELECT COUNT(*) as c FROM datapoints").get() as { c: number }).c;
  const cats = d.prepare("SELECT DISTINCT category FROM series ORDER BY category").all() as Array<{ category: string }>;
  return { series, datapoints, categories: cats.map((r) => r.category) };
}

const SYSTEM_PROMPT_TEMPLATE = (stats: { series: number; categories: string[] }) => `You are Undercurrent's data analyst agent. You have access to ${stats.series} economic time series in a SQLite database spanning 50 US metros and national/state-level data, covering: ${stats.categories.join(", ")}.

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
        query: { type: "string", description: "Search term (e.g., 'austin housing', 'S&P', 'unemployment texas', 'gold price', 'treasury yield')" },
        category: { type: "string", description: "Filter by category (e.g., Labor, Housing, Markets, Prices, Commodities, GDP, Rates, Fiscal, Monetary, Production, etc.)" },
        scope: { type: "string", description: "Filter: national, metro, state, regional" },
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
];

function executeTool(name: string, input: Record<string, unknown>): unknown {
  const d = getDb();

  switch (name) {
    case "search_data": {
      const query = ((input.query as string) || "").toLowerCase();
      const category = input.category as string | undefined;
      const scope = input.scope as string | undefined;
      const metro = input.metro as string | undefined;
      const state = input.state as string | undefined;
      const limit = (input.limit as number) || 20;

      const terms = query.split(/\s+/).filter(Boolean);
      let conditions: string[] = [];
      let params: (string | number)[] = [];

      for (const term of terms) {
        conditions.push("(LOWER(name) LIKE ? OR LOWER(metro_name) LIKE ? OR LOWER(category) LIKE ? OR LOWER(COALESCE(metro,'')) LIKE ? OR LOWER(COALESCE(state,'')) LIKE ? OR LOWER(description) LIKE ?)");
        const t = `%${term}%`;
        params.push(t, t, t, t, t, t);
      }

      if (category) { conditions.push("category = ?"); params.push(category); }
      if (scope) { conditions.push("scope = ?"); params.push(scope); }
      if (metro) { conditions.push("metro = ?"); params.push(metro); }
      if (state) { conditions.push("state = ?"); params.push(state); }

      const where = conditions.length > 0 ? conditions.join(" AND ") : "1=1";
      const rows = d.prepare(`
        SELECT id, name, category, scope, metro, metro_name, state, unit, frequency, source_id, point_count
        FROM series WHERE ${where} ORDER BY point_count DESC LIMIT ?
      `).all(...params, limit);

      return rows;
    }

    case "get_series": {
      const ids = (input.seriesIds as string[]).slice(0, 5);
      const dateFrom = input.dateFrom as string | undefined;
      const dateTo = input.dateTo as string | undefined;

      const result: Record<string, unknown> = {};
      for (const id of ids) {
        const info = d.prepare("SELECT name, unit FROM series WHERE id = ?").get(id) as { name: string; unit: string } | undefined;
        if (!info) continue;

        let sql = "SELECT date, value FROM datapoints WHERE series_id = ?";
        const params: (string)[] = [id];
        if (dateFrom) { sql += " AND date >= ?"; params.push(dateFrom); }
        if (dateTo) { sql += " AND date <= ?"; params.push(dateTo); }
        sql += " ORDER BY date";

        const points = d.prepare(sql).all(...params);
        result[id] = { name: info.name, unit: info.unit, points };
      }
      return result;
    }

    case "get_metro_summary": {
      const metroId = input.metroId as string;
      const metros = (dashboardData as unknown as { metros: Array<Record<string, unknown>> }).metros;
      const metro = metros.find((m) => m.id === metroId);
      if (!metro) return { error: `Metro '${metroId}' not found` };
      const { sparkHistory, ...summary } = metro as Record<string, unknown>;
      return summary;
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

  const stats = getDbStats();
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
