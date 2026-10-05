export const italianTournamentZones = [
  {
    value: "nord",
    label: "Nord",
    regions: [
      "Valle d’Aosta", "Piemonte", "Liguria", "Lombardia",
      "Trentino-Alto Adige", "Veneto", "Friuli-Venezia Giulia", "Emilia-Romagna",
    ],
  },
  {
    value: "centro",
    label: "Centro",
    regions: ["Toscana", "Umbria", "Marche", "Lazio"],
  },
  {
    value: "sud-isole",
    label: "Sud e isole",
    regions: [
      "Abruzzo", "Molise", "Campania", "Puglia",
      "Basilicata", "Calabria", "Sicilia", "Sardegna",
    ],
  },
] as const;

export type TournamentZone = (typeof italianTournamentZones)[number]["value"];

export const italianRegions = italianTournamentZones.flatMap((zone) => [...zone.regions])
  .sort((left, right) => left.localeCompare(right, "it"));

// Codici ISTAT delle regioni, condivisi dai dati comunali e dai filtri territoriali.
export const italianRegionsByIstatCode: Readonly<Record<string, string>> = {
  "01": "Piemonte", "02": "Valle d’Aosta", "03": "Lombardia",
  "04": "Trentino-Alto Adige", "05": "Veneto", "06": "Friuli-Venezia Giulia",
  "07": "Liguria", "08": "Emilia-Romagna", "09": "Toscana", "10": "Umbria",
  "11": "Marche", "12": "Lazio", "13": "Abruzzo", "14": "Molise",
  "15": "Campania", "16": "Puglia", "17": "Basilicata", "18": "Calabria",
  "19": "Sicilia", "20": "Sardegna",
};

function regionSearchKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it").replace(/[^a-z0-9]+/g, "");
}

const regionNames = new Map<string, string>(
  italianRegions.map((region) => [regionSearchKey(region), region]),
);
regionNames.set("valledaostavalleedaoste", "Valle d’Aosta");
regionNames.set("valleedaoste", "Valle d’Aosta");
regionNames.set("trentinoaltoadigesudtirol", "Trentino-Alto Adige");

export function normalizeItalianRegion(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return regionNames.get(regionSearchKey(value)) ?? null;
}

export function normalizeItalianRegions(values: readonly unknown[]): string[] {
  return [...new Set(values.map(normalizeItalianRegion).filter((region) => region !== null))]
    .sort((left, right) => left.localeCompare(right, "it"));
}

export function inferTournamentZone(regions: readonly string[]): TournamentZone | "" {
  const selected = normalizeItalianRegions(regions);
  return italianTournamentZones.find((zone) =>
    selected.length === zone.regions.length &&
    zone.regions.every((region) => selected.includes(region)),
  )?.value ?? "";
}

export function regionsForTournamentZone(zone: string): string[] {
  return [...(italianTournamentZones.find((option) => option.value === zone)?.regions ?? [])];
}
