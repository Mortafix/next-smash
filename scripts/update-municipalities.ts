import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import centerOfMass from "@turf/center-of-mass";
import pointOnFeature from "@turf/point-on-feature";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import ExcelJS from "exceljs";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

const municipalitiesUrl =
  "https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.xlsx";
const boundariesUrl =
  "https://www.istat.it/storage/cartografia/confini_amministrativi/generalizzati/2026/Limiti01012026_g.zip";

type BoundaryProperties = {
  PRO_COM_T?: string;
  PRO_COM?: number;
  COMUNE?: string;
};

type BoundaryFeature = Feature<Polygon | MultiPolygon, BoundaryProperties>;

type MunicipalityInput = {
  istatCode: string;
  name: string;
  aliases: string[];
  provinceCode: string;
  provinceName: string;
  regionCode: string;
  regionName: string;
};

type Download = {
  data: ArrayBuffer;
  lastModified: string | null;
  etag: string | null;
  sha256: string;
};

const geometryOverrides: Readonly<Record<string, readonly string[]>> = {
  // Lirio è confluito in Montalto Pavese il 1° gennaio 2026.
  "018094": ["018094", "018082"],
  // Castegnero e Nanto sono confluiti nel nuovo comune Castegnero Nanto.
  "024129": ["024027", "024071"],
};

const municipalityAliases: Readonly<Record<string, readonly string[]>> = {
  "035033": ["Reggio Emilia"],
};

async function download(url: string): Promise<Download> {
  const response = await fetch(url, {
    headers: { "user-agent": "NextSmash municipality data builder" },
  });
  if (!response.ok) {
    throw new Error(`Download ISTAT fallito (${response.status}): ${url}`);
  }

  const data = await response.arrayBuffer();
  return {
    data,
    lastModified: response.headers.get("last-modified"),
    etag: response.headers.get("etag"),
    sha256: createHash("sha256").update(Buffer.from(data)).digest("hex"),
  };
}

function cellText(row: ExcelJS.Row, column: number) {
  const value = row.getCell(column).value;
  if (value === null || value === undefined) return "";
  return String(value).trim().replace(/\s+/g, " ");
}

async function parseMunicipalities(data: ArrayBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("Il file ISTAT non contiene fogli di lavoro");

  const municipalities: MunicipalityInput[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const istatCode = cellText(row, 5).padStart(6, "0");
    const combinedName = cellText(row, 6);
    const italianName = cellText(row, 7);
    const foreignName = cellText(row, 8);
    const name = italianName || combinedName;
    const aliases = new Set(
      [combinedName, italianName, foreignName, ...(municipalityAliases[istatCode] ?? [])].filter(
        Boolean,
      ),
    );

    if (!/^\d{6}$/.test(istatCode) || !name) {
      throw new Error(`Riga anagrafica ISTAT non valida: ${rowNumber}`);
    }

    municipalities.push({
      istatCode,
      name,
      aliases: [...aliases].filter((alias) => alias !== name).sort((left, right) =>
        left.localeCompare(right, "it"),
      ),
      provinceCode: cellText(row, 15).toUpperCase(),
      provinceName: cellText(row, 12),
      regionCode: cellText(row, 1).padStart(2, "0"),
      regionName: cellText(row, 11),
    });
  });

  return municipalities.sort((left, right) =>
    left.istatCode.localeCompare(right.istatCode),
  );
}

function asMultiPolygon(features: readonly BoundaryFeature[]): BoundaryFeature {
  const coordinates = features.flatMap((feature) =>
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates,
  );

  return {
    type: "Feature",
    properties: {},
    geometry: { type: "MultiPolygon", coordinates },
  };
}

