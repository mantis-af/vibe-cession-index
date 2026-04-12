import { METROS } from "@/lib/load-data";
import { Header } from "@/components/dashboard/header";
import { CompareClient } from "./compare-client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ComparePage() {
  // Default: top 2, a middle one, and bottom 1 — showcasing range across 50 metros
  const sorted = [...METROS].sort((a, b) => b.currentScore - a.currentScore);
  const defaults = [
    sorted[0].id,                           // highest
    sorted[Math.floor(sorted.length / 2)].id, // median
    sorted[sorted.length - 1].id,           // lowest
  ];

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
            Side-by-side analysis of up to 6 of the 50 tracked metros. Compare behavioral index trends, sentiment gaps, and economic indicators.
          </p>
        </div>

        <CompareClient allMetros={METROS} initialIds={defaults} />
      </main>
    </div>
  );
}
