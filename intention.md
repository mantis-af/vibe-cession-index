# Undercurrent — Intention

> Working name. Subject to change.

## Mission

A free, open-source economic research platform that makes public data actually usable. A Bloomberg terminal for people trying to understand the economy — not trade it.

By combining fragmented public datasets into a single curated, searchable, agent-powered platform, Undercurrent gives researchers, journalists, policymakers, and curious citizens the tools that today only exist behind $24K/year terminals.

## The Problem

Economic data is abundant but fragmented:

- **FRED alone has 800K+ series.** BLS, Census, Redfin, Zillow, EIA, Google Trends, and Indeed all publish freely. But nobody has stitched them together at the metro level in a way that's searchable and comparable.
- **The tools are built for quants, not humans.** FRED's interface is powerful but intimidating. Most people bouncing between government sites are copy-pasting into spreadsheets.
- **The people who most need to understand the economy have the worst tools.** Journalists on deadline, city planners comparing metros, citizens trying to understand if their local economy is actually improving — they're all underserved.

## The Product

Three layers, each building on the last:

### Layer 1 — The Dashboard (free, open source)

The reference site. A curated composite index across 50 US metros that blends behavioral signals (Google Trends anxiety, housing inventory velocity, job postings) with official statistics (BLS unemployment, CPI, FRED macro) into a single 0-100 score. The "Vibes Gap" — behavioral sentiment vs. official data — is the signature metric.

Includes: data explorer with 1,100+ searchable time series, metro comparisons, 5-year history, lead/lag analysis, forecasting, and auto-generated weekly narratives.

All data, all visualizations, completely free. This layer builds audience, SEO, citations, and credibility.

### Layer 2 — The Research Agent (freemium)

A Claude Agent SDK-powered economic analyst that can search the full dataset, answer hard questions with charts and citations, and help users build research narratives from real data.

Not a chatbot. A research tool. "Which metros saw unemployment claims spike before housing inventory rose in the last 3 recessions?" should return a sourced, visualized answer.

- **Free tier**: daily query limit, basic chart rendering
- **Pro tier**: unlimited queries, saved analysis sessions, exportable reports (CSV, PDF), conversation history
- **Team tier**: shared workspaces, collaborative annotations, embeddable widgets

### Layer 3 — Custom Indices & Alerts (paid)

Power users construct their own composite indicators — pick signals, set weights, backtest against history. Set watchlists and get alerted when thresholds cross (e.g., "notify me when Austin's Vibes Gap exceeds 10 points").

User-created indices can be published (with permission), creating a content flywheel where the platform's value grows with its user base.

## What's Proprietary

The raw data is public. The value is in what we do with it:

- **Curation**: selecting the ~1,100 series that matter for metro-level wellbeing out of 800K+ available, cross-joining them at the metro level, normalizing and cleaning them
- **The Index**: the composite methodology, signal weighting, behavioral vs. official framing, the "Vibes Gap" concept
- **The Agent**: natural language economic research against a structured, curated database — something nobody else offers
- **The Brand**: if "the Undercurrent Index" gets cited by journalists and researchers, that brand equity compounds over time. S&P doesn't own stock prices, but they own "the S&P 500"

## Business Model

**Open core freemium.**

The dashboard is free and open source — it builds audience and authority. The research agent costs real money to run (Claude API calls per query), so paid tiers naturally pass through cost plus margin.

Target segments: independent researchers, journalists, policy analysts, economic development offices, econ-curious public.

Revenue math (napkin): agent Pro tier at ~$15/mo. At 500 subscribers = $90K ARR. At 2,000 = $360K ARR. The free dashboard is the top of funnel.

## Technical Foundation

What exists today:

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Recharts. Dark theme, data-dense, desktop-first.
- **Data pipelines**: 10 Python pipelines pulling from FRED, BLS, Redfin, Zillow, Google Trends, EIA, Indeed, Census. Automated via `run_all.py`.
- **Database**: SQLite with 1,100+ series, 195K+ datapoints, full-text search.
- **Agent**: Claude-powered analyst with tool use (search_data, get_series, render_chart, render_dashboard). Currently raw Anthropic SDK — planned migration to Claude Agent SDK for multi-step reasoning and composable workflows.
- **Deployment**: Vercel (frontend), data pipelines run on cron.

## Principles

1. **Free first.** The dashboard and data are always free. We monetize the intelligence layer, not the data.
2. **Open source builds trust.** Methodology is public. Anyone can audit the index computation. Transparency is a feature, not a vulnerability.
3. **Curation over aggregation.** We don't dump 800K series on people. We pick the ones that matter and explain why.
4. **Agent as researcher, not chatbot.** The agent should feel like a sharp research assistant, not a Q&A bot. Multi-step reasoning, sourced claims, publication-quality output.
5. **The index is the brand.** Everything we build should make "the Undercurrent Index" more citable, more trusted, more referenced.
