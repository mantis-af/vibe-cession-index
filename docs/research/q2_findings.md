# Q2 Findings: Nowcasting with Metro Alt-Data

## Question
Can our weekly metro-level alt-data estimate what the current month's official reading will be, before it's released?

## Method
- Averaged each signal across all 50 metros per week
- For each month: averaged the alt-signal from weeks 1-3 (before official release)
- Tested: does this predict the official reading for THAT SAME month?
- Out-of-sample R² via rolling 12-month window

## Results: Single-Signal Nowcasting

| Official Metric | Best Alt Signal | r | OOS R² | Verdict |
|----------------|----------------|---|--------|---------|
| **Savings Rate** | Initial Claims | -0.71 | **0.469** | **STRONG** — claims predict savings behavior |
| **CPI Inflation** | Housing Inventory | +0.50 | **0.310** | **GOOD** — housing pressure nowcasts inflation |
| **JOLTS Openings** | Housing Inventory | +0.72 | **0.298** | **GOOD** — housing market tracks labor demand |
| **Case-Shiller** | Days on Market | +0.65 | **0.270** | **GOOD** — DOM nowcasts home prices |
| **Labor Participation** | AI Job Ratio | +0.24 | **0.333** | **SURPRISING** — AI adoption tracks participation |
| **Consumer Sentiment** | Initial Claims | -0.53 | **0.153** | **MODERATE** — claims predict how people feel |
| **Capacity Utilization** | Days on Market | +0.70 | 0.071 | WEAK OOS despite strong correlation |
| **Nonfarm Payrolls** | Unemployment Rate | -0.29 | 0.039 | WEAK — payrolls are hard to nowcast |

## Key Insights

### 1. Nowcasting WORKS for 5 of 8 metrics (OOS R² > 0.15)
Our metro alt-data can meaningfully estimate current-month readings for: savings rate, CPI inflation, JOLTS job openings, Case-Shiller home prices, and (surprisingly) labor force participation.

### 2. The best signals make economic sense
- **Initial Claims → Savings Rate** (r=-0.71, OOS R²=0.47): When jobless claims rise, people save more defensively. This is a direct behavioral channel.
- **Housing Inventory → CPI** (r=+0.50, OOS R²=0.31): Housing supply pressure feeds into shelter CPI, which is 30% of the index. Real-time housing data predicts the price data that won't be released for weeks.
- **Housing Inventory → JOLTS Openings** (r=+0.72, OOS R²=0.30): Housing market health tracks labor market demand. When housing is active, businesses are hiring.
- **Days on Market → Case-Shiller** (r=+0.65, OOS R²=0.27): How long homes sit unsold predicts the price index. This is the most intuitive relationship.

### 3. Multi-signal regression failed
Combining all 8 signals didn't improve over single signals — likely because with only 12-month training windows, 8 features is too many. Overfitting problem. Would need more history or fewer features.

### 4. Nonfarm payrolls are hard to nowcast
OOS R² of only 0.039. This makes sense — payrolls are the broadest labor measure and aren't well-captured by behavioral/housing signals alone. It would require sector-specific data (which we have in the DB but didn't include in this metro-only analysis).

## What This Means for the Index

### The index should be a NOWCAST, not a forecast
Frame it as: "Here's what the economy is doing RIGHT NOW, based on signals that update weekly, before the official monthly data catches up."

### Recommended channel pairings (nowcast framing)
1. **Financial Health**: Initial Claims (weekly) nowcasts → Savings Rate (monthly)
2. **Cost Pressure**: Housing Inventory (weekly) nowcasts → CPI Inflation (monthly)
3. **Labor Demand**: Housing Inventory (weekly) nowcasts → JOLTS Job Openings (monthly)
4. **Housing Wealth**: Days on Market (weekly) nowcasts → Case-Shiller Home Prices (monthly)
5. **Consumer Sentiment**: Initial Claims (weekly) nowcasts → UMich Consumer Sentiment (monthly)

### Visualization recommendation
Instead of showing two parallel lines (confusing), show:
- **Monthly dots**: official data points at their release dates
- **Weekly fill**: our nowcast filling in the gaps between dots
- **Current nowcast**: highlighted value = "here's our estimate for the current month before the official release"

This tells a clear story: "The dots are what we KNOW. The line between is what we ESTIMATE. The rightmost point is where we think the next dot will land."

## Next Iteration
- Test whether combining 2-3 signals (not 8) improves over single signals
- Design the actual visualization component
- Consider: should the index be one number or should each channel be independent?
