import Anthropic from "@anthropic-ai/sdk";
import catalogData from "@/data/catalog.json";
import dashboardData from "@/data/dashboard.json";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

// Pre-load data
const catalogIndex = (catalogData as unknown as { index: Array<Record<string, unknown>> }).index;
const seriesMap = (catalogData as unknown as { series: Record<string, Array<{ date: string; value: number }>> }).series;

const SYSTEM_PROMPT = `You are Undercurrent's data analyst agent. You have access to 543 economic time series spanning 50 US metros, covering behavioral sentiment, housing, labor, prices, macro indicators, and more — with up to 5 years of weekly data.

Your job: answer the user's questions by searching for relevant data, fetching time series, and rendering charts. Be concise and insight-driven — explain the "so what", not just the "what".

Available data categories: Index, Signals, Macro, Markets, Housing, Prices, Labor, Consumer
Available scopes: national (32 series), metro (508 series across 50 cities), regional (3 gas price series)
Sources: FRED, BLS, Redfin, Zillow, Google Trends, EIA, Undercurrent composite

Workflow:
1. Use search_data to find relevant series
2. Use get_series to fetch the actual data points
3. Use render_chart to visualize — choose chart type, assign axes smartly (dual axes when scales differ >10x)
4. Provide a brief insight in your chat response

When comparing series with very different scales (e.g., S&P 500 vs z-scores), use dual axes (left/right).
When the user asks about a metro, search for that metro's signals, index, and context data.
Keep chart titles short and descriptive. Always include an insight string in render_chart.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_data",
    description: "Search the data catalog for series matching a query. Returns metadata only (no data points). Use this first to find relevant series IDs.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search term (e.g., 'austin housing', 'S&P', 'unemployment')" },
        category: { type: "string", description: "Filter by category: Index, Signals, Macro, Markets, Housing, Prices, Labor, Consumer" },
        scope: { type: "string", description: "Filter by scope: national, metro, regional" },
        metro: { type: "string", description: "Filter by metro ID (e.g., 'nyc', 'aus', 'den')" },
        limit: { type: "number", description: "Max results (default 15)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_series",
    description: "Fetch actual time series data points for given series IDs. Use after search_data to get the numbers.",
    input_schema: {
      type: "object" as const,
      properties: {
        seriesIds: { type: "array", items: { type: "string" }, description: "Array of series IDs from search_data results" },
        dateFrom: { type: "string", description: "Start date filter (YYYY-MM-DD)" },
        dateTo: { type: "string", description: "End date filter (YYYY-MM-DD)" },
      },
      required: ["seriesIds"],
    },
  },
  {
    name: "get_metro_summary",
    description: "Get a metro's current snapshot: behavioral score, sentiment gap, affordability, context data.",
    input_schema: {
      type: "object" as const,
      properties: {
        metroId: { type: "string", description: "Metro ID (e.g., 'nyc', 'aus', 'den', 'chi')" },
      },
      required: ["metroId"],
    },
  },
  {
    name: "render_chart",
    description: "Render an interactive chart in the artifact panel. Call this after fetching data to visualize it.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: { type: "string", enum: ["line", "area", "bar"], description: "Chart type" },
        title: { type: "string", description: "Chart title" },
        subtitle: { type: "string", description: "Optional subtitle" },
        series: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Series ID from the catalog" },
              label: { type: "string", description: "Display label for the legend" },
              axis: { type: "string", enum: ["left", "right"], description: "Which Y-axis (use right for different scales)" },
              color: { type: "string", description: "Hex color (e.g., '#6366f1')" },
              style: { type: "string", enum: ["solid", "dashed", "dotted"], description: "Line style" },
            },
            required: ["id", "label"],
          },
          description: "Series to plot",
        },
        dateRange: {
          type: "object",
          properties: {
            from: { type: "string" },
            to: { type: "string" },
          },
          description: "Optional date range filter",
        },
        annotations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string" },
              label: { type: "string" },
            },
          },
          description: "Optional date annotations",
        },
        insight: { type: "string", description: "Key takeaway to display below the chart" },
      },
      required: ["type", "title", "series"],
    },
  },
];

function executeTool(name: string, input: Record<string, unknown>): unknown {
  switch (name) {
    case "search_data": {
      const query = ((input.query as string) || "").toLowerCase();
      const category = input.category as string | undefined;
      const scope = input.scope as string | undefined;
      const metro = input.metro as string | undefined;
      const limit = (input.limit as number) || 20;

      // Split query into individual terms for AND-style matching
      const terms = query.split(/\s+/).filter(Boolean);

      // Score each series by relevance
      const scored = catalogIndex.map((s: Record<string, unknown>) => {
        // Hard filters
        if (category && s.category !== category) return null;
        if (scope && s.scope !== scope) return null;
        if (metro && s.metro !== metro) return null;

        const name = ((s.name as string) || "").toLowerCase();
        const cat = ((s.category as string) || "").toLowerCase();
        const metroName = ((s.metroName as string) || "").toLowerCase();
        const metroId = ((s.metro as string) || "").toLowerCase();
        const src = ((s.source as string) || "").toLowerCase();
        const searchable = `${name} ${cat} ${metroName} ${metroId} ${src}`;

        // Every term must match somewhere (AND logic)
        let score = 0;
        for (const term of terms) {
          if (!searchable.includes(term)) return null;
          // Bonus for name match vs other field match
          if (name.includes(term)) score += 3;
          else if (metroName.includes(term) || metroId.includes(term)) score += 2;
          else score += 1;
        }

        // Bonus for metro filter match via query (e.g. user says "austin" without using metro param)
        if (!metro && metroId && terms.some(t => metroId.includes(t) || metroName.includes(t))) {
          score += 2;
        }

        return { item: s, score };
      }).filter(Boolean) as Array<{ item: Record<string, unknown>; score: number }>;

      // Sort by relevance score descending
      scored.sort((a, b) => b.score - a.score);

      return scored.slice(0, limit).map((s) => s.item);
    }

    case "get_series": {
      const ids = input.seriesIds as string[];
      const dateFrom = input.dateFrom as string | undefined;
      const dateTo = input.dateTo as string | undefined;

      const result: Record<string, unknown> = {};
      for (const id of ids.slice(0, 5)) { // Max 5 series per call
        const points = seriesMap[id];
        if (!points) continue;

        let filtered = points;
        if (dateFrom) filtered = filtered.filter((p) => p.date >= dateFrom);
        if (dateTo) filtered = filtered.filter((p) => p.date <= dateTo);

        const info = catalogIndex.find((s: Record<string, unknown>) => s.id === id);
        result[id] = {
          name: info?.name || id,
          unit: info?.unit || "",
          points: filtered,
        };
      }
      return result;
    }

    case "get_metro_summary": {
      const metroId = input.metroId as string;
      const metros = (dashboardData as unknown as { metros: Array<Record<string, unknown>> }).metros;
      const metro = metros.find((m) => m.id === metroId);
      if (!metro) return { error: `Metro '${metroId}' not found` };
      // Return summary without sparkHistory to save tokens
      const { sparkHistory, ...summary } = metro as Record<string, unknown>;
      return summary;
    }

    case "render_chart": {
      // Server-side: just confirm. The client intercepts the tool call args.
      const series = input.series as Array<Record<string, unknown>>;
      return { rendered: true, seriesCount: series?.length || 0 };
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

  // Build Anthropic messages
  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m: { role: string; content: string }) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  try {
    // Agentic loop: keep calling Claude until it stops using tools
    let currentMessages = [...anthropicMessages];
    const allContent: Array<{ type: string; text?: string; chart?: unknown }> = [];
    let iterations = 0;
    const maxIterations = 8;

    while (iterations < maxIterations) {
      iterations++;

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: currentMessages,
      });

      // Process content blocks
      let hasToolUse = false;
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "text") {
          allContent.push({ type: "text", text: block.text });
        } else if (block.type === "tool_use") {
          hasToolUse = true;

          // Execute the tool
          const result = executeTool(block.name, block.input as Record<string, unknown>);

          // If it's render_chart, also capture the spec for the frontend
          if (block.name === "render_chart") {
            allContent.push({ type: "chart", chart: block.input });
          }

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }

      // If Claude used tools, feed results back and loop
      if (hasToolUse) {
        currentMessages = [
          ...currentMessages,
          { role: "assistant" as const, content: response.content },
          { role: "user" as const, content: toolResults },
        ];
        continue;
      }

      // No tool use — we're done
      break;
    }

    return Response.json({ content: allContent });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
