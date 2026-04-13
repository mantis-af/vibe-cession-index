import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include SQLite database in Vercel deployment
  outputFileTracingIncludes: {
    "/**": ["./data/**"],
  },
  // better-sqlite3 is a native module
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
