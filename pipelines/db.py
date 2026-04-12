"""
SQLite database for Undercurrent economic data.

Schema:
  series — metadata for each time series
  datapoints — actual values (date, value) for each series
  sources — data source registry

This replaces the flat JSON catalog for scalable storage.
"""

import sqlite3
import json
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "data" / "undercurrent.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create tables if they don't exist."""
    conn = get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS sources (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            url TEXT,
            description TEXT,
            last_fetched TEXT,
            series_count INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS series (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            scope TEXT NOT NULL,          -- national, metro, regional, state
            metro TEXT,                    -- metro ID if scope=metro
            metro_name TEXT,
            state TEXT,                    -- state code if scope=state/metro
            unit TEXT,
            frequency TEXT,                -- daily, weekly, monthly, quarterly, annual
            source_id TEXT,
            source_series_id TEXT,         -- original series ID from source (e.g., FRED ID)
            description TEXT,
            last_updated TEXT,
            point_count INTEGER DEFAULT 0,
            FOREIGN KEY (source_id) REFERENCES sources(id)
        );

        CREATE TABLE IF NOT EXISTS datapoints (
            series_id TEXT NOT NULL,
            date TEXT NOT NULL,
            value REAL NOT NULL,
            PRIMARY KEY (series_id, date),
            FOREIGN KEY (series_id) REFERENCES series(id)
        );

        CREATE INDEX IF NOT EXISTS idx_series_category ON series(category);
        CREATE INDEX IF NOT EXISTS idx_series_scope ON series(scope);

        -- Hierarchical tag system
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT NOT NULL UNIQUE,
            domain TEXT NOT NULL,
            category TEXT NOT NULL,
            subcategory TEXT,
            label TEXT NOT NULL,
            description TEXT,
            sort_order INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS series_tags (
            series_id TEXT NOT NULL,
            tag_id INTEGER NOT NULL,
            is_primary INTEGER DEFAULT 0,
            PRIMARY KEY (series_id, tag_id),
            FOREIGN KEY (series_id) REFERENCES series(id),
            FOREIGN KEY (tag_id) REFERENCES tags(id)
        );

        CREATE TABLE IF NOT EXISTS series_keywords (
            series_id TEXT NOT NULL,
            keyword TEXT NOT NULL,
            PRIMARY KEY (series_id, keyword),
            FOREIGN KEY (series_id) REFERENCES series(id)
        );

        CREATE INDEX IF NOT EXISTS idx_tags_domain ON tags(domain);
        CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
        CREATE INDEX IF NOT EXISTS idx_series_tags_tag ON series_tags(tag_id);
        CREATE INDEX IF NOT EXISTS idx_series_tags_primary ON series_tags(is_primary);
        CREATE INDEX IF NOT EXISTS idx_keywords ON series_keywords(keyword);
        CREATE INDEX IF NOT EXISTS idx_series_metro ON series(metro);
        CREATE INDEX IF NOT EXISTS idx_series_source ON series(source_id);
        CREATE INDEX IF NOT EXISTS idx_datapoints_series ON datapoints(series_id);
        CREATE INDEX IF NOT EXISTS idx_datapoints_date ON datapoints(date);
    """)
    conn.commit()
    conn.close()
    print(f"Database initialized at {DB_PATH}")


def upsert_source(source_id: str, name: str, url: str = "", description: str = ""):
    conn = get_conn()
    conn.execute(
        "INSERT OR REPLACE INTO sources (id, name, url, description, last_fetched) VALUES (?, ?, ?, ?, ?)",
        (source_id, name, url, description, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()


def upsert_series(series_id: str, name: str, category: str, scope: str,
                   unit: str = "", frequency: str = "", source_id: str = "",
                   source_series_id: str = "", description: str = "",
                   metro: str = None, metro_name: str = None, state: str = None):
    conn = get_conn()
    conn.execute("""
        INSERT OR REPLACE INTO series
        (id, name, category, scope, metro, metro_name, state, unit, frequency,
         source_id, source_series_id, description, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (series_id, name, category, scope, metro, metro_name, state, unit, frequency,
          source_id, source_series_id, description, datetime.now().isoformat()))
    conn.commit()
    conn.close()


def insert_datapoints(series_id: str, points: list[tuple[str, float]]):
    """Bulk insert datapoints. points = [(date_str, value), ...]"""
    if not points:
        return
    conn = get_conn()
    conn.executemany(
        "INSERT OR REPLACE INTO datapoints (series_id, date, value) VALUES (?, ?, ?)",
        [(series_id, date, value) for date, value in points]
    )
    # Update point count
    count = conn.execute("SELECT COUNT(*) FROM datapoints WHERE series_id = ?", (series_id,)).fetchone()[0]
    conn.execute("UPDATE series SET point_count = ?, last_updated = ? WHERE id = ?",
                 (count, datetime.now().isoformat(), series_id))
    conn.commit()
    conn.close()


def search_series(query: str = "", category: str = None, scope: str = None,
                   metro: str = None, source_id: str = None, limit: int = 50) -> list[dict]:
    """Search series by keyword, category, scope, metro."""
    conn = get_conn()
    conditions = []
    params = []

    if query:
        terms = query.lower().split()
        for term in terms:
            conditions.append("(LOWER(s.name) LIKE ? OR LOWER(s.metro_name) LIKE ? OR LOWER(s.category) LIKE ? OR LOWER(s.metro) LIKE ?)")
            params.extend([f"%{term}%"] * 4)

    if category:
        conditions.append("s.category = ?")
        params.append(category)
    if scope:
        conditions.append("s.scope = ?")
        params.append(scope)
    if metro:
        conditions.append("s.metro = ?")
        params.append(metro)
    if source_id:
        conditions.append("s.source_id = ?")
        params.append(source_id)

    where = " AND ".join(conditions) if conditions else "1=1"
    rows = conn.execute(f"""
        SELECT s.*, src.name as source_name
        FROM series s
        LEFT JOIN sources src ON s.source_id = src.id
        WHERE {where}
        ORDER BY s.point_count DESC
        LIMIT ?
    """, params + [limit]).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_datapoints(series_id: str, date_from: str = None, date_to: str = None) -> list[dict]:
    """Get time series data for a series."""
    conn = get_conn()
    conditions = ["series_id = ?"]
    params: list = [series_id]
    if date_from:
        conditions.append("date >= ?")
        params.append(date_from)
    if date_to:
        conditions.append("date <= ?")
        params.append(date_to)

    rows = conn.execute(
        f"SELECT date, value FROM datapoints WHERE {' AND '.join(conditions)} ORDER BY date",
        params
    ).fetchall()
    conn.close()
    return [{"date": r["date"], "value": r["value"]} for r in rows]


def get_stats() -> dict:
    """Get database statistics."""
    conn = get_conn()
    stats = {
        "total_series": conn.execute("SELECT COUNT(*) FROM series").fetchone()[0],
        "total_datapoints": conn.execute("SELECT COUNT(*) FROM datapoints").fetchone()[0],
        "total_sources": conn.execute("SELECT COUNT(*) FROM sources").fetchone()[0],
        "categories": [r[0] for r in conn.execute("SELECT DISTINCT category FROM series ORDER BY category").fetchall()],
        "scopes": [r[0] for r in conn.execute("SELECT DISTINCT scope FROM series ORDER BY scope").fetchall()],
        "sources": [dict(r) for r in conn.execute("SELECT id, name, series_count, last_fetched FROM sources ORDER BY name").fetchall()],
    }
    conn.close()
    return stats


def ensure_tag(slug: str, domain: str, category: str, subcategory: str = None,
                label: str = "", description: str = "") -> int:
    """Insert a tag if it doesn't exist. Returns the tag id."""
    conn = get_conn()
    existing = conn.execute("SELECT id FROM tags WHERE slug = ?", (slug,)).fetchone()
    if existing:
        conn.close()
        return existing[0]
    conn.execute(
        "INSERT INTO tags (slug, domain, category, subcategory, label, description) VALUES (?, ?, ?, ?, ?, ?)",
        (slug, domain, category, subcategory, label or slug, description or "")
    )
    tag_id = conn.execute("SELECT id FROM tags WHERE slug = ?", (slug,)).fetchone()[0]
    conn.commit()
    conn.close()
    return tag_id


def tag_series(series_id: str, tag_slug: str, is_primary: bool = False):
    """Associate a series with a tag (by slug)."""
    conn = get_conn()
    tag = conn.execute("SELECT id FROM tags WHERE slug = ?", (tag_slug,)).fetchone()
    if not tag:
        conn.close()
        return
    conn.execute(
        "INSERT OR REPLACE INTO series_tags (series_id, tag_id, is_primary) VALUES (?, ?, ?)",
        (series_id, tag[0], 1 if is_primary else 0)
    )
    conn.commit()
    conn.close()


def add_keywords(series_id: str, keywords: list[str]):
    """Add searchable keywords for a series."""
    if not keywords:
        return
    conn = get_conn()
    conn.executemany(
        "INSERT OR IGNORE INTO series_keywords (series_id, keyword) VALUES (?, ?)",
        [(series_id, kw.lower()) for kw in keywords if len(kw) > 1]
    )
    conn.commit()
    conn.close()


def search_by_tags(query: str = "", domain: str = None, tag_slug: str = None,
                    scope: str = None, metro: str = None, state: str = None,
                    limit: int = 50) -> list[dict]:
    """Tag-aware search. Joins series → series_tags → tags for hierarchical filtering."""
    conn = get_conn()
    conditions = []
    params: list = []

    # Full-text keyword search
    if query:
        terms = query.lower().split()
        for term in terms:
            conditions.append("""(
                s.id IN (SELECT series_id FROM series_keywords WHERE keyword LIKE ?)
                OR LOWER(s.name) LIKE ?
                OR LOWER(COALESCE(s.metro_name,'')) LIKE ?
            )""")
            params.extend([f"%{term}%", f"%{term}%", f"%{term}%"])

    # Tag filters
    if domain:
        conditions.append("s.id IN (SELECT st.series_id FROM series_tags st JOIN tags t ON st.tag_id = t.id WHERE t.domain = ?)")
        params.append(domain)
    if tag_slug:
        conditions.append("s.id IN (SELECT st.series_id FROM series_tags st JOIN tags t ON st.tag_id = t.id WHERE t.slug = ? OR t.slug LIKE ?)")
        params.extend([tag_slug, f"{tag_slug}.%"])

    # Direct filters
    if scope:
        conditions.append("s.scope = ?")
        params.append(scope)
    if metro:
        conditions.append("s.metro = ?")
        params.append(metro)
    if state:
        conditions.append("s.state = ?")
        params.append(state)

    where = " AND ".join(conditions) if conditions else "1=1"

    rows = conn.execute(f"""
        SELECT s.id, s.name, s.category, s.scope, s.metro, s.metro_name, s.state,
               s.unit, s.frequency, s.source_id, s.point_count,
               (SELECT t.slug FROM series_tags st JOIN tags t ON st.tag_id = t.id
                WHERE st.series_id = s.id AND st.is_primary = 1 LIMIT 1) as primary_tag,
               (SELECT t.domain FROM series_tags st JOIN tags t ON st.tag_id = t.id
                WHERE st.series_id = s.id AND st.is_primary = 1 LIMIT 1) as domain
        FROM series s
        WHERE {where}
        ORDER BY s.point_count DESC
        LIMIT ?
    """, params + [limit]).fetchall()

    conn.close()
    return [dict(r) for r in rows]


def get_taxonomy() -> list[dict]:
    """Return the full tag tree for frontend navigation."""
    conn = get_conn()
    rows = conn.execute("""
        SELECT t.slug, t.domain, t.category, t.subcategory, t.label, t.description,
               COUNT(st.series_id) as series_count
        FROM tags t
        LEFT JOIN series_tags st ON t.id = st.tag_id
        GROUP BY t.id
        HAVING series_count > 0
        ORDER BY t.sort_order
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def migrate_from_catalog():
    """Migrate existing catalog.json data into SQLite."""
    catalog_path = Path(__file__).parent.parent / "src" / "data" / "catalog.json"
    if not catalog_path.exists():
        print("No catalog.json found to migrate")
        return

    print("Migrating catalog.json → SQLite...")
    with open(catalog_path) as f:
        catalog = json.load(f)

    # Register sources
    sources_seen = set()
    for entry in catalog["index"]:
        src = entry.get("source", "Unknown")
        if src not in sources_seen:
            upsert_source(src.lower().replace(" ", "_").replace("/", "_"), src)
            sources_seen.add(src)

    # Insert series + datapoints
    total = len(catalog["index"])
    for i, entry in enumerate(catalog["index"]):
        sid = entry["id"]
        src_id = entry.get("source", "Unknown").lower().replace(" ", "_").replace("/", "_")

        upsert_series(
            series_id=sid,
            name=entry["name"],
            category=entry.get("category", "Other"),
            scope=entry.get("scope", "national"),
            unit=entry.get("unit", ""),
            frequency=entry.get("frequency", ""),
            source_id=src_id,
            metro=entry.get("metro"),
            metro_name=entry.get("metroName"),
        )

        points = catalog["series"].get(sid, [])
        if points:
            insert_datapoints(sid, [(p["date"], p["value"]) for p in points])

        if (i + 1) % 100 == 0:
            print(f"  Migrated {i + 1}/{total} series")

    # Update source counts
    conn = get_conn()
    conn.execute("""
        UPDATE sources SET series_count = (
            SELECT COUNT(*) FROM series WHERE source_id = sources.id
        )
    """)
    conn.commit()
    conn.close()

    stats = get_stats()
    print(f"\nMigration complete:")
    print(f"  Series: {stats['total_series']}")
    print(f"  Datapoints: {stats['total_datapoints']}")
    print(f"  Sources: {stats['total_sources']}")


if __name__ == "__main__":
    init_db()
    migrate_from_catalog()
