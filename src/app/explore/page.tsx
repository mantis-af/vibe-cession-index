import { Header } from "@/components/dashboard/header";
import { ExploreClient } from "./explore-client";
import { getDbStats, getTaxonomy } from "@/lib/db";

export default function ExplorePage() {
  const stats = getDbStats();
  const taxonomy = getTaxonomy();

  // Group taxonomy into domain tree for the sidebar
  const domains: Record<string, Array<{ category: string; label: string; count: number }>> = {};
  for (const t of taxonomy) {
    if (!domains[t.domain]) domains[t.domain] = [];
    domains[t.domain].push({ category: t.category, label: t.label, count: t.series_count });
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-24">
        <ExploreClient
          totalSeries={stats.series}
          domains={domains}
        />
      </main>
    </div>
  );
}
