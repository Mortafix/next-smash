import { describe, expect, it } from "vitest";

import { toIsoDate } from "@/lib/dates";

describe("toIsoDate", () => {
  it("converte le date italiane e ISO", () => {
    expect(toIsoDate("03/09/2026")).toBe("2026-09-03");
    expect(toIsoDate("2026-09-03T12:00:00Z")).toBe("2026-09-03");
  });

  it("rifiuta giorni impossibili", () => {
    expect(toIsoDate("31/02/2026")).toBeNull();
    expect(toIsoDate("testo")).toBeNull();
  });
});

