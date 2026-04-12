"""
One-time migration: populate tags, series_tags, and series_keywords
for all existing series in the database.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from db import get_conn, init_db, ensure_tag, tag_series, add_keywords
from taxonomy import get_all_tags, classify_series


def main():
    print("=== Tag Migration ===")

    # 1. Ensure tag tables exist
    init_db()

    # 2. Populate the canonical tag hierarchy
    print("\nPopulating tag hierarchy...")
    all_tags = get_all_tags()
    for t in all_tags:
        ensure_tag(t["slug"], t["domain"], t["category"], t["subcategory"],
                   t["label"], t["description"])
    print(f"  {len(all_tags)} tags created")

    # 3. Classify every series
    conn = get_conn()
    series = conn.execute("SELECT id, name, category, scope, unit, frequency FROM series").fetchall()
    conn.close()
    print(f"\nClassifying {len(series)} series...")

    classified = 0
    for s in series:
        primary_slug, keywords = classify_series(
            s["id"], s["name"], s["category"], s["scope"], s["unit"], s["frequency"]
        )

        # Ensure the primary tag exists (might be a scope-specific one)
        parts = primary_slug.split(".")
        domain = parts[0]
        category = parts[1] if len(parts) > 1 else "other"
        subcategory = parts[2] if len(parts) > 2 else None
        ensure_tag(primary_slug, domain, category, subcategory,
                   label=f"{domain}/{category}" + (f"/{subcategory}" if subcategory else ""))

        # Tag the series
        tag_series(s["id"], primary_slug, is_primary=True)

        # Also tag with the parent (domain.category without subcategory)
        parent_slug = f"{domain}.{category}"
        if parent_slug != primary_slug:
            ensure_tag(parent_slug, domain, category)
            tag_series(s["id"], parent_slug, is_primary=False)

        # Add keywords
        add_keywords(s["id"], keywords)

        classified += 1
        if classified % 200 == 0:
            print(f"  {classified}/{len(series)} classified")

    print(f"  {classified} series classified")

    # 4. Report
    conn = get_conn()
    tag_count = conn.execute("SELECT COUNT(*) FROM tags").fetchone()[0]
    link_count = conn.execute("SELECT COUNT(*) FROM series_tags").fetchone()[0]
    kw_count = conn.execute("SELECT COUNT(*) FROM series_keywords").fetchone()[0]

    print(f"\n=== Migration Complete ===")
    print(f"  Tags: {tag_count}")
    print(f"  Series-tag links: {link_count}")
    print(f"  Keywords: {kw_count}")

    # Show domain distribution
    print(f"\nSeries by domain:")
    rows = conn.execute("""
        SELECT t.domain, COUNT(DISTINCT st.series_id) as c
        FROM series_tags st JOIN tags t ON st.tag_id = t.id
        WHERE st.is_primary = 1
        GROUP BY t.domain ORDER BY c DESC
    """).fetchall()
    for r in rows:
        print(f"  {r[0]:20s} {r[1]:5d}")

    conn.close()


if __name__ == "__main__":
    main()
