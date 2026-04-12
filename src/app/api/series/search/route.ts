import { searchSeries } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const result = searchSeries({
    query: sp.get("q") || undefined,
    domain: sp.get("domain") || undefined,
    tagSlug: sp.get("tag") || undefined,
    scope: sp.get("scope") || undefined,
    metro: sp.get("metro") || undefined,
    state: sp.get("state") || undefined,
    limit: sp.has("limit") ? parseInt(sp.get("limit")!) : 50,
    offset: sp.has("offset") ? parseInt(sp.get("offset")!) : 0,
  });
  return Response.json(result);
}
