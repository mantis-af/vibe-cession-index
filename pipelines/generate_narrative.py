"""
Weekly narrative generator — produces data-driven written analysis.

Reads dashboard.json and generates:
1. National summary paragraph
2. Top movers (biggest gainers/losers this week)
3. Key signals narrative
4. Affordability highlight
5. AI impact spotlight

Outputs narrative.json consumed by the frontend.
"""

import json
from datetime import datetime
from pathlib import Path
from statistics import mean

OUTPUT_DIR = Path(__file__).parent / "output"
DASHBOARD_JSON = Path(__file__).parent.parent / "src" / "data" / "dashboard.json"
NARRATIVE_JSON = Path(__file__).parent.parent / "src" / "data" / "narrative.json"


def ordinal(n):
    s = {1: "st", 2: "nd", 3: "rd"}.get(n % 10 * (n % 100 not in (11, 12, 13)), "th")
    return f"{n}{s}"


def main():
    print("=== Weekly Narrative Generator ===")
    with open(DASHBOARD_JSON) as f:
        d = json.load(f)

    metros = d["metros"]
    summary = d["summary"]
    # Support both old format (history) and new format (sparkHistory)
    first_metro_history = metros[0].get("history") or metros[0].get("sparkHistory") or []
    latest_week = first_metro_history[-1]["week"] if first_metro_history else ""
    week_dt = datetime.strptime(latest_week, "%Y-%m-%d") if latest_week else datetime.now()

    def get_score(m):
        h = m.get("history") or m.get("sparkHistory") or []
        if h:
            return h[-1]["compositeScore"]
        return m.get("currentScore", 50)

    # Sort metros
    by_score = sorted(metros, key=get_score, reverse=True)
    scores = [get_score(m) for m in metros]
    avg_score = mean(scores)

    # Week-over-week changes
    wow_changes = []
    for m in metros:
        h = m.get("history") or m.get("sparkHistory") or []
        if len(h) >= 2:
            change = h[-1]["compositeScore"] - h[-2]["compositeScore"]
            wow_changes.append({"id": m["id"], "name": m["name"], "state": m["state"], "change": change, "score": h[-1]["compositeScore"]})

    wow_changes.sort(key=lambda x: x["change"])
    biggest_losers = wow_changes[:3]
    biggest_gainers = sorted(wow_changes, key=lambda x: x["change"], reverse=True)[:3]

    # National drivers
    drivers = summary.get("nationalDrivers", {})
    driver_list = drivers.get("drivers", [])

    # Quarterly context
    quarterly = summary.get("nationalQuarterly", [])
    current_q = quarterly[-1] if quarterly else None
    prev_q = quarterly[-2] if len(quarterly) > 1 else None

    # --- Generate narratives ---

    # 1. National summary
    direction = "improved" if drivers.get("periodChange", 0) > 0 else "declined" if drivers.get("periodChange", 0) < 0 else "held steady"
    national_para = (
        f"For the week of {week_dt.strftime('%B %d, %Y')}, the Undercurrent national composite "
        f"stands at {avg_score:.0f} out of 100, based on behavioral signals from {len(metros)} US metros. "
        f"Over the past month, the index has {direction} by {abs(drivers.get('periodChange', 0)):.1f} points. "
    )
    if current_q and prev_q and current_q.get("qoqChange") is not None:
        qdir = "up" if current_q["qoqChange"] > 0 else "down"
        national_para += (
            f"On a quarterly basis, {current_q['quarter']} is tracking {qdir} {abs(current_q['qoqChange']):.1f} points "
            f"from {prev_q['quarter']} (from {prev_q['avgScore']:.0f} to {current_q['avgScore']:.0f}). "
        )

    above_50 = sum(1 for s in scores if s >= 50)
    national_para += (
        f"{above_50} of {len(metros)} metros are above the neutral 50 threshold, "
        f"while {len(metros) - above_50} show sub-neutral behavioral sentiment."
    )

    # 2. Top movers
    movers_text = ""
    if biggest_gainers and biggest_gainers[0]["change"] > 0:
        g = biggest_gainers[0]
        movers_text += f"The biggest gainer this week is {g['name']}, {g['state']} (+{g['change']} to {g['score']}). "
    if biggest_losers and biggest_losers[0]["change"] < 0:
        l = biggest_losers[0]
        movers_text += f"The steepest decline came from {l['name']}, {l['state']} ({l['change']} to {l['score']}). "

    gainer_names = ", ".join(f"{g['name']} (+{g['change']})" for g in biggest_gainers if g["change"] > 0)
    loser_names = ", ".join(f"{l['name']} ({l['change']})" for l in biggest_losers if l["change"] < 0)
    if gainer_names:
        movers_text += f"Other notable gainers: {gainer_names}. "
    if loser_names:
        movers_text += f"Other notable decliners: {loser_names}."

    # 3. Key drivers narrative
    SIGNAL_NAMES = {
        "google_trends_anxiety": "search anxiety",
        "unemployment_rate": "unemployment",
        "initial_claims": "jobless claims",
        "housing_inventory": "housing inventory",
        "housing_dom": "days on market",
        "housing_price_drops": "price drops",
        "new_biz_apps": "new business applications",
        "ai_job_ratio": "AI job search activity",
    }
    drivers_text = ""
    drag = [d for d in driver_list if d["scoreImpact"] < -0.3]
    boost = [d for d in driver_list if d["scoreImpact"] > 0.3]
    if drag:
        drag_names = " and ".join(SIGNAL_NAMES.get(d["signal"], d["signal"]) for d in drag[:2])
        drivers_text += f"The primary drag on sentiment this period is {drag_names}, pulling the index down by a combined {sum(d['scoreImpact'] for d in drag):.1f} points. "
    if boost:
        boost_names = " and ".join(SIGNAL_NAMES.get(d["signal"], d["signal"]) for d in boost[:2])
        drivers_text += f"Offsetting this, {boost_names} contributed positively ({sum(d['scoreImpact'] for d in boost):+.1f} pts). "

    # 4. Top/bottom metro spotlight
    top = by_score[0]
    bottom = by_score[-1]
    spotlight_text = (
        f"Leading the rankings is {top['name']}, {top['state']} with a score of {get_score(top)}, "
        f"while {bottom['name']}, {bottom['state']} sits at the bottom with {get_score(bottom)}."
    )

    # 5. Affordability note
    aff_data = d.get("affordability", {})
    aff_text = ""
    if aff_data:
        aff_sorted = sorted(
            [(k, v) for k, v in aff_data.items() if "affordabilityScore" in v],
            key=lambda x: x[1]["affordabilityScore"],
            reverse=True
        )
        if aff_sorted:
            most = aff_sorted[0][1]
            least = aff_sorted[-1][1]
            aff_text = (
                f"On affordability, {most['metro']} remains the most affordable tracked metro "
                f"(score {most['affordabilityScore']}, {most['housingBurden']:.0f}% housing burden), "
                f"while {least['metro']} is the least affordable "
                f"(score {least['affordabilityScore']}, {least['housingBurden']:.0f}% of income to housing)."
            )

    narrative = {
        "weekOf": latest_week,
        "generatedAt": datetime.now().isoformat(),
        "headline": f"Undercurrent Weekly: National Index at {avg_score:.0f}",
        "sections": [
            {"title": "National Overview", "body": national_para},
            {"title": "Top Movers", "body": movers_text},
            {"title": "Signal Analysis", "body": drivers_text},
            {"title": "Metro Spotlight", "body": spotlight_text},
        ],
    }
    if aff_text:
        narrative["sections"].append({"title": "Affordability", "body": aff_text})

    with open(NARRATIVE_JSON, "w") as f:
        json.dump(narrative, f, indent=2)
    print(f"Saved to {NARRATIVE_JSON}")
    print(f"Headline: {narrative['headline']}")
    for s in narrative["sections"]:
        print(f"  [{s['title']}] {s['body'][:80]}...")


if __name__ == "__main__":
    main()
