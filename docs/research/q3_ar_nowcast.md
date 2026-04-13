# Q3: Autoregressive + Alt-Signal Nowcast Models

## Question
Does adding our alt-data to an autoregressive baseline improve nowcasts?

## Method
- AR baseline: predict y[t] from y[t-1], y[t-2], y[t-3] (last 3 readings)
- AR+alt: same + current month avg of alt-signal from first 3 weeks
- Rolling 18-month train window, 1-step-ahead OOS evaluation
- Ridge regression (λ=0.01) to prevent overfitting

## Results

| Metric | AR-only R² | AR+Alt R² | Alt Improvement | Q2 Alt-only R² |
|--------|-----------|-----------|----------------|---------------|
| Unemployment Rate | 0.001 | 0.142 | **+0.140** | 0.040 |
| Personal Savings Rate | 0.808 | 0.864 | **+0.057** | 0.470 |
| Labor Force Participation | 0.751 | 0.789 | **+0.037** | 0.330 |
| Case-Shiller Home Prices | 0.990 | 0.984 | -0.006 | 0.270 |
| CPI Inflation (YoY %) | 0.957 | 0.943 | -0.014 | 0.310 |
| JOLTS Job Openings | 0.908 | 0.889 | -0.019 | 0.300 |
| Consumer Sentiment (UMich) | 0.735 | 0.700 | -0.035 | 0.150 |
| Capacity Utilization | 0.655 | 0.601 | -0.054 | 0.070 |

## Key Findings

### 1. Most economic series are dominated by momentum
CPI (0.957), Case-Shiller (0.990), and JOLTS (0.908) are nearly perfectly predicted by their own recent trajectory. There is almost no room for alt-data to add value — and attempting to does slightly worse (overfitting to noise).

### 2. Alt-data shines where momentum breaks down
Unemployment Rate has an AR R² of only 0.001 — it's essentially a random walk at the monthly level. Adding metro-level unemployment signals (initial claims) boosts R² to 0.142. This is where alt-data is genuinely useful: when the next reading *can't* be predicted from recent values.

### 3. Three metrics benefit from the AR+alt model

| Metric | Model | Why Alt Helps |
|--------|-------|---------------|
| Unemployment Rate | AR+alt (R²=0.142) | AR baseline is near-zero; metro claims provide directional signal |
| Personal Savings Rate | AR+alt (R²=0.864) | Initial claims inversion captures spending/saving shifts early |
| Labor Force Participation | AR+alt (R²=0.789) | AI job ratio provides structural labor market signal beyond momentum |

### 4. Five metrics should use AR-only or just show latest reading

| Metric | Recommendation | Reasoning |
|--------|---------------|-----------|
| CPI Inflation | AR-only (R²=0.957) | Nearly perfect momentum, alt-data is noise |
| Case-Shiller | AR-only (R²=0.990) | Home prices have massive inertia |
| JOLTS Job Openings | AR-only (R²=0.908) | Strong momentum, housing inventory doesn't help |
| Consumer Sentiment | AR-only (R²=0.735) | Claims inversion hurts — sentiment has its own dynamics |
| Capacity Utilization | AR-only (R²=0.655) | Housing DOM is not a good proxy for industrial output |

## Implications for the Dashboard

### Nowcast model selection (per metric):
- **AR+alt**: Unemployment Rate, Personal Savings Rate, Labor Force Participation
- **AR-only**: CPI, Case-Shiller, JOLTS, Consumer Sentiment, Capacity Utilization

### Display strategy:
1. For high-AR metrics (CPI, Case-Shiller): show the real number + sparkline. The next reading is ~99% predictable from recent values.
2. For AR+alt metrics: show the nowcast estimate alongside the last official reading, with R² for credibility.
3. For low-R² metrics (Unemployment, Capacity Utilization): be honest about uncertainty. Show a range, not a point estimate.

### What this means for the product:
Our alt-data is most valuable for the *least predictable* economic indicators. This is exactly where users need help — the stable metrics they can track themselves, but turning points and volatile series benefit from real-time behavioral signals.
