# Q1: Which Alt-Data Series Best Predict Official Benchmarks?

Methodology: first-differenced both series, cross-correlation at lags 0-16 weeks,
out-of-sample R² via rolling 30-period regression.

## Nonfarm Payrolls (`labor_payems`)

### Top predictors (out-of-sample R² > 0)

| Alt Signal | Scope | Lag | r | OOS R² |
|-----------|-------|-----|---|--------|
| Total Private Employment | national | 0w | +0.982 | 0.940 |
| UK CPI YoY | international | 15w | +0.496 | 0.757 |
| Florida Labor Force | state | 6w | +0.738 | 0.716 |
| South Carolina Unemployment Rate | state | 16w | -0.667 | 0.700 |
| Connecticut Unemployment Rate | state | 0w | -0.724 | 0.678 |
| Maryland Unemployment Rate | state | 0w | -0.707 | 0.590 |
| Michigan Unemployment Rate | state | 11w | -0.598 | 0.582 |
| Washington Labor Force | state | 6w | +0.599 | 0.573 |
| Philadelphia Fed Coincident Index | national | 0w | +0.886 | 0.545 |
| Pennsylvania Unemployment Rate | state | 7w | -0.762 | 0.515 |

### Top by correlation (in-sample)

| Alt Signal | Scope | Lag | r |
|-----------|-------|-----|---|
| Total Private Employment | national | 0w | +0.982 |
| Philadelphia Fed Coincident Index | national | 0w | +0.886 |
| Food Services Emp | national | 12w | +0.829 |
| Pennsylvania Nonfarm Employment | state | 0w | +0.772 |
| Minnesota Unemployment Rate | state | 5w | -0.766 |
| Pennsylvania Unemployment Rate | state | 7w | -0.762 |
| Florida Unemployment Rate | state | 5w | -0.760 |
| Manufacturing Employment | national | 0w | +0.751 |
| Massachusetts Nonfarm Employment | state | 0w | +0.742 |
| Florida Labor Force | state | 6w | +0.738 |

## Consumer Sentiment (UMich) (`consumer_umcsent`)

### Top predictors (out-of-sample R² > 0)

| Alt Signal | Scope | Lag | r | OOS R² |
|-----------|-------|-----|---|--------|
| Consumer Sentiment | national | 0w | +1.000 | 1.000 |
| Consumer Sentiment (UMich) | national | 0w | +1.000 | 1.000 |
| Consumer Confidence (OECD) | national | 0w | +0.783 | 0.848 |
| Consumer Confidence OECD | national | 0w | +0.783 | 0.848 |
| UMich Inflation Expectations | national | 0w | -0.489 | 0.433 |
| UMich Inflation Expectations (1yr) | national | 0w | -0.489 | 0.433 |
| UK Unemployment Rate | international | 13w | -0.382 | 0.404 |
| Germany 10-Year Bund | international | 15w | +0.462 | 0.288 |
| CPI Medical Care Commodities | national | 5w | +0.364 | 0.277 |
| Canada 10-Year Bond | international | 15w | +0.342 | 0.272 |

### Top by correlation (in-sample)

| Alt Signal | Scope | Lag | r |
|-----------|-------|-----|---|
| Consumer Sentiment | national | 0w | +1.000 |
| Consumer Sentiment (UMich) | national | 0w | +1.000 |
| Consumer Confidence (OECD) | national | 0w | +0.783 |
| Consumer Confidence OECD | national | 0w | +0.783 |
| UMich Inflation Expectations | national | 0w | -0.489 |
| UMich Inflation Expectations (1yr) | national | 0w | -0.489 |
| Beef Price | national | 13w | -0.463 |
| Michigan Total Exports | state | 12w | -0.463 |
| Germany 10-Year Bund | international | 15w | +0.462 |
| Alaska Total Exports | state | 14w | -0.437 |

## Continued Unemployment Claims (`expanded_continued_claims`)

### Top predictors (out-of-sample R² > 0)

