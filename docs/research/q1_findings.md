# Research Q1 Findings: Predictive Correlations

## Question
For each official economic indicator, which alt-data series best predicts it with a lead time > 0?

## Method
- First-differenced all series (removes trend-driven spurious correlations)
- Cross-correlation at lags 1-16 weeks
- Tested 200 national-level series per official benchmark

## Results: Best LEADING Alt-Data Predictors

| Official Metric | Best Alt Predictor | Lead | r | Economically Plausible? |
|----------------|-------------------|------|---|------------------------|
| Nonfarm Payrolls | Food Services Employment | 12w | +0.83 | **YES** — restaurants are first to hire/fire |
| Consumer Sentiment | M2 Money Supply | 3w | -0.42 | **MAYBE** — monetary conditions affect sentiment, but weak |
| Case-Shiller | PPI All Commodities | 1w | +0.62 | **YES** — construction input costs drive home prices |
| Savings Rate | Capacity Utilization | 1w | -0.69 | **YES** — when economy is hot, people save less |
| JOLTS Openings | Quit Rate | 16w | -0.49 | **YES** — quits dry up before openings fall |
| JOLTS Quit Rate | Info Sector Hourly Earnings | 1w | -0.46 | **MAYBE** — higher wages reduce quit incentive? |
| Labor Participation | Egg Prices | 7w | +0.43 | **NO** — likely spurious |
| Capacity Utilization | Ground Beef Prices | 14w | -0.45 | **NO** — likely spurious |

## Key Insight
Most "best predictors" at lag=0 are **near-duplicates** (e.g., private employment predicts total employment). When we require lag > 0 (actual leading indicators), the results are:

1. **Food services employment → Nonfarm payrolls (12w lead, r=0.83)**: This is real. Restaurants are the most cyclically sensitive employers. When they start cutting staff, broader layoffs follow ~3 months later.

2. **PPI commodities → Case-Shiller home prices (1w lead, r=0.62)**: Input costs (lumber, steel, concrete) feed through to home prices. This is a real supply-side channel.

3. **Capacity utilization → Savings rate (1w lead, r=-0.69)**: When factories run hot, income rises, savings falls. Real economic channel.

4. **Several spurious results**: Egg prices predicting labor participation is noise, not signal. Food commodity prices have high variance and will correlate with random series.

## What This Means for the Index

### Problem 1: Our metro-level alt-data wasn't tested
The analysis only tested national series against national series. Our ACTUAL alt-data (Google Trends search anxiety, Redfin housing metrics, AI job ratio) is at the metro level and wasn't in this screen because it requires cross-metro aggregation first.

### Problem 2: Forecasting may be the wrong framing
The strongest relationships are at lag=0 (concurrent) or lag=1 (nearly concurrent). True multi-week leading relationships are:
- Food services employment → payrolls (12w) — but this is sector employment, not "alt data"
- Quit rate → job openings (16w) — also official data, not alt
- State unemployment rates → national payrolls (various) — still official data

**The honest conclusion**: our behavioral/alt-data signals (search trends, housing market dynamics) may be better at **nowcasting** (filling in the gaps between monthly official releases) than **forecasting** (predicting future official values).

### Recommendation for Next Iteration
1. Run the same analysis but with metro-level alt-data aggregated nationally
2. Test the nowcasting hypothesis: can our weekly signals estimate what the CURRENT month's official reading will be, before it's released?
3. Consider reframing the index as "here's what's happening RIGHT NOW" rather than "here's what will happen next"
