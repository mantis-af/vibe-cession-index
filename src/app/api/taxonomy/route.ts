import { getTaxonomy, getDbStats } from "@/lib/db";

export async function GET() {
  const taxonomy = getTaxonomy();
  const stats = getDbStats();

  // Group into domain tree
  const tree: Record<string, { categories: Array<{ category: string; label: string; count: number }>; total: number }> = {};
  for (const t of taxonomy) {
    if (!tree[t.domain]) tree[t.domain] = { categories: [], total: 0 };
    tree[t.domain].categories.push({ category: t.category, label: t.label, count: t.series_count });
    tree[t.domain].total += t.series_count;
  }

  return Response.json({
    totalSeries: stats.series,
    totalDatapoints: stats.datapoints,
    domains: tree,
  });
}
