"use client";

import { useState, useCallback } from "react";
import { ChatPanel } from "@/components/analyze/chat-panel";
import { ArtifactRenderer, type ChartSpec } from "@/components/analyze/artifact-renderer";
import { BarChart3, MessageSquare } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AnalyzeClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [charts, setCharts] = useState<ChartSpec[]>([]);
  const [activeChart, setActiveChart] = useState(0);
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
      const contentBlocks = data.content as Array<{ type: string; text?: string; chart?: ChartSpec }>;

      // Extract text and charts from response
      const textParts: string[] = [];
      const newCharts: ChartSpec[] = [];

      for (const block of contentBlocks) {
        if (block.type === "text" && block.text) {
          textParts.push(block.text);
        }
        if (block.type === "chart" && block.chart) {
          newCharts.push(block.chart);
        }
      }

      // Add assistant message
      const assistantText = textParts.join("\n\n") || "Here's the visualization.";
      setMessages([...newMessages, { role: "assistant", content: assistantText }]);

      // Add charts
      if (newCharts.length > 0) {
        setCharts((prev) => {
          const updated = [...prev, ...newCharts];
          setActiveChart(updated.length - 1); // Show latest
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

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Chat Panel — left */}
      <div className="w-full lg:w-[400px] xl:w-[440px] border-r border-zinc-200 flex-shrink-0 h-1/2 lg:h-full overflow-hidden">
        <ChatPanel messages={messages} isLoading={isLoading} onSend={sendMessage} />
      </div>

      {/* Artifact Panel — right */}
      <div className="flex-1 flex flex-col h-1/2 lg:h-full overflow-hidden">
        {/* Chart tabs (if multiple) */}
        {charts.length > 1 && (
          <div className="border-b border-zinc-200 px-4 py-2 flex items-center gap-1 overflow-x-auto">
            {charts.map((chart, i) => (
              <button
                key={i}
                onClick={() => setActiveChart(i)}
                className={`px-3 py-1 text-xs rounded-lg whitespace-nowrap transition-all ${
                  activeChart === i
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-muted-foreground hover:bg-zinc-50"
                }`}
              >
                {chart.title.length > 30 ? chart.title.slice(0, 30) + "..." : chart.title}
              </button>
            ))}
          </div>
        )}

        {/* Chart area */}
        <div className="flex-1 p-4 sm:p-6 overflow-auto">
          {charts.length > 0 ? (
            <ArtifactRenderer spec={charts[activeChart]} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-zinc-50 flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-zinc-200" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Artifact Panel</h3>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                Charts will appear here when the analyst generates visualizations. Start a conversation to explore the data.
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
