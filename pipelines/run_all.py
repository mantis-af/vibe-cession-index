#!/usr/bin/env python3
"""
Master pipeline runner. Fetches all sources then computes the index.

Usage:
  python pipelines/run_all.py           # Run everything
  python pipelines/run_all.py --skip-trends  # Skip Google Trends (slow, rate-limited)
"""

import subprocess
import sys
from pathlib import Path

PYTHON = str(Path(__file__).parent / ".venv" / "bin" / "python")
PIPELINES_DIR = Path(__file__).parent


def run(script: str, description: str):
    print(f"\n{'='*60}")
    print(f"  {description}")
    print(f"{'='*60}\n")
    result = subprocess.run(
        [PYTHON, str(PIPELINES_DIR / script)],
        cwd=str(PIPELINES_DIR.parent),
    )
    if result.returncode != 0:
        print(f"WARNING: {script} exited with code {result.returncode}")
    return result.returncode


def main():
    skip_trends = "--skip-trends" in sys.argv

    if not skip_trends:
        run("sources/google_trends.py", "Google Trends — Search Anxiety Index")
    else:
        print("Skipping Google Trends (--skip-trends)")

    run("sources/bls_unemployment.py", "BLS LAUS — Metro Unemployment Rates")
    run("sources/fred_claims.py", "FRED — Weekly Initial Claims")
    run("sources/redfin_housing.py", "Redfin — Housing Inventory, DOM, Price Drops")

    # Context / macro pipelines
    run("sources/fred_macro.py", "FRED Macro — GDP, CPI, Sentiment, Rates, Payrolls")
    run("sources/fred_expanded.py", "FRED Expanded — Markets, Housing, Business, State-Level")
    run("sources/bls_cpi_metro.py", "BLS CPI — Metro-Level Consumer Prices")
    run("sources/eia_gas.py", "EIA — Regional Gas Prices")
    run("sources/zillow_home_values.py", "Zillow — Metro Home Values (ZHVI)")
    run("sources/affordability.py", "Affordability Index — Income vs Cost of Living")

    if not skip_trends:
        run("sources/ai_impact.py", "AI Impact — AI vs Traditional Job Search Interest")

    run("compute_index.py", "Computing Composite Index + Context")

    print("\n" + "=" * 60)
    print("  Pipeline complete. Dashboard data updated.")
    print("=" * 60)


if __name__ == "__main__":
    main()
