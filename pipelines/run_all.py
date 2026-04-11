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

    run("compute_index.py", "Computing Composite Index")

    print("\n" + "=" * 60)
    print("  Pipeline complete. Dashboard data updated.")
    print("=" * 60)


if __name__ == "__main__":
    main()
