# Undercurrent — Project Guide

## What This Is

A real-time behavioral economic intelligence platform tracking 50 US metros. Composites 8 high-frequency behavioral signals into a 0-100 index, compared against a 5-signal official government data index to produce a "Sentiment Gap." Includes forecasting, affordability scoring, AI impact tracking, and 5 years of history.

## Architecture

```
pipelines/          → Python data collection + computation (10 pipelines)
  sources/          → Individual data fetchers (Google Trends, BLS, FRED, Redfin, etc.)
  compute_index.py  → Main index computation (behavioral + official composites)
  compute_leadlag.py → Cross-correlation analysis for predictive validation
  compute_forecast.py → Forward projections from lead/lag regressions
  generate_narrative.py → Auto-generated weekly written analysis
  config.py         → Metro definitions (50 metros with DMA, BLS, FRED codes)

src/                → Next.js 15 frontend (TypeScript, Tailwind, shadcn/ui)
  app/              → Pages: /, /insights, /compare, /metro/[id], /methodology
  components/       → React components (dashboard sections, charts, motion)
  lib/              → Types, data loaders, color utilities
  data/             → Pipeline output consumed at build time
    dashboard.json  → Lightweight summaries (595KB) for overview
    metros/*.json   → Full 5-year history per metro (~80KB each)
    forecast.json   → Forward projections
    leadlag.json    → Cross-correlation analysis
    narrative.json  → Auto-generated weekly text
```

## Key Commands

```bash
# Frontend
npm run dev          # Dev server at localhost:3000
npm run build        # Production build (verifies everything compiles)

# Data pipelines (run from project root)
pipelines/.venv/bin/python pipelines/run_all.py              # Full pipeline run
pipelines/.venv/bin/python pipelines/run_all.py --skip-trends # Skip slow Google Trends
pipelines/.venv/bin/python pipelines/compute_index.py         # Just recompute index
pipelines/.venv/bin/python pipelines/compute_forecast.py      # Just recompute forecasts
```

## Data Flow

```
10 Python Pipelines → output/*.json → compute_index.py → dashboard.json + metros/*.json → Next.js
```

The overview page loads `dashboard.json` (595KB, lightweight metro summaries with 52-week sparklines + full national 260-week history). Metro detail pages load individual `metros/{id}.json` files (~80KB each with full 5-year history).

## Important Patterns

- **Signal weights are in compute_index.py** (SIGNAL_WEIGHTS dict), NOT in the frontend types.ts
- **Google Trends geo format**: `US-{STATE}-{DMA}` (e.g., `US-NY-501`). DMA alone doesn't work.
- **Google Trends TrendReq**: Don't use `retries` or `backoff_factor` kwargs — breaks with newer urllib3
- **FRED data**: CSV fallback (`fred.stlouisfed.org/graph/fredgraph.csv?id=SERIES&cosd=DATE`) works without API key
- **BLS API**: POST to `api.bls.gov/publicAPI/v2/timeseries/data/` with series IDs. Values can be "-", always handle gracefully.
- **Redfin**: Metro names follow format `"City, ST metro area"`. Auto-generated from config.
- **Data split**: dashboard.json has lightweight summaries, full data in per-metro files. loadFullMetro() in load-data.ts handles loading individual metros.
