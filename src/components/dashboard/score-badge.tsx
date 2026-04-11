import { scoreBg, scoreLabel } from "@/lib/colors";
import { cn } from "@/lib/utils";

export function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };
  return (
    <span className={cn("rounded-md font-mono font-semibold inline-flex items-center gap-1.5", scoreBg(score), sizeClasses[size])}>
      <span>{score}</span>
      <span className="opacity-70 text-[0.8em]">{scoreLabel(score)}</span>
    </span>
  );
}
