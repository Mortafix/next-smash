import { describe, expect, it } from "vitest";

import {
  defaultStaleAfterHours,
  isTournamentDataStale,
  oldestCompleteSync,
  resolveStaleAfterHours,
} from "@/lib/tournaments/freshness";

describe("resolveStaleAfterHours", () => {
  it("accetta una soglia finita e positiva", () => {
    expect(resolveStaleAfterHours("12.5")).toBe(12.5);
  });

  it.each([undefined, "", "0", "-4", "NaN", "Infinity", "non-un-numero"])(
    "usa il fallback per %s",
    (value) => {
      expect(resolveStaleAfterHours(value)).toBe(defaultStaleAfterHours);
    },
  );
});

describe("freschezza dei tornei", () => {
  const now = new Date("2026-09-04T12:00:00.000Z");

  it("usa la sincronizzazione meno recente fra FITP e TPRA", () => {
    expect(
      oldestCompleteSync([
        new Date("2026-09-04T10:00:00.000Z"),
        new Date("2026-09-04T08:00:00.000Z"),
      ]),
    ).toEqual(new Date("2026-09-04T08:00:00.000Z"));
  });

  it("considera incompleto lo snapshot se manca una fonte", () => {
    expect(oldestCompleteSync([new Date(), null])).toBeNull();
  });

  it("scade solo dopo 12 ore complete", () => {
    expect(
      isTournamentDataStale(
        new Date("2026-09-04T00:00:00.000Z"),
        now,
        12,
      ),
    ).toBe(false);
    expect(
      isTournamentDataStale(
        new Date("2026-09-03T23:59:59.999Z"),
        now,
        12,
      ),
    ).toBe(true);
  });
});
