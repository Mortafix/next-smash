import { NextResponse } from "next/server";

import { searchMunicipalities } from "@/lib/locations/municipalities";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ municipalities: [] });
  }
  if (query.length > 80) {
    return NextResponse.json(
      { error: "Ricerca troppo lunga" },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { municipalities: searchMunicipalities(query) },
    { headers: { "cache-control": "no-store" } },
  );
}

