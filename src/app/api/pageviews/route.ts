import { sum, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { pageViews } from "@/db/schema";

const pageViewSchema = z.object({
  path: z.enum(["/tornei", "/calendario", "/preferenze"]),
});

function currentDay() {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Europe/Rome",
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function totalViews() {
  const result = getDatabase()
    .select({ value: sum(pageViews.count) })
    .from(pageViews)
    .get();
  return Number(result?.value ?? 0);
}

export async function GET() {
  try {
    return NextResponse.json(
      { count: totalViews() },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ count: null }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const parsed = pageViewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  try {
    getDatabase()
      .insert(pageViews)
      .values({ day: currentDay(), path: parsed.data.path, count: 1 })
      .onConflictDoUpdate({
        target: [pageViews.day, pageViews.path],
        set: { count: sql`${pageViews.count} + 1` },
      })
      .run();

    return NextResponse.json(
      { count: totalViews() },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ count: null }, { status: 503 });
  }
}

