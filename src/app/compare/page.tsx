import { METROS } from "@/lib/load-data";
import { Header } from "@/components/dashboard/header";
import { CompareClient } from "./compare-client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ComparePage() {
  // Default: top 3 and bottom 1
  const sorted = [...METROS].sort((a, b) => b.currentScore - a.currentScore);
  const defaults = [sorted[0].id, sorted[1].id, sorted[sorted.length - 1].id];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-24 max-w-7xl mx-auto px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Overview
        </Link>

        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl tracking-tight text-foreground mb-2">
            <span className="font-[family-name:var(--font-instrument)] italic">Compare Metros</span>
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Side-by-side analysis of up to 6 metropolitan areas. See how their behavioral indexes diverge over time.
          </p>
        </div>

        <CompareClient allMetros={METROS} initialIds={defaults} />
      </main>
    </div>
  );
}
