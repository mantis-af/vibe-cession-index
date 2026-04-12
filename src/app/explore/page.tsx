import { Header } from "@/components/dashboard/header";
import { ExploreClient } from "./explore-client";
import catalogIndex from "@/data/catalog_index.json";
import catalogFull from "@/data/catalog.json";

export default function ExplorePage() {
  // Pass the index for search + the full series data for charting
  // In production, the series data would be fetched on demand via API route
  const seriesData = (catalogFull as unknown as { series: Record<string, Array<{ date: string; value: number }>> }).series;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-24">
        <ExploreClient
          index={catalogIndex.index.map((s) => ({ ...s, metro: s.metro ?? undefined, metroName: s.metroName ?? undefined }))}
          seriesData={seriesData}
          totalSeries={catalogIndex.totalSeries}
        />
      </main>
    </div>
  );
}
