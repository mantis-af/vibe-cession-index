import Database from "better-sqlite3";
import path from "path";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), "data", "undercurrent.db");
    db = new Database(dbPath, { readonly: true });
    db.pragma("journal_mode = WAL");
  }
  return db;
}

export interface SeriesMeta {
  id: string;
  name: string;
  category: string;
  scope: string;
  metro: string | null;
  metro_name: string | null;
  state: string | null;
  unit: string;
  frequency: string;
  source_id: string;
  point_count: number;
  primary_tag: string | null;
  domain: string | null;
}

export interface DataPoint {
  date: string;
  value: number;
}

export function searchSeries(opts: {
  query?: string;
  domain?: string;
  tagSlug?: string;
  scope?: string;
  metro?: string;
  state?: string;
  limit?: number;
  offset?: number;
}): { total: number; series: SeriesMeta[] } {
  const d = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (opts.query) {
    const terms = opts.query.toLowerCase().split(/\s+/).filter(Boolean);
    for (const term of terms) {
      conditions.push(`(
        s.id IN (SELECT series_id FROM series_keywords WHERE keyword LIKE ?)
        OR LOWER(s.name) LIKE ?
        OR LOWER(COALESCE(s.metro_name,'')) LIKE ?
        OR LOWER(COALESCE(s.state,'')) LIKE ?
      )`);
      const t = `%${term}%`;
      params.push(t, t, t, t);
    }
  }

  if (opts.domain) {
    conditions.push("s.id IN (SELECT st.series_id FROM series_tags st JOIN tags t ON st.tag_id = t.id WHERE t.domain = ?)");
    params.push(opts.domain);
  }
  if (opts.tagSlug) {
    conditions.push("s.id IN (SELECT st.series_id FROM series_tags st JOIN tags t ON st.tag_id = t.id WHERE t.slug = ? OR t.slug LIKE ?)");
    params.push(opts.tagSlug, `${opts.tagSlug}.%`);
  }
  if (opts.scope) { conditions.push("s.scope = ?"); params.push(opts.scope); }
  if (opts.metro) { conditions.push("s.metro = ?"); params.push(opts.metro); }
  if (opts.state) { conditions.push("s.state = ?"); params.push(opts.state); }

  const where = conditions.length > 0 ? conditions.join(" AND ") : "1=1";
  const limit = opts.limit || 50;
  const offset = opts.offset || 0;

  const total = (d.prepare(`SELECT COUNT(*) as c FROM series s WHERE ${where}`).get(...params) as { c: number }).c;

  const rows = d.prepare(`
    SELECT s.id, s.name, s.category, s.scope, s.metro, s.metro_name, s.state,
           s.unit, s.frequency, s.source_id, s.point_count,
           (SELECT t.slug FROM series_tags st JOIN tags t ON st.tag_id = t.id
            WHERE st.series_id = s.id AND st.is_primary = 1 LIMIT 1) as primary_tag,
           (SELECT t.domain FROM series_tags st JOIN tags t ON st.tag_id = t.id
            WHERE st.series_id = s.id AND st.is_primary = 1 LIMIT 1) as domain
    FROM series s
    WHERE ${where}
    ORDER BY s.point_count DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as SeriesMeta[];

  return { total, series: rows };
}

export function getSeriesData(seriesId: string, dateFrom?: string, dateTo?: string): { name: string; unit: string; points: DataPoint[] } | null {
  const d = getDb();
  const info = d.prepare("SELECT name, unit FROM series WHERE id = ?").get(seriesId) as { name: string; unit: string } | undefined;
  if (!info) return null;

  let sql = "SELECT date, value FROM datapoints WHERE series_id = ?";
  const params: string[] = [seriesId];
  if (dateFrom) { sql += " AND date >= ?"; params.push(dateFrom); }
  if (dateTo) { sql += " AND date <= ?"; params.push(dateTo); }
  sql += " ORDER BY date";

  const points = d.prepare(sql).all(...params) as DataPoint[];
  return { name: info.name, unit: info.unit, points };
}

export function getTaxonomy(): Array<{ domain: string; category: string; label: string; series_count: number }> {
  const d = getDb();
  return d.prepare(`
    SELECT t.domain, t.category, t.label, COUNT(DISTINCT st.series_id) as series_count
    FROM tags t
    JOIN series_tags st ON t.id = st.tag_id
    WHERE t.subcategory IS NULL
    GROUP BY t.domain, t.category
    HAVING series_count > 0
    ORDER BY t.domain, series_count DESC
  `).all() as Array<{ domain: string; category: string; label: string; series_count: number }>;
}

export function getDbStats(): { series: number; datapoints: number; domains: string[] } {
  const d = getDb();
  return {
    series: (d.prepare("SELECT COUNT(*) as c FROM series").get() as { c: number }).c,
    datapoints: (d.prepare("SELECT COUNT(*) as c FROM datapoints").get() as { c: number }).c,
    domains: (d.prepare("SELECT DISTINCT domain FROM tags t JOIN series_tags st ON t.id = st.tag_id ORDER BY domain").all() as Array<{ domain: string }>).map(r => r.domain),
  };
}
