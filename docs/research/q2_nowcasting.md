# Q2: Can Alt-Data Nowcast Official Monthly Readings?

## Method
- Aggregate each metro-level signal nationally (avg z-score per week)
- For each month: average the alt-signal from the first 3 weeks
- Test correlation with the official reading for THAT SAME month
- OOS R² via rolling 12-month window regression

## Single-Signal Nowcasting Results

### Nonfarm Payrolls

| Alt Signal | Months | r | p-value | OOS R² |
|-----------|--------|---|---------|--------|
| Days on Market | 59 | +0.650 | 0.0000 | -0.252 |
| Housing Inventory | 59 | +0.540 | 0.0000 | -0.045 |
| Price Drops | 59 | +0.486 | 0.0001 | -0.095 |
| Initial Claims | 59 | -0.417 | 0.0010 | -0.078 |
| Unemployment Rate | 59 | -0.293 | 0.0245 | 0.039 |
| Search Anxiety | 59 | +0.086 | 0.5186 | -1.194 |
| AI Job Ratio | 59 | -0.063 | 0.6359 | -0.262 |
| New Biz Apps | 59 | -0.059 | 0.6563 | -1.205 |

### Consumer Sentiment

| Alt Signal | Months | r | p-value | OOS R² |
|-----------|--------|---|---------|--------|
| Initial Claims | 58 | -0.532 | 0.0000 | 0.153 |
| Price Drops | 58 | +0.432 | 0.0007 | -0.045 |
| Unemployment Rate | 58 | -0.412 | 0.0013 | 0.144 |
| Housing Inventory | 58 | +0.411 | 0.0014 | 0.096 |
| New Biz Apps | 58 | -0.375 | 0.0038 | -0.186 |
| Days on Market | 58 | +0.269 | 0.0413 | -0.283 |
| AI Job Ratio | 58 | -0.136 | 0.3084 | -8.776 |
| Search Anxiety | 58 | +0.107 | 0.4247 | -36.376 |

### Case-Shiller

| Alt Signal | Months | r | p-value | OOS R² |
|-----------|--------|---|---------|--------|
| Days on Market | 49 | +0.651 | 0.0000 | 0.270 |
| Housing Inventory | 49 | +0.475 | 0.0006 | 0.149 |
| Price Drops | 49 | +0.445 | 0.0014 | 0.006 |
| Unemployment Rate | 49 | +0.265 | 0.0663 | -0.195 |
| Search Anxiety | 49 | +0.109 | 0.4573 | -7.256 |
| Initial Claims | 49 | +0.104 | 0.4764 | 0.028 |
| AI Job Ratio | 49 | -0.060 | 0.6815 | -1.038 |
| New Biz Apps | 49 | +0.008 | 0.9553 | -1.422 |

### Savings Rate

| Alt Signal | Months | r | p-value | OOS R² |
|-----------|--------|---|---------|--------|
| Initial Claims | 58 | -0.710 | 0.0000 | 0.469 |
| Unemployment Rate | 58 | -0.630 | 0.0000 | 0.328 |
| Price Drops | 58 | +0.351 | 0.0069 | -0.735 |
| Days on Market | 58 | +0.240 | 0.0690 | -0.264 |
| Housing Inventory | 58 | +0.229 | 0.0840 | -0.463 |
| Search Anxiety | 58 | +0.041 | 0.7606 | -5.178 |
| AI Job Ratio | 58 | -0.037 | 0.7834 | -1.283 |
| New Biz Apps | 58 | -0.036 | 0.7899 | -0.113 |

### Capacity Utilization

| Alt Signal | Months | r | p-value | OOS R² |
|-----------|--------|---|---------|--------|
| Days on Market | 58 | +0.698 | 0.0000 | 0.071 |
| Housing Inventory | 58 | +0.636 | 0.0000 | 0.016 |
| Price Drops | 58 | +0.303 | 0.0206 | -0.217 |
| Unemployment Rate | 58 | +0.228 | 0.0858 | 0.040 |
| Search Anxiety | 58 | +0.128 | 0.3397 | -5.480 |
| New Biz Apps | 58 | +0.112 | 0.4021 | -0.442 |
| AI Job Ratio | 58 | -0.112 | 0.4033 | -0.675 |
| Initial Claims | 58 | +0.024 | 0.8586 | 0.037 |

### JOLTS Openings

| Alt Signal | Months | r | p-value | OOS R² |
|-----------|--------|---|---------|--------|
| Days on Market | 58 | +0.734 | 0.0000 | 0.070 |
| Housing Inventory | 58 | +0.722 | 0.0000 | 0.298 |
| Price Drops | 58 | +0.464 | 0.0002 | -0.111 |
| Initial Claims | 58 | -0.192 | 0.1482 | -0.141 |
| Unemployment Rate | 58 | +0.077 | 0.5632 | -0.109 |
| Search Anxiety | 58 | +0.072 | 0.5886 | -10.301 |
| AI Job Ratio | 58 | -0.043 | 0.7460 | -0.627 |
| New Biz Apps | 58 | +0.014 | 0.9182 | -3.498 |

### Labor Participation

| Alt Signal | Months | r | p-value | OOS R² |
|-----------|--------|---|---------|--------|
| Initial Claims | 58 | +0.579 | 0.0000 | -0.021 |
| Unemployment Rate | 58 | +0.544 | 0.0000 | 0.024 |
| Price Drops | 58 | -0.371 | 0.0041 | -0.464 |
| AI Job Ratio | 58 | +0.243 | 0.0655 | 0.333 |
| New Biz Apps | 58 | -0.241 | 0.0682 | -0.227 |
| Days on Market | 58 | -0.217 | 0.1010 | 0.005 |
| Search Anxiety | 58 | -0.202 | 0.1275 | -0.438 |
| Housing Inventory | 58 | -0.110 | 0.4113 | -0.149 |

### CPI All Items

| Alt Signal | Months | r | p-value | OOS R² |
|-----------|--------|---|---------|--------|
| Days on Market | 50 | +0.564 | 0.0000 | 0.001 |
| Housing Inventory | 50 | +0.502 | 0.0002 | 0.310 |
| Unemployment Rate | 50 | +0.485 | 0.0004 | -0.051 |
| Price Drops | 50 | +0.214 | 0.1348 | 0.046 |
| Initial Claims | 50 | +0.156 | 0.2780 | 0.020 |
| AI Job Ratio | 50 | +0.054 | 0.7105 | -3.708 |
| Search Anxiety | 50 | -0.038 | 0.7946 | -19.354 |
| New Biz Apps | 50 | +0.000 | 0.9981 | -0.198 |

## Multi-Signal Nowcasting Results

Combining ALL 8 alt signals via ridge regression:

| Official Metric | Months | Multi-Signal OOS R² |
|----------------|--------|--------------------|
| Nonfarm Payrolls | 59 | N/A |
| Consumer Sentiment | 58 | N/A |
| Case-Shiller | 49 | N/A |
| Savings Rate | 58 | N/A |
| Capacity Utilization | 58 | N/A |
| JOLTS Openings | 58 | N/A |
| Labor Participation | 58 | N/A |
| CPI All Items | 50 | N/A |

## Key Takeaways

(See findings analysis below)
