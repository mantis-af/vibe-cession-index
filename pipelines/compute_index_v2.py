"""
Undercurrent Index v2 — Theory-driven, 5-channel composite.

Channels:
  1. Labor Demand (25%)
  2. Cost of Living Pressure (25%)
  3. Financial Stress (15%)
  4. Consumer Confidence (20%)
  5. Housing Market Health (15%)

Plus global context modifier (±5%).

Each channel produces a z-scored sub-index. The composite
is a weighted sum rescaled to 0-100.
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from statistics import mean, stdev

sys.path.insert(0, str(Path(__file__).parent))
from config import METROS

DATA_DIR = Path(__file__).parent.parent / "src" / "data"
METROS_DIR = DATA_DIR / "metros"
METROS_DIR.mkdir(parents=True, exist_ok=True)

# ─── Channel definitions ───
# Each channel lists signals by priority. For each metro, we use
# what's available and renormalize weights within the channel.

CHANNELS = {
    "labor_demand": {
        "weight": 0.25,
        "name": "Labor Demand",
        "signals": {
            # Metro-level signals (use state as fallback)
            "new_biz_apps": {"weight": 0.5, "direction": 1, "desc": "New business applications"},
            "initial_claims": {"weight": 0.3, "direction": -1, "desc": "Initial unemployment claims (inverted)"},
            "unemployment_rate": {"weight": 0.2, "direction": -1, "desc": "Unemployment rate (inverted)"},
        },
    },
    "cost_of_living": {
        "weight": 0.25,
        "name": "Cost of Living",
        "signals": {
            "housing_inventory": {"weight": 0.25, "direction": -1, "desc": "Housing inventory (inverted — more supply = less pressure)"},
            "housing_price_drops": {"weight": 0.20, "direction": 1, "desc": "Price drops (more = market cooling = relief)"},
            "google_trends_anxiety": {"weight": 0.30, "direction": -1, "desc": "Search anxiety (inverted — more anxiety = worse)"},
            "housing_dom": {"weight": 0.25, "direction": 1, "desc": "Days on market (longer = cooler market = less pressure)"},
        },
    },
    "financial_stress": {
        "weight": 0.15,
        "name": "Financial Stress",
        "signals": {
            # These are national signals applied to all metros
            "nfci": {"weight": 0.35, "direction": -1, "desc": "Financial conditions (inverted — tighter = worse)", "national": True, "series_id": "fin_nfci"},
            "hy_spread": {"weight": 0.25, "direction": -1, "desc": "High yield spread (inverted — wider = worse)", "national": True, "series_id": "expanded_hy_spread"},
            "mortgage_rate": {"weight": 0.25, "direction": -1, "desc": "30yr mortgage rate (inverted — higher = harder)", "national": True, "series_id": "expanded_mortgage_30y"},
            "revolving_credit": {"weight": 0.15, "direction": 1, "desc": "Revolving credit growth (positive = spending confidence)", "national": True, "series_id": "consumer_revolsl"},
        },
    },
    "consumer_confidence": {
        "weight": 0.20,
        "name": "Consumer Confidence",
        "signals": {
            "google_trends_anxiety": {"weight": 0.40, "direction": -1, "desc": "Search anxiety ratio (inverted)"},
            "ai_job_ratio": {"weight": 0.15, "direction": 1, "desc": "AI job search ratio (higher = market adapting)"},
            # National signals
            "savings_rate": {"weight": 0.20, "direction": -1, "desc": "Savings rate (inverted — rising = defensive)", "national": True, "series_id": "expanded_savings_rate"},
            "vehicle_sales": {"weight": 0.25, "direction": 1, "desc": "Vehicle sales (discretionary confidence)", "national": True, "series_id": "consumer_totalsa"},
        },
    },
    "housing_health": {
        "weight": 0.15,
        "name": "Housing Market",
        "signals": {
            "housing_inventory": {"weight": 0.30, "direction": -1, "desc": "Active listings (inverted — high inventory = weak market)"},
            "housing_dom": {"weight": 0.30, "direction": -1, "desc": "Days on market (inverted — longer = weaker)"},
            "housing_price_drops": {"weight": 0.20, "direction": -1, "desc": "Price drops % (inverted — more drops = weaker)"},
            "new_biz_apps": {"weight": 0.20, "direction": 1, "desc": "Business formation (positive for local economy)"},
        },
    },
}

# Global context signals (national only)
GLOBAL_CONTEXT = {
    "dollar_index": {"series_id": "fin_dtwexbgs", "direction": -1, "weight": 0.30, "desc": "Dollar strength (inverted — strong dollar hurts)"},
    "oil_price": {"series_id": "energy_dcoilwtico", "direction": -1, "weight": 0.30, "desc": "Oil prices (inverted — high oil hurts consumers)"},
    "freight_index": {"series_id": "shipping_tsifrght", "direction": 1, "weight": 0.20, "desc": "Freight activity (positive = active economy)"},
    "imports": {"series_id": "trade_imp0004", "direction": 1, "weight": 0.20, "desc": "Import volume (positive = demand)"},
}

# Official benchmark signals
OFFICIAL_SIGNALS = {
    "unemployment": {"weight": 0.40, "direction": -1, "desc": "State/metro unemployment rate"},
    "cpi": {"weight": 0.20, "direction": -1, "desc": "CPI inflation (inverted)"},
    "nonfarm": {"weight": 0.20, "direction": 1, "desc": "Nonfarm payrolls growth", "national": True, "series_id": "labor_payems"},
    "gdp_growth": {"weight": 0.10, "direction": 1, "desc": "GDP growth", "national": True, "series_id": "macro_gdp_growth"},
    "sentiment": {"weight": 0.10, "direction": 1, "desc": "Consumer sentiment", "national": True, "series_id": "consumer_umcsent"},
}


def load_json(name):
    p = Path(__file__).parent / "output" / f"{name}.json"
    if p.exists():
        with open(p) as f:
            return json.load(f)
    return None


def get_weekly_dates(weeks=260):
    today = datetime.now()
    days_since_monday = today.weekday()
    last_monday = today - timedelta(days=days_since_monday)
    return [(last_monday - timedelta(weeks=i)).strftime("%Y-%m-%d") for i in range(weeks-1, -1, -1)]


def map_weekly(source_weeks, date_key, value_key, target_weeks):
    if not source_weeks:
        return [None] * len(target_weeks)
    lookup = {}
    for item in source_weeks:
        if value_key in item:
            lookup[item[date_key]] = item[value_key]
    result = []
    for tw in target_weeks:
        val = lookup.get(tw)
        if val is None:
            # Find nearest within 7 days
            from datetime import datetime as dt
            target_dt = dt.strptime(tw, "%Y-%m-%d")
            best = None
            best_dist = 999
            for sw, sv in lookup.items():
                try:
                    sw_dt = dt.strptime(sw, "%Y-%m-%d")
                    dist = abs((target_dt - sw_dt).days)
                    if dist < best_dist and dist <= 7:
                        best_dist = dist
                        best = sv
                except: pass
            val = best
        result.append(val)
    return result


def interpolate_monthly(monthly_data, date_key, value_key, weeks):
    if not monthly_data:
        return [None] * len(weeks)
    month_vals = {}
    for item in monthly_data:
        if value_key in item:
            month_vals[item[date_key][:7] if len(item[date_key]) > 7 else item[date_key]] = item[value_key]
    result = []
    for w in weeks:
        m = w[:7]
        val = month_vals.get(m)
        if val is None:
            # Try previous month
            from datetime import datetime as dt, timedelta as td
            d = dt.strptime(w, "%Y-%m-%d")
            prev = (d.replace(day=1) - td(days=1)).strftime("%Y-%m")
            val = month_vals.get(prev)
        result.append(val)
    return result


def fill_forward(values):
    result = []
    last = None
    for v in values:
        if v is not None:
            last = v
        result.append(last)
    return result


def z_score_series(values):
    numeric = [v for v in values if v is not None]
    if len(numeric) < 10:
        return [0.0] * len(values)
    m = mean(numeric)
    s = stdev(numeric) if len(numeric) > 1 else 1.0
    if s < 1e-6: s = 1.0
    return [(v - m) / s if v is not None else 0.0 for v in values]


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def main():
    print("=== Undercurrent Index v2 ===")

    # Load source data
    trends = load_json("google_trends")
    bls = load_json("bls_unemployment")
    fred_claims = load_json("fred_claims")
    redfin = load_json("redfin_housing")
    expanded = load_json("fred_expanded")
    ai = load_json("ai_impact")
    cpi = load_json("bls_cpi_metro")
    macro = load_json("fred_macro")

    weeks = get_weekly_dates(260)
    print(f"Computing over {len(weeks)} weeks ({weeks[0]} → {weeks[-1]})")

    # ─── Load national signals once ───
    national_cache = {}

    def get_national_series(series_id):
        if series_id in national_cache:
            return national_cache[series_id]
        # Try expanded national
        if expanded and "national" in expanded:
            for key, spec in expanded["national"].items():
                if f"expanded_{key}" == series_id:
                    pts = spec.get("points", [])
                    vals = interpolate_monthly(pts, "date", "value", weeks) if spec.get("frequency") != "weekly" else map_weekly(pts, "date", "value", weeks)
                    national_cache[series_id] = fill_forward(vals)
                    return national_cache[series_id]
        # Try macro
        if macro:
            for key, spec in macro.items():
                if f"macro_{key}" == series_id or f"consumer_{key}" == series_id or f"labor_{key}" == series_id:
                    pts = spec.get("points", [])
                    vals = interpolate_monthly(pts, "date", "value", weeks)
                    national_cache[series_id] = fill_forward(vals)
                    return national_cache[series_id]
        # Try other patterns
        for prefix in ["fin_", "consumer_", "shipping_", "trade_", "energy_"]:
            if series_id.startswith(prefix):
                # These are in expanded or other files
                pass
        national_cache[series_id] = [None] * len(weeks)
        return national_cache[series_id]

    # ─── Compute global context modifier ───
    print("\nComputing global context modifier...")
    global_z_scores = {}
    for gkey, gspec in GLOBAL_CONTEXT.items():
        vals = get_national_series(gspec["series_id"])
        if any(v is not None for v in vals):
            z = z_score_series(vals)
            z = [v * gspec["direction"] for v in z]
            global_z_scores[gkey] = z
            print(f"  {gkey}: loaded")

    def compute_global_modifier(week_idx):
        if not global_z_scores:
            return 0.0
        total_w = sum(GLOBAL_CONTEXT[k]["weight"] for k in global_z_scores)
        if total_w == 0:
            return 0.0
        score = sum(global_z_scores[k][week_idx] * GLOBAL_CONTEXT[k]["weight"] for k in global_z_scores) / total_w
        # Convert to modifier range [-0.05, +0.05]
        return clamp(score * 0.02, -0.05, 0.05)

    # ─── Compute per-metro index ───
    print(f"\nComputing index for {len(METROS)} metros...")
    metros_output = []

    for metro in METROS:
        mid = metro.id
        mname = metro.name
        mstate = metro.state

        # ─── Load metro signals ───
        metro_signals = {}

        # Google Trends anxiety
        if trends and mid in trends:
            tw = trends[mid].get("weeks", [])
            anxiety = map_weekly(tw, "week", "anxiety_ratio", weeks)
            metro_signals["google_trends_anxiety"] = fill_forward(anxiety)

        # BLS unemployment
        if bls and mid in bls:
            months = bls[mid].get("months", [])
            unemp = interpolate_monthly(months, "month", "unemployment_rate", weeks)
            metro_signals["unemployment_rate"] = fill_forward(unemp)

        # FRED initial claims
        if fred_claims and mid in fred_claims:
            cw = fred_claims[mid].get("weeks", [])
            claims = map_weekly(cw, "week", "initial_claims", weeks)
            metro_signals["initial_claims"] = fill_forward(claims)

        # Redfin housing
        if redfin and mid in redfin:
            rw = redfin[mid].get("weeks", [])
            metro_signals["housing_inventory"] = fill_forward(map_weekly(rw, "week", "inventory", weeks))
            metro_signals["housing_dom"] = fill_forward(map_weekly(rw, "week", "median_dom", weeks))
            metro_signals["housing_price_drops"] = fill_forward(map_weekly(rw, "week", "price_drops", weeks))

        # New biz apps (from expanded, state-level)
        if expanded and "metroStateData" in expanded and mid in expanded["metroStateData"]:
            biz = expanded["metroStateData"][mid].get("bizApps", [])
            metro_signals["new_biz_apps"] = fill_forward(map_weekly(biz, "date", "value", weeks))

        # AI ratio
        if ai and mid in ai:
            aw = ai[mid].get("weeks", [])
            metro_signals["ai_job_ratio"] = fill_forward(map_weekly(aw, "week", "ai_ratio", weeks))

        # ─── Compute channel sub-indices ───
        channel_scores = {}  # channel_name → list of weekly z-scores

        for ch_key, ch_spec in CHANNELS.items():
            ch_signals = ch_spec["signals"]
            available = {}

            for sig_key, sig_spec in ch_signals.items():
                if sig_spec.get("national"):
                    vals = get_national_series(sig_spec["series_id"])
                else:
                    vals = metro_signals.get(sig_key)

                if vals and any(v is not None for v in vals):
                    z = z_score_series(vals)
                    z = [v * sig_spec["direction"] for v in z]
                    available[sig_key] = (z, sig_spec["weight"])

            if not available:
                channel_scores[ch_key] = [0.0] * len(weeks)
                continue

            # Renormalize weights
            total_w = sum(w for _, w in available.values())
            channel_z = [0.0] * len(weeks)
            for sig_key, (z_vals, weight) in available.items():
                norm_w = weight / total_w
                for i in range(len(weeks)):
                    channel_z[i] += z_vals[i] * norm_w

            channel_scores[ch_key] = channel_z

        # ─── Compute composite ───
        history = []
        for w_idx, week_str in enumerate(weeks):
            # Behavioral composite
            composite_z = sum(
                channel_scores[ch][w_idx] * CHANNELS[ch]["weight"]
                for ch in CHANNELS
            )

            # Apply global modifier
            modifier = compute_global_modifier(w_idx)
            composite_z_adj = composite_z * (1 + modifier)

            # Scale to 0-100
            behavioral = clamp(round((composite_z_adj + 3) / 6 * 100), 0, 100)

            # ─── Official benchmark ───
            off_vals = {}
            if "unemployment_rate" in metro_signals:
                off_vals["unemployment"] = metro_signals["unemployment_rate"][w_idx]
            if "initial_claims" in metro_signals:
                off_vals["claims"] = metro_signals["initial_claims"][w_idx]

            # Just use unemployment + claims for official for now
            official = 50
            if off_vals:
                # Simple: lower unemployment = higher score
                if "unemployment" in off_vals and off_vals["unemployment"] is not None:
                    # Z-score the unemployment rate
                    unemp_z = z_score_series(metro_signals.get("unemployment_rate", [None]*len(weeks)))
                    official = clamp(round((-unemp_z[w_idx] + 3) / 6 * 100), 0, 100)

            # Channel breakdown
            channel_snapshot = {}
            for ch_key in CHANNELS:
                channel_snapshot[ch_key] = round(channel_scores[ch_key][w_idx], 3)

            history.append({
                "week": week_str,
                "compositeScore": behavioral,
                "officialIndex": official,
                "vibesGap": behavioral - official,
                "channels": channel_snapshot,
                "signals": {},  # Keep empty for now to save space
            })

        # Trend
        if len(history) >= 8:
            recent = mean(h["compositeScore"] for h in history[-4:])
            prior = mean(h["compositeScore"] for h in history[-8:-4])
            trend = "improving" if recent - prior > 2 else "declining" if recent - prior < -2 else "stable"
        else:
            trend = "stable"

        # Quarterly
        from compute_index import compute_quarterly_benchmarks, compute_sentiment_drivers
        quarterly = compute_quarterly_benchmarks(history)
        drivers = compute_sentiment_drivers(history, {ch: CHANNELS[ch]["weight"] for ch in CHANNELS})

        metro_data = {
            "id": mid,
            "name": mname,
            "state": mstate,
            "population": metro.population,
            "signalsAvailable": list(metro_signals.keys()),
            "channels": list(CHANNELS.keys()),
            "history": history,
            "quarterly": quarterly,
            "sentimentDrivers": drivers,
        }

        # Write per-metro file
        with open(METROS_DIR / f"{mid}.json", "w") as f:
            json.dump(metro_data, f)

        metros_output.append(metro_data)

        sig_count = sum(1 for v in metro_signals.values() if v and any(x is not None for x in v))
        latest = history[-1]["compositeScore"] if history else 0
        print(f"  {mname:20s}: score={latest:3d}, {sig_count} signals, {len([c for c in channel_scores if any(v != 0 for v in channel_scores[c])])} channels active")

    # ─── Write dashboard summary ───
    scores = [m["history"][-1]["compositeScore"] for m in metros_output if m["history"]]
    nat_avg = round(mean(scores), 1) if scores else 0

    # National history (average across metros)
    national_history = []
    for w_idx in range(len(weeks)):
        composites = [m["history"][w_idx]["compositeScore"] for m in metros_output if w_idx < len(m["history"])]
        officials = [m["history"][w_idx]["officialIndex"] for m in metros_output if w_idx < len(m["history"])]
        if composites:
            ac = round(mean(composites))
            ao = round(mean(officials))
            national_history.append({
                "week": weeks[w_idx],
                "compositeScore": ac,
                "officialIndex": ao,
                "vibesGap": ac - ao,
            })

    # Build lightweight summaries
    metro_summaries = []
    for m in metros_output:
        h = m["history"]
        current = h[-1] if h else {}
        previous = h[-2] if len(h) > 1 else current
        metro_summaries.append({
            "id": m["id"],
            "name": m["name"],
            "state": m["state"],
            "population": m["population"],
            "currentScore": current.get("compositeScore", 50),
            "previousScore": previous.get("compositeScore", 50),
            "weekOverWeekChange": current.get("compositeScore", 50) - previous.get("compositeScore", 50),
            "vibesGap": current.get("vibesGap", 0),
            "trend": trend,
            "channels": list(CHANNELS.keys()),
            "signalsAvailable": m["signalsAvailable"],
            "quarterly": m.get("quarterly", []),
            "sentimentDrivers": m.get("sentimentDrivers", {}),
            "context": {},  # Will be filled by compute_index.py context step
            "sparkHistory": [{"week": w["week"], "compositeScore": w["compositeScore"],
                              "officialIndex": w["officialIndex"], "vibesGap": w["vibesGap"]}
                             for w in h[-52:]],
        })

    summary = {
        "generatedAt": datetime.now().isoformat(),
        "indexVersion": "2.0",
        "channels": {k: {"name": v["name"], "weight": v["weight"]} for k, v in CHANNELS.items()},
        "metroCount": len(metros_output),
        "nationalAverage": nat_avg,
        "sourcesUsed": ["google_trends", "bls_unemployment", "fred_claims", "redfin_housing", "fred_expanded", "ai_impact"],
    }

    dashboard = {
        "summary": summary,
        "nationalHistory": national_history,
        "metros": metro_summaries,
    }

    dashboard_path = DATA_DIR / "dashboard.json"
    with open(dashboard_path, "w") as f:
        json.dump(dashboard, f)

    size_kb = dashboard_path.stat().st_size / 1024
    print(f"\nIndex v2 complete: {len(metros_output)} metros, {nat_avg} national avg")
    print(f"Dashboard: {size_kb:.0f} KB")
    ch_summary = ", ".join(f"{CHANNELS[c]['name']}={CHANNELS[c]['weight']*100:.0f}%" for c in CHANNELS)
    print(f"Channel weights: {ch_summary}")


if __name__ == "__main__":
    main()
