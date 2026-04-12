"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "pulse", label: "Pulse" },
  { id: "narrative", label: "Analysis" },
  { id: "map", label: "Map" },
  { id: "macro", label: "Macro" },
  { id: "quarterly", label: "Quarterly" },
  { id: "drivers", label: "Drivers" },
  { id: "predictive", label: "Predictive" },
  { id: "housing", label: "Housing" },
  { id: "affordability", label: "Affordability" },
  { id: "ai", label: "AI Impact" },
  { id: "rankings", label: "Rankings" },
];

export function SectionNav() {
  const [active, setActive] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      // Show after scrolling past hero (~85vh)
      setVisible(window.scrollY > window.innerHeight * 0.7);

      // Find which section is in view
      const sections = SECTIONS.map((s) => {
        const el = document.getElementById(s.id);
        if (!el) return { id: s.id, top: Infinity };
        const rect = el.getBoundingClientRect();
        return { id: s.id, top: Math.abs(rect.top - 80) };
      });
      const closest = sections.reduce((a, b) => (a.top < b.top ? a : b));
      setActive(closest.id);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <nav className="fixed top-14 left-0 right-0 z-40 bg-white/90 backdrop-blur-sm border-b border-zinc-200 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide -mx-1">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                const el = document.getElementById(section.id);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0",
                active === section.id
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-muted-foreground hover:text-foreground hover:bg-zinc-100"
              )}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
