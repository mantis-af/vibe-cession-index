import { getSeriesData } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sp = req.nextUrl.searchParams;

  const data = getSeriesData(
    id,
    sp.get("from") || undefined,
    sp.get("to") || undefined,
  );

  if (!data) {
    return Response.json({ error: "Series not found" }, { status: 404 });
  }

  return Response.json(data);
}