| Alt Signal | Scope | Lag | r | OOS R² |
|-----------|-------|-----|---|--------|
| Oregon New Business Applications | state | 1w | -0.295 | 0.042 |
| Massachusetts New Business Applications | state | 6w | +0.263 | 0.038 |
| New Hampshire New Business Applications | state | 6w | +0.238 | 0.029 |
| South Dakota New Business Applications | state | 6w | +0.287 | 0.026 |
| Delaware New Business Applications | state | 6w | +0.276 | 0.013 |
| Maryland New Business Applications | state | 6w | +0.227 | 0.007 |
| Connecticut New Business Applications | state | 6w | +0.286 | 0.004 |

### Top by correlation (in-sample)

| Alt Signal | Scope | Lag | r |
|-----------|-------|-----|---|
| Utah New Business Applications | state | 16w | -0.321 |
| Oregon New Business Applications | state | 1w | -0.295 |
| Nevada New Business Applications | state | 14w | +0.291 |
| South Dakota New Business Applications | state | 6w | +0.287 |
| Connecticut New Business Applications | state | 6w | +0.286 |
| Delaware New Business Applications | state | 6w | +0.276 |
| Alaska New Business Applications | state | 1w | -0.268 |
| Colorado New Business Applications | state | 6w | +0.264 |
| Massachusetts New Business Applications | state | 6w | +0.263 |
| New Jersey New Business Applications | state | 6w | +0.257 |

## Case-Shiller Home Prices (`expanded_case_shiller`)

### Top predictors (out-of-sample R² > 0)

| Alt Signal | Scope | Lag | r | OOS R² |
|-----------|-------|-----|---|--------|
| Case-Shiller 20-City | national | 0w | +1.000 | 1.000 |
| West Virginia Labor Force | state | 16w | +0.500 | 0.379 |
| Pork Price | national | 12w | +0.613 | 0.373 |
| Pennsylvania Labor Force | state | 16w | +0.589 | 0.348 |
| Alaska Total Exports | state | 16w | -0.486 | 0.335 |
| CPI Internet Services | national | 15w | +0.315 | 0.327 |
| New Jersey Labor Force | state | 14w | +0.532 | 0.315 |
| Arizona Nonfarm Employment | state | 2w | +0.385 | 0.292 |
| PPI Processed Foods | national | 0w | +0.565 | 0.259 |
| PPI Processed Foods | national | 0w | +0.565 | 0.259 |

### Top by correlation (in-sample)

| Alt Signal | Scope | Lag | r |
|-----------|-------|-----|---|
| Case-Shiller 20-City | national | 0w | +1.000 |
| Case-Shiller 20-City SA | national | 0w | +0.758 |
| Case-Shiller 10-City SA | national | 0w | +0.753 |
| New Hampshire Labor Force | state | 8w | -0.736 |
| Indiana Labor Force | state | 8w | -0.714 |
| Arkansas Labor Force | state | 9w | -0.696 |
| Hawaii Labor Force | state | 14w | +0.679 |
| Nevada Labor Force | state | 6w | -0.666 |
| Colorado Labor Force | state | 4w | +0.665 |
| North Carolina Unemployment Rate | state | 5w | -0.656 |

## Personal Savings Rate (`expanded_savings_rate`)

### Top predictors (out-of-sample R² > 0)

| Alt Signal | Scope | Lag | r | OOS R² |
|-----------|-------|-----|---|--------|
| Real Disposable Income | national | 0w | +0.988 | 0.555 |
| Transportation Index | national | 11w | +0.512 | 0.412 |
| Freight Transportation Index | national | 11w | +0.512 | 0.412 |
| Freight Transport Index | national | 11w | +0.512 | 0.412 |
| Wisconsin Building Permits | state | 10w | -0.300 | 0.332 |
| Arts & Entertainment Emp | national | 15w | +0.486 | 0.328 |
| Monthly Treasury Statement Deficit | national | 8w | -0.276 | 0.303 |
| Exports to Mexico | national | 12w | +0.323 | 0.290 |
| Delaware Unemployment Rate | state | 14w | -0.505 | 0.281 |
| Unfilled Durable Goods Orders | national | 16w | +0.384 | 0.272 |

### Top by correlation (in-sample)

