"use client";

import { FadeIn } from "@/components/motion";
import { FileText } from "lucide-react";

interface NarrativeSection {
  title: string;
  body: string;
}

interface Props {
  headline: string;
  weekOf: string;
  sections: NarrativeSection[];
}

export function WeeklyNarrative({ headline, weekOf, sections }: Props) {
  if (!sections.length) return null;

  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-7xl mx-auto">
      <FadeIn>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-300/30 to-transparent" />
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl tracking-tight text-foreground mb-2">
          <span className="font-[family-name:var(--font-instrument)] italic">Weekly Analysis</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mb-10">
          Auto-generated narrative from this week&apos;s data — key movements, drivers, and outlooks.
        </p>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="surface rounded-2xl p-6 sm:p-8">
          {/* Headline */}
          <div className="flex items-start gap-3 mb-6">
            <FileText className="h-5 w-5 text-indigo-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground leading-tight">{headline}</h3>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                Week of {new Date(weekOf + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-5">
            {sections.map((section, i) => (
              <div key={i}>
                <h4 className="text-xs font-mono uppercase tracking-wider text-indigo-500 mb-1.5">
                  {section.title}
                </h4>
                <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">
                  {section.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-100">
            <p className="text-[10px] text-muted-foreground">
              This analysis is automatically generated from pipeline data. It summarizes the most significant
              movements in the behavioral index and its component signals across 50 tracked US metros.
            </p>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
