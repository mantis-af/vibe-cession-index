# Undercurrent Index v2 — Theory-Driven Design

## Philosophy

The index measures **economic welfare** — how well people in a metro are actually doing. It's built from observable behavioral signals ("alt data") organized around 5 causal channels that drive welfare, plus a global context layer. Each channel is a sub-index that can be analyzed independently.

The alt-data index is compared against an **official benchmark** built from government statistics to produce the **Sentiment Gap** — the difference between lived experience and official measurement.

## The 5 Channels

### Channel 1: Labor Demand (weight: 25%)
**Theory**: Employment is the primary determinant of economic welfare. Leading indicators of employment — business formation, job openings, hiring patterns — move before official payroll data.

**Alt signals (per metro where available, state otherwise)**:
- New business applications (FRED, weekly) — entrepreneurial confidence
- Construction employment changes (FRED, monthly) — cyclically sensitive sector
- Help-wanted / job postings (Google Trends "hiring" + "job openings" search interest)

**Official benchmark**: State unemployment rate, national nonfarm payrolls

### Channel 2: Cost of Living Pressure (weight: 25%)
**Theory**: Welfare depends not on absolute income but on income *relative* to costs. The gap between wage growth and cost growth is what people feel.

**Alt signals**:
- Redfin housing inventory + days on market + price drops (weekly, metro)
- Gas prices (EIA, weekly, regional)
- Google Trends search anxiety: "rent increase", "grocery prices", "can't afford" (weekly, metro)
- Zillow home values YoY change (monthly, metro)

**Official benchmark**: Metro CPI, national CPI components (shelter, food, energy), avg hourly earnings

### Channel 3: Financial Stress (weight: 15%)
**Theory**: Credit access and debt burden determine whether households can smooth consumption through shocks. Tightening credit and rising delinquencies predict deterioration.

**Alt signals** (national, applied to all metros):
- Chicago Fed Financial Conditions Index (NFCI, weekly)
- High yield bond spread (weekly) — market stress signal
- 30-year mortgage rate (weekly)
- Revolving consumer credit growth rate (monthly)

**Official benchmark**: Debt service ratio, Fed senior loan officer survey

### Channel 4: Consumer Confidence & Behavioral Shifts (weight: 20%)
**Theory**: How people *feel* drives spending decisions, which drives the economy. Search behavior and spending patterns reveal sentiment before surveys capture it.

**Alt signals (per metro)**:
- Google Trends search anxiety ratio (weekly, metro DMA) — our existing distress vs aspiration signal
- AI job search ratio (weekly, metro DMA) — labor market transition indicator

**Alt signals (national, applied to all)**:
- Personal savings rate changes (monthly) — rising savings = defensive behavior
- Vehicle sales changes (monthly) — big discretionary purchase = confidence signal

**Official benchmark**: UMich Consumer Sentiment, Conference Board Consumer Confidence

### Channel 5: Housing Market Health (weight: 15%)
**Theory**: Housing is the largest asset for most families and the largest expense. Housing market conditions directly determine wealth, mobility, and monthly cash flow.

**Alt signals (per metro)**:
- Redfin inventory (weekly) — supply/demand balance
- Redfin days on market (weekly) — market velocity
- Redfin price drops % (weekly) — seller confidence
- Zillow ZHVI YoY change (monthly) — wealth effect direction

**Official benchmark**: Case-Shiller home prices, FHFA HPI, housing affordability index

## Global Context Layer (modifier: ±5%)
Not a standalone channel but a modifier that adjusts the index based on external forces:
- Trade-weighted dollar index — strong dollar hurts export metros
- Oil prices (WTI) — high energy costs hurt consumer metros
- Freight transportation index — supply chain health
- Import volume changes — global demand signal

## Index Computation

```
Metro Score = Σ (channel_weight × channel_z_score) → rescaled to 0-100

Where each channel_z_score = Σ (signal_weight × signal_z_score) within that channel
      signal_z_score = (current_value - 2yr_mean) / 2yr_stdev

Global modifier applied as: final_score = metro_score × (1 + global_modifier)
  where global_modifier is clamped to [-0.05, +0.05]
```

## Official Benchmark Index

Computed separately from government data only:
- State/metro unemployment rate (40%)
- CPI inflation rate, inverted (20%)
- Nonfarm payrolls growth (20%)
- GDP growth (10%)
- Consumer sentiment — UMich (10%)

## What's New vs v1

| Aspect | v1 | v2 |
|--------|----|----|
| Signals | 8 hand-picked, equal-ish weights | 15+ organized by causal channel |
| Theory | None — statistical convenience | 5 economic channels with clear causation |
| Weights | Arbitrary | Channel-level (theory) × signal-level (data availability) |
| Official | Crude unemployment mapping | 5-signal government composite |
| Global | None | Dollar, oil, freight, imports modifier |
| Evaluation | Lead/lag correlation | Compare channel sub-indices against official benchmarks |