| Alt Signal | Scope | Lag | r |
|-----------|-------|-----|---|
| Real Disposable Income | national | 0w | +0.988 |
| West Virginia Building Permits | state | 1w | +0.768 |
| Chicago Fed National Activity | national | 0w | +0.765 |
| Capacity Utilization | national | 1w | -0.694 |
| Manufacturing Capacity Util | national | 1w | -0.690 |
| Manufacturing (SIC) | national | 1w | -0.686 |
| Manufacturing Production | national | 1w | -0.685 |
| Real Retail Sales | national | 1w | -0.676 |
| Minnesota Labor Force | state | 2w | +0.672 |
| Personal Consumption Expenditures | national | 1w | -0.669 |

## Vehicle Sales (`expanded_vehicle_sales`)

### Top predictors (out-of-sample R² > 0)

| Alt Signal | Scope | Lag | r | OOS R² |
|-----------|-------|-----|---|--------|
| Total Vehicle Sales | national | 0w | +1.000 | 1.000 |
| Total Vehicle Sales | national | 0w | +1.000 | 1.000 |
| PCE Durable Goods | national | 0w | +0.788 | 0.659 |
| Retail Sales ex Auto | national | 0w | +0.641 | 0.461 |
| Real Retail Sales | national | 0w | +0.638 | 0.438 |
| Personal Consumption Expenditures | national | 0w | +0.554 | 0.434 |
| Japan 3-Month Interbank | international | 14w | -0.503 | 0.424 |
| Retail Inventories | national | 0w | -0.533 | 0.359 |
| Maine Total Exports | state | 3w | -0.273 | 0.307 |
| New York Nonfarm Employment | state | 6w | +0.337 | 0.277 |

### Top by correlation (in-sample)

| Alt Signal | Scope | Lag | r |
|-----------|-------|-----|---|
| Total Vehicle Sales | national | 0w | +1.000 |
| Total Vehicle Sales | national | 0w | +1.000 |
| PCE Durable Goods | national | 0w | +0.788 |
| Retail Sales ex Auto | national | 0w | +0.641 |
| Real Retail Sales | national | 0w | +0.638 |
| Inventory/Sales Ratio | national | 0w | -0.592 |
| Personal Consumption Expenditures | national | 0w | +0.554 |
| Retail Inventories | national | 0w | -0.533 |
| Average New Home Price | national | 14w | +0.525 |
| South Carolina Nonfarm Employment | state | 6w | +0.507 |

## Capacity Utilization (`manuf_tcu`)

### Top predictors (out-of-sample R² > 0)

| Alt Signal | Scope | Lag | r | OOS R² |
|-----------|-------|-----|---|--------|
| Manufacturing Capacity Util | national | 0w | +0.933 | 0.772 |
| Manufacturing (SIC) | national | 0w | +0.928 | 0.770 |
| Manufacturing Production | national | 0w | +0.928 | 0.769 |
| Chicago Fed National Activity | national | 0w | +0.736 | 0.505 |
| Recession Probability (Smoothed) | national | 0w | -0.418 | 0.447 |
| New Mexico Building Permits | state | 2w | -0.429 | 0.341 |
| Kansas Building Permits | state | 5w | -0.427 | 0.327 |
| Transportation Index | national | 0w | +0.564 | 0.313 |
| Freight Transportation Index | national | 0w | +0.564 | 0.313 |
| Freight Transport Index | national | 0w | +0.564 | 0.313 |

### Top by correlation (in-sample)

| Alt Signal | Scope | Lag | r |
|-----------|-------|-----|---|
| Manufacturing Capacity Util | national | 0w | +0.933 |
| Manufacturing (SIC) | national | 0w | +0.928 |
| Manufacturing Production | national | 0w | +0.928 |
| Chicago Fed National Activity | national | 0w | +0.736 |
| Rail Freight Carloads | national | 0w | +0.677 |
| Personal Consumption Expenditures | national | 0w | +0.651 |
| Hawaii Building Permits | state | 15w | -0.616 |
| Avg Weekly Hours | national | 0w | +0.606 |
| Missouri Nonfarm Employment | state | 0w | +0.598 |
| PCE Services | national | 0w | +0.577 |

## Manufacturing Production (`manuf_ipman`)

### Top predictors (out-of-sample R² > 0)

