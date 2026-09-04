import { describe, expect, it } from "vitest";

import data from "@/data/municipalities.json";
import manifest from "@/data/municipalities.manifest.json";
import {
  resolveMunicipality,
  searchMunicipalities,
} from "@/lib/locations/municipalities";

describe("dataset comunale ISTAT", () => {
  it("ha copertura e codici univoci", () => {
    expect(data.municipalities).toHaveLength(7_894);
    expect(new Set(data.municipalities.map((item) => item.istatCode)).size).toBe(
      data.municipalities.length,
    );
    expect(manifest.records).toBe(data.municipalities.length);
  });

  it("contiene coordinate plausibili per tutti i comuni", () => {
    for (const municipality of data.municipalities) {
      expect(municipality.latitude).toBeGreaterThan(35);
      expect(municipality.latitude).toBeLessThan(48);
      expect(municipality.longitude).toBeGreaterThan(6);
      expect(municipality.longitude).toBeLessThan(19);
    }
  });

  it("trova nomi e alias provinciali usati da PUC", () => {
    expect(searchMunicipalities("Monza")[0]).toMatchObject({
      name: "Monza",
      provinceCode: "MB",
    });
    expect(resolveMunicipality("Olbia", "SS")).toMatchObject({
      name: "Olbia",
      regionName: "Sardegna",
    });
    expect(resolveMunicipality("Suelli", "SU")).toMatchObject({ name: "Suelli" });
  });
});
