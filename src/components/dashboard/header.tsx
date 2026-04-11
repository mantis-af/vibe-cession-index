"use client";

import Link from "next/link";
import { Activity } from "lucide-react";
import { ScrollProgress } from "@/components/motion";

export function Header() {
  return (
    <>
      <ScrollProgress />
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative">
                <Activity className="h-5 w-5 text-violet-400 group-hover:text-violet-300 transition-colors" />
                <div className="absolute inset-0 blur-md bg-violet-400/30 group-hover:bg-violet-300/40 transition-colors" />
              </div>
              <span className="font-semibold text-foreground tracking-tight text-[15px]">
                Vibe-cession
              </span>
              <span className="text-[10px] font-mono text-violet-400/80 bg-violet-400/10 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                Index
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/" className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
                Overview
              </Link>
              <Link href="/methodology" className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
                Methodology
              </Link>
              <a
                href="https://github.com/mantis-af/vibe-cession-index"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
              >
                GitHub
              </a>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}