| Alt Signal | Scope | Lag | r | OOS R² |
|-----------|-------|-----|---|--------|
| Manufacturing Capacity Util | national | 0w | +0.999 | 0.997 |
| Manufacturing (SIC) | national | 0w | +0.999 | 0.995 |
| Capacity Utilization | national | 0w | +0.928 | 0.791 |
| Chicago Fed National Activity | national | 0w | +0.746 | 0.607 |
| Recession Probability (Smoothed) | national | 0w | -0.426 | 0.471 |
| Avg Weekly Hours | national | 0w | +0.714 | 0.467 |
| Real Avg Hourly Earnings | national | 0w | +0.651 | 0.454 |
| Rail Freight Carloads | national | 0w | +0.758 | 0.422 |
| New Mexico Building Permits | state | 2w | -0.456 | 0.404 |
| Nebraska Building Permits | state | 16w | +0.452 | 0.399 |

### Top by correlation (in-sample)

| Alt Signal | Scope | Lag | r |
|-----------|-------|-----|---|
| Manufacturing (SIC) | national | 0w | +0.999 |
| Manufacturing Capacity Util | national | 0w | +0.999 |
| Capacity Utilization | national | 0w | +0.928 |
| Rail Freight Carloads | national | 0w | +0.758 |
| Chicago Fed National Activity | national | 0w | +0.746 |
| Avg Weekly Hours | national | 0w | +0.714 |
| Real Avg Hourly Earnings | national | 0w | +0.651 |
| Transfer Volume (Fedwire) | national | 0w | +0.643 |
| Personal Consumption Expenditures | national | 0w | +0.623 |
| Inventory/Sales Ratio | national | 0w | -0.616 |

## JOLTS Job Openings (`expanded_job_openings`)

### Top predictors (out-of-sample R² > 0)

| Alt Signal | Scope | Lag | r | OOS R² |
|-----------|-------|-----|---|--------|
| Job Openings Rate | national | 0w | +0.986 | 0.962 |
| Washington Nonfarm Employment | state | 15w | -0.496 | 0.548 |
| North Carolina Nonfarm Employment | state | 15w | -0.606 | 0.543 |
| Michigan Nonfarm Employment | state | 15w | -0.479 | 0.501 |
| Philly Fed Manufacturing | national | 12w | +0.451 | 0.440 |
| Minnesota Building Permits | state | 8w | -0.510 | 0.411 |
| District of Columbia Total Exports | state | 16w | -0.335 | 0.409 |
| China CPI YoY | international | 3w | +0.415 | 0.362 |
| Delaware Nonfarm Employment | state | 15w | -0.526 | 0.345 |
| Florida Nonfarm Employment | state | 15w | -0.559 | 0.337 |

### Top by correlation (in-sample)

| Alt Signal | Scope | Lag | r |
|-----------|-------|-----|---|
| Job Openings Rate | national | 0w | +0.986 |
| Wyoming Nonfarm Employment | state | 15w | -0.723 |
| North Carolina Nonfarm Employment | state | 15w | -0.606 |
| Texas Building Permits | state | 5w | -0.571 |
| Florida Nonfarm Employment | state | 15w | -0.559 |
| Pennsylvania Building Permits | state | 8w | -0.555 |
| Virginia Nonfarm Employment | state | 6w | -0.542 |
| Connecticut Nonfarm Employment | state | 15w | -0.534 |
| Pennsylvania Nonfarm Employment | state | 15w | -0.527 |
| Delaware Nonfarm Employment | state | 15w | -0.526 |

## JOLTS Quit Rate (`expanded_quit_rate`)

### Top predictors (out-of-sample R² > 0)

| Alt Signal | Scope | Lag | r | OOS R² |
|-----------|-------|-----|---|--------|
| Minnesota Building Permits | state | 14w | +0.415 | 0.553 |
| China CPI YoY | international | 13w | +0.404 | 0.471 |
| Nebraska Building Permits | state | 6w | +0.414 | 0.456 |
| Connecticut Total Exports | state | 12w | +0.350 | 0.438 |
| Cocoa Price | national | 11w | +0.403 | 0.415 |
| South Korea Unemployment Rate | international | 3w | +0.459 | 0.374 |
| Hawaii Total Exports | state | 5w | -0.382 | 0.346 |
| New Hampshire Building Permits | state | 6w | +0.456 | 0.341 |
| Total Vehicle Sales | national | 13w | +0.423 | 0.314 |
| Total Vehicle Sales | national | 13w | +0.423 | 0.314 |

