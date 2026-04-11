# Vibe-cession Index

A real-time behavioral economic index tracking how people **actually feel** about the economy in 20 US metros — powered by search data, job postings, housing markets, and consumer behavior. Updated weekly.

Traditional indicators (GDP, unemployment rate, CPI) are lagging, nationally aggregated, and survey-based. The Vibe-cession Index uses high-frequency behavioral signals to create a more timely, localized picture of economic reality. The gap between what the data says and what people experience IS the product.

## The Index

The index composites **8 behavioral signals** into a single 0-100 score per metro:

| Signal | Weight | Source |
|--------|--------|--------|
| Job Postings Velocity | 20% | Indeed Hiring Lab |
| Wage-to-Rent Ratio | 15% | Salary postings + rental listings |
| Small Biz Health | 15% | Yelp/Google Places openings & closings |
| Google Trends Anxiety | 15% | Google Trends API (distress vs. aspiration) |
| Housing Market | 10% | Redfin housing inventory + days on market |
| Unemployment Claims | 10% | Dept. of Labor weekly claims |
| Restaurant Activity | 10% | OpenTable/Resy booking availability |
| Building Permits | 5% | Census Bureau + city open data |

### Normalization
Each signal is Z-scored against its own metro's 2-year history, enabling cross-metro comparison. A score of -1.5 in SF means SF is 1.5 standard deviations below its own normal.

### The Vibes Gap
The difference between the Behavioral Index and an Official Index (computed from government data) = the **Vibes Gap**. When negative, people feel worse than the data says. When positive, there's hidden economic strength.

## 20 Tracked Metros

New York, Los Angeles, Chicago, Houston, Phoenix, Philadelphia, San Antonio, San Diego, Dallas, San Jose, Austin, Jacksonville, San Francisco, Columbus, Charlotte, Indianapolis, Seattle, Denver, Washington DC, Nashville

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Data Pipelines**: Python (Google Trends, BLS, Redfin, DOL)
- **Hosting**: Vercel
- **Data Cost**: $0 (all public/free sources)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Dashboard Features

- **Overview**: National summary + ranked metro grid with sparklines and vibes gap
- **Metro Detail**: Composite trend (behavioral vs. official), signal radar chart, vibes gap history, component signal breakdown
- **Methodology**: Full explanation of signals, weights, and normalization

## Data Pipeline Architecture

```
Python Pipelines → JSON Files → Next.js Static Import → Dashboard
┌─────────────┐    ┌──────┐    ┌────────────────────┐
│ Google Trends│    │      │    │                    │
│ BLS LAUS     │───>│ JSON │───>│  Next.js Dashboard │
│ Redfin       │    │      │    │                    │
│ DOL Claims   │    └──────┘    └────────────────────┘
└─────────────┘
```

Pipelines run on a schedule (cron/GitHub Actions), produce normalized JSON consumed at build time by Next.js. Currently using seed data; real pipelines are being wired up.

## Roadmap

- [x] Dashboard with seed data for 20 metros
- [x] Metro detail pages with composite trends
- [x] Vibes Gap visualization
- [x] Signal radar chart and component breakdown
- [ ] Google Trends pipeline (pytrends)
- [ ] BLS LAUS unemployment pipeline
- [ ] Redfin housing data pipeline
- [ ] DOL weekly claims pipeline
- [ ] Yelp small business scraper
- [ ] Indeed job postings pipeline
- [ ] Backtest index against actual economic outcomes
- [ ] Social sharing cards (OG images)
- [ ] Metro comparison page
- [ ] API access for institutional buyers

## License

MIT
