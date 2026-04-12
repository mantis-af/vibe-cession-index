"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  messages: Message[];
  isLoading: boolean;
  onSend: (message: string) => void;
}

export function ChatPanel({ messages, isLoading, onSend }: Props) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Bot className="h-8 w-8 text-indigo-300 mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">Undercurrent Analyst</h3>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              Ask me to analyze economic data across 50 US metros. I can search 543 series, compare cities, overlay indicators, and spot trends.
            </p>
            <div className="mt-4 space-y-1.5">
              {[
                "Compare Austin vs Denver housing over the last 2 years",
                "Show me the S&P 500 vs consumer sentiment",
                "Which metros have the worst affordability?",
                "Overlay NYC unemployment with search anxiety",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                  className="block w-full text-left px-3 py-2 text-xs text-muted-foreground bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-indigo-500" />
              </div>
            )}
            <div className={`max-w-[85%] ${
              msg.role === "user"
                ? "bg-indigo-500 text-white rounded-2xl rounded-br-md px-3.5 py-2"
                : "bg-zinc-50 text-foreground rounded-2xl rounded-bl-md px-3.5 py-2"
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5 text-zinc-600" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Bot className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <div className="bg-zinc-50 rounded-2xl rounded-bl-md px-3.5 py-2.5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analyzing data...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-200 p-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask about economic data..."
            rows={1}
            className="flex-1 resize-none px-3 py-2 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="px-3 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