### Top by correlation (in-sample)

| Alt Signal | Scope | Lag | r |
|-----------|-------|-----|---|
| West Virginia Nonfarm Employment | state | 11w | -0.546 |
| Pennsylvania Nonfarm Employment | state | 11w | -0.504 |
| Virginia Nonfarm Employment | state | 11w | -0.491 |
| Oklahoma Nonfarm Employment | state | 10w | +0.489 |
| Japan Unemployment Rate | international | 16w | +0.469 |
| North Carolina Nonfarm Employment | state | 7w | -0.467 |
| Philly Fed Manufacturing | national | 0w | +0.464 |
| Minnesota Nonfarm Employment | state | 11w | -0.463 |
| Information Avg Hourly Earnings | national | 1w | -0.460 |
| Rail Freight Carloads | national | 14w | -0.460 |

## Labor Force Participation (`labor_civpart`)

### Top predictors (out-of-sample R² > 0)

| Alt Signal | Scope | Lag | r | OOS R² |
|-----------|-------|-----|---|--------|
| Employment-Population Ratio | national | 0w | +0.727 | 0.573 |
| Japan 3-Month Interbank | international | 11w | -0.425 | 0.339 |
| Oklahoma Nonfarm Employment | state | 5w | +0.293 | 0.321 |
| Japan 10-Year JGB | international | 13w | -0.349 | 0.311 |
| Consumer Loans | national | 11w | +0.336 | 0.288 |
| Electricity Generation Index | national | 8w | +0.378 | 0.259 |
| Electric Power Generation | national | 8w | +0.378 | 0.259 |
| Montana Labor Force | state | 16w | +0.382 | 0.256 |
| CPI Avg Price: Eggs | national | 7w | +0.432 | 0.242 |
| Maryland Total Exports | state | 11w | +0.306 | 0.229 |

### Top by correlation (in-sample)

| Alt Signal | Scope | Lag | r |
|-----------|-------|-----|---|
| Civilian Labor Force | national | 0w | +0.784 |
| Employment-Population Ratio | national | 0w | +0.727 |
| Civilian Employment Level | national | 0w | +0.715 |
| UK CPI YoY | international | 16w | +0.512 |
| Minnesota Nonfarm Employment | state | 10w | +0.479 |
| Utah Labor Force | state | 0w | +0.445 |
| New Hampshire Nonfarm Employment | state | 10w | +0.440 |
| Rhode Island Nonfarm Employment | state | 10w | +0.439 |
| CPI Avg Price: Eggs | national | 7w | +0.432 |
| Arkansas Nonfarm Employment | state | 14w | +0.431 |

## Summary: Best Predictor Per Metric

| Official Metric | Best Alt Signal | Lag | OOS R² | In-Sample r |
|----------------|----------------|-----|--------|-------------|
| Nonfarm Payrolls | Total Private Employment | 0w | 0.940 | +0.982 |
| Consumer Sentiment (UMich) | Consumer Sentiment | 0w | 1.000 | +1.000 |
| Continued Unemployment Claims | Oregon New Business Applications | 1w | 0.042 | -0.295 |
| Case-Shiller Home Prices | Case-Shiller 20-City | 0w | 1.000 | +1.000 |
| Personal Savings Rate | Real Disposable Income | 0w | 0.555 | +0.988 |
| Vehicle Sales | Total Vehicle Sales | 0w | 1.000 | +1.000 |
| Capacity Utilization | Manufacturing Capacity Util | 0w | 0.772 | +0.933 |
| Manufacturing Production | Manufacturing Capacity Util | 0w | 0.997 | +0.999 |
| JOLTS Job Openings | Job Openings Rate | 0w | 0.962 | +0.986 |
| JOLTS Quit Rate | Minnesota Building Permits | 14w | 0.553 | +0.415 |
| Labor Force Participation | Employment-Population Ratio | 0w | 0.573 | +0.727 |

## Key Takeaways

(To be filled after reviewing results)
