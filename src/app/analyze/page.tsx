import { Header } from "@/components/dashboard/header";
import { AnalyzeClient } from "./analyze-client";

export default function AnalyzePage() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 pt-14 overflow-hidden">
        <AnalyzeClient />
      </div>
    </div>
  );
}
