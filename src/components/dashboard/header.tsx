import Link from "next/link";
import { Activity } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Activity className="h-5 w-5 text-violet-400 group-hover:text-violet-300 transition-colors" />
            <span className="font-semibold text-foreground tracking-tight">
              Vibe-cession Index
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Overview
            </Link>
            <Link href="/methodology" className="text-muted-foreground hover:text-foreground transition-colors">
              Methodology
            </Link>
            <a
              href="https://github.com/mantis-af/vibe-cession-index"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
