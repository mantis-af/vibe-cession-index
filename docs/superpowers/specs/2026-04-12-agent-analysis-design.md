# Agent-Driven Analysis — Design Spec

## Overview

A new `/analyze` page on the Undercurrent site with a split-pane interface: chat on the left, live chart artifact on the right. The user types natural language questions about economic data and a Claude agent searches the 543-series data catalog, decides what to visualize, and renders interactive charts in the artifact panel. Powered by the Anthropic SDK with a standard API key, running locally.

## Architecture

```
User ←→ React Chat UI ←→ Next.js API Route (/api/chat) ←→ Anthropic SDK (Claude)
                                    │
                                    ├── Tool: search_data (query catalog)
                                    ├── Tool: get_series (fetch time series points)
                                    ├── Tool: get_metro_summary (metro snapshot)
                                    └── Tool: render_chart (structured chart spec → frontend)
```

### Data Flow

1. User types a question in the chat panel
2. Frontend POSTs to `/api/chat` with the message + conversation history
3. API route calls Claude via Anthropic SDK with the system prompt + tools
4. Claude decides which tools to call — typically `search_data` first, then `get_series`, then `render_chart`
5. Tool results are fed back to Claude for reasoning
6. Claude's final response includes chat text + a `render_chart` tool call
7. Frontend renders the chat text on the left and the chart spec on the right
8. Streaming: use the Anthropic streaming API so the chat panel updates in real-time

### System Prompt

The agent's system prompt gives it:
- Knowledge of all available data categories, scopes, and sources
- Instructions on how to compose multi-series charts with dual axes
- Guidance on choosing chart types (line for time series, bar for comparisons, area for cumulative)
- A persona: concise, data-driven analyst — explain the "so what" not just the "what"

## Tools

### `search_data`
**Purpose**: Search the catalog for series matching a query.
**Input**: `{ query: string, category?: string, scope?: string, metro?: string, limit?: number }`
**Output**: Array of `{ id, name, category, scope, metro, unit, frequency, pointCount }`
**Implementation**: In-memory filter/search over catalog_index.json. Fuzzy match on name.

### `get_series`
**Purpose**: Fetch actual time series data for one or more series IDs.
**Input**: `{ seriesIds: string[], dateFrom?: string, dateTo?: string }`
**Output**: `{ [seriesId]: { name, unit, points: [{ date, value }] } }`
**Implementation**: Read from catalog.json (the full 4.6MB file, loaded once server-side).

### `get_metro_summary`
**Purpose**: Get a metro's current snapshot — score, drivers, context, affordability.
**Input**: `{ metroId: string }`
**Output**: Metro summary object (from dashboard.json).

### `render_chart`
**Purpose**: Tell the frontend to render a visualization. This is the artifact.
**Input**:
```typescript
{
  type: "line" | "area" | "bar" | "scatter",
  title: string,
  subtitle?: string,
  series: Array<{
    id: string,        // series ID from catalog
    label: string,     // display label
    axis: "left" | "right",
    color?: string,    // hex color
    style?: "solid" | "dashed" | "dotted",
  }>,
  dateRange?: { from?: string, to?: string },
  annotations?: Array<{ date: string, label: string }>,
  insight?: string,  // key takeaway displayed below the chart
}
```
**Output**: `{ rendered: true, seriesCount: N }` — returned to Claude as confirmation so it can reference the chart in its response.
**Implementation**: The API route executes this tool by returning `{ rendered: true }` to Claude. Simultaneously, the streamed response includes the tool call arguments, which the frontend intercepts and renders as a Recharts chart in the artifact panel. Claude never sees the rendered chart — it reasons from the data it already fetched via `get_series`.

## Frontend Components

### `/analyze` page layout
- Split pane: left 40% chat, right 60% artifact
- Mobile: stacked (chat on top, artifact below)
- Chat panel: message list + input box, streaming text display
- Artifact panel: renders the latest `render_chart` spec, keeps a history of past charts (tabs or stack)

### Chat Component
- Conversation history stored in React state
- Streams Claude's response token-by-token via the API route
- Tool calls are shown as collapsible "thinking" blocks (optional)
- Input box with Enter-to-send, Shift+Enter for newline

### Artifact Renderer
- Receives a chart spec object
- Renders using Recharts (already installed)
- Handles dual Y-axes, multiple series, annotations
- Chart type switching (line/area/bar) based on spec
- Shows title, subtitle, insight text below the chart
- History: tabs showing past charts from the conversation

## API Route (`/api/chat`)

- `POST /api/chat` with `{ messages: Message[], stream: boolean }`
- Uses `@anthropic-ai/sdk` (install as dependency)
- Reads `ANTHROPIC_API_KEY` from env
- Loads catalog data once on cold start (module-level)
- Implements tool execution server-side:
  - `search_data` → filter catalog index
  - `get_series` → read from catalog.json
  - `get_metro_summary` → read from dashboard.json
  - `render_chart` → pass through to client (no server-side rendering)
- Streams response back to client using `ReadableStream`
- Model: `claude-sonnet-4-20250514` (fast, cheap, good at tool use)

## Data Requirements

Current catalog: 543 series, 4.6MB. This is sufficient for v1. The catalog is loaded into memory on the API route's first invocation and reused across requests.

For "beefing up" data later, the tool interface stays the same — we just add more series to the catalog. No architectural changes needed.

## Auth / Security

- API key in `.env.local` (gitignored)
- No public access — this runs on localhost only for now
- No user auth needed

## Dependencies

- `@anthropic-ai/sdk` — Anthropic TypeScript SDK
- Recharts (already installed)
- No new Python dependencies

## Out of Scope (for this spec)

- Public-facing deployment (requires rate limiting, auth, cost management)
- Persistent conversation history (conversations live in React state only)
- Custom chart editing UI (Claude controls the chart, user controls via chat)
- Additional data sources (separate work item — this spec assumes current 543 series)
