"use client";

import { useState, useCallback } from "react";
import { ChatPanel } from "@/components/analyze/chat-panel";
import { ArtifactRenderer, type ChartSpec } from "@/components/analyze/artifact-renderer";
import { DashboardRenderer, type DashboardSpec } from "@/components/analyze/dashboard-renderer";
import { BarChart3 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type SeriesDataMap = Record<string, Array<{ date: string; value: number }>>;

type Artifact =
  | { type: "chart"; spec: ChartSpec; title: string; data?: SeriesDataMap }
  | { type: "dashboard"; spec: DashboardSpec; title: string; data?: SeriesDataMap };

export function AnalyzeClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [activeArtifact, setActiveArtifact] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = { role: "user", content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const contentBlocks = data.content as Array<{
        type: string;
        text?: string;
        chart?: ChartSpec;
        dashboard?: DashboardSpec;
        seriesData?: SeriesDataMap;
      }>;

      const textParts: string[] = [];
      const newArtifacts: Artifact[] = [];

      for (const block of contentBlocks) {
        if (block.type === "text" && block.text) {
          textParts.push(block.text);
        }
        if (block.type === "chart" && block.chart) {
          newArtifacts.push({
            type: "chart",
            spec: block.chart,
            title: block.chart.title,
            data: block.seriesData,
          });
        }
        if (block.type === "dashboard" && block.dashboard) {
          newArtifacts.push({
            type: "dashboard",
            spec: block.dashboard,
            title: block.dashboard.title,
            data: block.seriesData,
          });
        }
      }

      const assistantText = textParts.join("\n\n") || "Here's the visualization.";
      setMessages([...newMessages, { role: "assistant", content: assistantText }]);

      if (newArtifacts.length > 0) {
        setArtifacts((prev) => {
          const updated = [...prev, ...newArtifacts];
          setActiveArtifact(updated.length - 1);
          return updated;
        });
      }
    } catch (err) {
      setError(String(err));
      setMessages([...newMessages, { role: "assistant", content: `Error: ${err}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const current = artifacts[activeArtifact];

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Chat Panel */}
      <div className="w-full lg:w-[400px] xl:w-[440px] border-r border-zinc-200 flex-shrink-0 h-1/2 lg:h-full overflow-hidden">
        <ChatPanel messages={messages} isLoading={isLoading} onSend={sendMessage} />
      </div>

      {/* Artifact Panel */}
      <div className="flex-1 flex flex-col h-1/2 lg:h-full overflow-hidden">
        {/* Tabs */}
        {artifacts.length > 1 && (
          <div className="border-b border-zinc-200 px-4 py-2 flex items-center gap-1 overflow-x-auto flex-shrink-0">
            {artifacts.map((art, i) => (
              <button
                key={i}
                onClick={() => setActiveArtifact(i)}
                className={`px-3 py-1 text-xs rounded-lg whitespace-nowrap transition-all ${
                  activeArtifact === i
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-muted-foreground hover:bg-zinc-50"
                }`}
              >
                {art.type === "dashboard" ? "📊 " : "📈 "}
                {art.title.length > 30 ? art.title.slice(0, 30) + "..." : art.title}
              </button>
            ))}
          </div>
        )}

        {/* Render area */}
        <div className="flex-1 p-4 sm:p-6 overflow-auto">
          {current ? (
            current.type === "dashboard" ? (
              <DashboardRenderer spec={current.spec} externalData={current.data} />
            ) : (
              <ArtifactRenderer spec={current.spec} externalData={current.data} />
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-zinc-50 flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-zinc-200" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Artifact Panel</h3>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                Charts and dashboards will appear here. The analyst can create single charts or multi-chart dashboard layouts with independent axes.
              </p>
              {error && (
                <div className="mt-4 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
