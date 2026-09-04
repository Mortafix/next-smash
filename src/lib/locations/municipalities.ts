import municipalityData from "@/data/municipalities.json";

type Municipality = {
  istatCode: string;
  name: string;
  aliases: string[];
  provinceCode: string;
  provinceName: string;
  regionCode: string;
  regionName: string;
  latitude: number;
  longitude: number;
};

export type MunicipalityMatch = Pick<
  Municipality,
  | "istatCode"
  | "name"
  | "provinceCode"
  | "provinceName"
  | "regionName"
  | "latitude"
  | "longitude"
>;

const municipalities = municipalityData.municipalities as Municipality[];

export function normalizePlaceName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const municipalityIndex = new Map<string, Municipality>();
const municipalitySearchIndex = municipalities.map((municipality) => ({
  municipality,
  normalizedNames: [municipality.name, ...municipality.aliases].map(
    normalizePlaceName,
  ),
}));

for (const municipality of municipalities) {
  const aliases = new Set([municipality.name, ...municipality.aliases]);
  for (const alias of aliases) {
    municipalityIndex.set(
      `${municipality.provinceCode.toUpperCase()}:${normalizePlaceName(alias)}`,
      municipality,
    );
  }
}

// PUC conserva talvolta la sigla precedente ai riassetti provinciali sardi.
const pucProvinceAliases: Readonly<Record<string, readonly string[]>> = {
  "113017": ["SS"], // Olbia: Sassari → Gallura Nord-Est Sardegna (OT)
  "118061": ["SU"], // Suelli: Sud Sardegna → Cagliari (CA)
};

for (const municipality of municipalities) {
  for (const provinceAlias of pucProvinceAliases[municipality.istatCode] ?? []) {
    for (const alias of new Set([municipality.name, ...municipality.aliases])) {
      municipalityIndex.set(
        `${provinceAlias}:${normalizePlaceName(alias)}`,
        municipality,
      );
    }
  }
}

export function resolveMunicipality(
  city: string | null,
  provinceCode: string | null,
): MunicipalityMatch | null {
  if (!city || !provinceCode) return null;

  return (
    municipalityIndex.get(
      `${provinceCode.toUpperCase()}:${normalizePlaceName(city)}`,
    ) ?? null
  );
}

export function searchMunicipalities(query: string, limit = 12) {
  const normalizedQuery = normalizePlaceName(query);
  if (normalizedQuery.length < 2) return [];

  return municipalitySearchIndex
    .filter(({ normalizedNames }) =>
      normalizedNames.some((name) => name.includes(normalizedQuery)),
    )
    .sort((left, right) => {
      const leftStarts = left.normalizedNames.some((name) =>
        name.startsWith(normalizedQuery),
      );
      const rightStarts = right.normalizedNames.some((name) =>
        name.startsWith(normalizedQuery),
      );
      if (leftStarts !== rightStarts) return leftStarts ? -1 : 1;
      return left.municipality.name.localeCompare(right.municipality.name, "it");
    })
    .slice(0, limit)
    .map(
      ({ municipality }) => {
        const {
          istatCode,
          name,
          provinceCode,
          provinceName,
          regionName,
          latitude,
          longitude,
        } = municipality;
        return {
        istatCode,
        name,
        provinceCode,
        provinceName,
        regionName,
        latitude,
        longitude,
        };
      },
    );
}