async function parseBoundaryFeatures(data: ArrayBuffer) {
  Object.defineProperty(globalThis, "self", {
    value: globalThis,
    configurable: true,
  });
  const { default: parseShapefile } = await import("shpjs");
  const parsed = (await parseShapefile(data)) as unknown as
    | (FeatureCollection & { fileName?: string })
    | Array<FeatureCollection & { fileName?: string }>;
  const layers = Array.isArray(parsed) ? parsed : [parsed];
  const municipalityLayer = layers.find((layer) =>
    layer.fileName?.includes("Com01012026_g_WGS84"),
  );
  if (!municipalityLayer) {
    throw new Error("Layer comunale non trovato nell’archivio dei confini ISTAT");
  }

  const boundaries = new Map<string, BoundaryFeature>();
  for (const feature of municipalityLayer.features) {
    if (feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon") {
      continue;
    }
    const properties = feature.properties as BoundaryProperties | null;
    const code =
      properties?.PRO_COM_T ??
      (properties?.PRO_COM ? String(properties.PRO_COM).padStart(6, "0") : null);
    if (code) boundaries.set(code, feature as BoundaryFeature);
  }

  return boundaries;
}

function representativePoint(boundary: BoundaryFeature) {
  const centroid = centerOfMass(boundary);
  const point = booleanPointInPolygon(centroid, boundary)
    ? centroid
    : pointOnFeature(boundary);
  const [longitude, latitude] = point.geometry.coordinates;

  return {
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
  };
}

function latestStableTimestamp(downloads: readonly Download[]) {
  const timestamps = downloads
    .map((item) => item.lastModified)
    .filter((value): value is string => value !== null)
    .map((value) => Date.parse(value))
    .filter(Number.isFinite);

  return new Date(
    timestamps.length > 0 ? Math.max(...timestamps) : Date.UTC(2026, 1, 21),
  ).toISOString();
}

async function main() {
  const [municipalityDownload, boundaryDownload] = await Promise.all([
    download(municipalitiesUrl),
    download(boundariesUrl),
  ]);
  const [municipalities, boundaries] = await Promise.all([
    parseMunicipalities(municipalityDownload.data),
    parseBoundaryFeatures(boundaryDownload.data),
  ]);

  const records = municipalities.map((municipality) => {
    const sourceCodes = geometryOverrides[municipality.istatCode] ?? [municipality.istatCode];
    const sourceFeatures = sourceCodes.map((code) => boundaries.get(code));
    if (sourceFeatures.some((feature) => feature === undefined)) {
      throw new Error(
        `Confine mancante per ${municipality.istatCode} ${municipality.name} (${sourceCodes.join(", ")})`,
      );
    }

    const boundary =
      sourceFeatures.length === 1
        ? sourceFeatures[0]!
        : asMultiPolygon(sourceFeatures as BoundaryFeature[]);

    return { ...municipality, ...representativePoint(boundary) };
  });

  if (records.length !== municipalities.length) {
    throw new Error("Copertura comunale incompleta");
  }

  const keys = new Set<string>();
  for (const record of records) {
    const key = `${record.provinceCode}:${record.name.toLocaleLowerCase("it")}`;
    if (keys.has(key)) throw new Error(`Comune duplicato nella provincia: ${key}`);
    keys.add(key);
  }

  const generatedAt = latestStableTimestamp([
    municipalityDownload,
    boundaryDownload,
  ]);
  const output = {
    source:
      "ISTAT — Elenco comuni italiani e confini amministrativi generalizzati 2026 (CC BY 4.0)",
    generatedAt,
    municipalities: records,
  };
  const manifest = {
    generatedAt,
    license: "CC BY 4.0",
    attribution: "Dati geografici e amministrativi © ISTAT.",
    records: records.length,
    sources: [
      {
        url: municipalitiesUrl,
        lastModified: municipalityDownload.lastModified,
        etag: municipalityDownload.etag,
        sha256: municipalityDownload.sha256,
      },
      {
        url: boundariesUrl,
        lastModified: boundaryDownload.lastModified,
        etag: boundaryDownload.etag,
        sha256: boundaryDownload.sha256,
      },
    ],
    geometryOverrides,
  };

  await Promise.all([
    writeFile(
      resolve(process.cwd(), "src/data/municipalities.json"),
      `${JSON.stringify(output)}\n`,
      "utf8",
    ),
    writeFile(
      resolve(process.cwd(), "src/data/municipalities.manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    ),
  ]);

  console.log(`Generati ${records.length} comuni con coordinate rappresentative.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Errore sconosciuto");
  process.exitCode = 1;
});
