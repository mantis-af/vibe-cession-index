"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, Menu, X } from "lucide-react";
import { ScrollProgress } from "@/components/motion";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/insights", label: "Insights" },
  { href: "/compare", label: "Compare" },
  { href: "/methodology", label: "Methodology" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <ScrollProgress />
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2.5 group">
              <Activity className="h-5 w-5 text-indigo-500 group-hover:text-indigo-600 transition-colors" />
              <span className="font-[family-name:var(--font-playfair)] text-lg text-foreground tracking-tight italic">
                Undercurrent
              </span>
            </Link>

            <nav className="hidden sm:flex items-center gap-1 text-sm">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 transition-all">
                  {link.label}
                </Link>
              ))}
              <a
                href="https://github.com/mantis-af/vibe-cession-index"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 transition-all"
              >
                GitHub
              </a>
            </nav>

            <button
              className="sm:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="sm:hidden border-t border-zinc-200 px-4 py-3 space-y-1 bg-white">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-zinc-50 transition-all"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </header>
    </>
  );
}
