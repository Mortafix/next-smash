import { createHash } from "node:crypto";

import { z } from "zod";

import { toIsoDate, toItalianDate } from "@/lib/dates";
import { pucProvinceIdsByRegion } from "@/lib/tournaments/puc-territories";
import type {
  TournamentGender,
  TournamentSource,
} from "@/lib/tournaments/types";

const DEFAULT_API_URL =
  "https://dp-myfit-test-function-v2.azurewebsites.net/api/v3/tornei/puc/list";
const MAX_RESULTS_PER_REQUEST = 100;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;

const sourceConfiguration = {
  fitp: { code: 1, competitionType: "1" },
  tpra: { code: 2, competitionType: "2" },
} as const satisfies Record<
  TournamentSource,
  { code: number; competitionType: string }
>;

const pucRowSchema = z
  .object({
    cod_fonte: z.union([z.number(), z.string()]),
    guid: z.unknown().optional(),
    id_torneo_digital: z.unknown().optional(),
    data_inizio: z.string(),
    data_fine: z.string(),
    nome_torneo: z.string(),
    citta: z.unknown().optional(),
    provincia: z.unknown().optional(),
    sigla_provincia: z.unknown().optional(),
    tennisclub: z.unknown().optional(),
    iscrizione_online: z.unknown().optional(),
    id_statoPUC: z.unknown().optional(),
    cat_class: z.unknown().optional(),
    cat_eta: z.unknown().optional(),
    tipo_torneo: z.unknown().optional(),
    id_settore: z.unknown().optional(),
  })
  .passthrough();

const pucEnvelopeSchema = z
  .object({
    competizioni: z.array(z.unknown()),
    record: z.coerce.number().int().nonnegative(),
  })
  .passthrough();

export type NormalizedPucTournament = {
  id: string;
  source: TournamentSource;
  sourceId: string;
  title: string;
  startDate: string;
  endDate: string;
  venueName: string | null;
  city: string | null;
  province: string | null;
  provinceCode: string | null;
  genders: TournamentGender[];
  competitionTypes: string[];
  rankCategories: string[];
  ageCategories: string[];
  tpraLevel: "entry" | "expert" | null;
  registrationOnline: boolean;
  officialUrl: string;
  sourceStatus: string | null;
  rawJson: string;
  checksum: string;
};

export type PucFetchResult = {
  source: TournamentSource;
  declaredTotal: number;
  tournaments: NormalizedPucTournament[];
};

type FetchOptions = {
  apiUrl?: string;
  fetchImplementation?: typeof fetch;
  startDate?: Date;
  endDate?: Date;
};

class PucHttpError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "PucHttpError";
  }
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const text = String(value).trim().replace(/\s+/g, " ");
  return text.length > 0 ? text : null;
}

function numericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function booleanValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    return ["1", "true", "sì", "si"].includes(value.trim().toLowerCase());
  }
  return false;
}

function splitValues(value: unknown) {
  return (
    cleanText(value)
      ?.split(";")
      .map((item) => item.trim().replace(/\s+/g, " "))
      .filter(Boolean) ?? []
  );
}

function inferGenders(competitionTypes: string[]): TournamentGender[] {
  const genders = new Set<TournamentGender>();

  for (const competitionType of competitionTypes) {
    if (/\bdoppio\s+m\./i.test(competitionType)) genders.add("male");
    if (/\bdoppio\s+f\./i.test(competitionType)) genders.add("female");
    if (/\bmisto\b/i.test(competitionType)) genders.add("mixed");
  }

  return genders.size > 0 ? [...genders] : ["unknown"];
}

function inferTpraLevel(title: string): "entry" | "expert" | null {
  const match = /\b(entry|expert)\b/i.exec(title);
  return match ? (match[1].toLowerCase() as "entry" | "expert") : null;
}

const sourceStatusLabels: Record<number, string> = {
  1: "concluso",
  2: "in corso",
  3: "iscrizioni aperte",
  4: "in programma",
};

export function normalizePucRow(
  input: unknown,
  expectedSource: TournamentSource,
): NormalizedPucTournament {
  const row = pucRowSchema.parse(input);
  const configuration = sourceConfiguration[expectedSource];

  if (numericValue(row.cod_fonte) !== configuration.code) {
    throw new Error(`Fonte PUC inattesa per ${expectedSource}`);
  }

  const startDate = toIsoDate(row.data_inizio);
  const endDate = toIsoDate(row.data_fine);
  if (!startDate || !endDate || endDate < startDate) {
    throw new Error("Intervallo date PUC non valido");
  }

  const title = cleanText(row.nome_torneo);
  if (!title) throw new Error("Nome torneo PUC mancante");

  const guid = cleanText(row.guid)?.toLowerCase() ?? null;
  const digitalId = numericValue(row.id_torneo_digital);
  const sourceId =
    expectedSource === "fitp" ? guid : digitalId ? String(digitalId) : null;
  if (!sourceId) throw new Error(`Identificativo ${expectedSource} mancante`);

  const competitionTypes = splitValues(row.tipo_torneo);
  const statusCode = numericValue(row.id_statoPUC);
  const officialUrl =
    expectedSource === "fitp"
      ? `https://www.fitp.it/Tornei/Dettaglio-Competizione?competitionId=${encodeURIComponent(sourceId)}`
      : `https://tpra.fitp.it/tornei/dettaglio-torneo/${encodeURIComponent(sourceId)}?disciplina=padel&settore=${numericValue(row.id_settore) ?? 2}`;

  const normalized = {
    id: `${expectedSource}:${sourceId}`,
    source: expectedSource,
    sourceId,
    title,
    startDate,
    endDate,
    venueName: cleanText(row.tennisclub),
    city: cleanText(row.citta),
    province: cleanText(row.provincia),
    provinceCode: cleanText(row.sigla_provincia)?.toUpperCase() ?? null,
    genders: inferGenders(competitionTypes),
    competitionTypes,
    rankCategories:
      expectedSource === "fitp"
        ? splitValues(row.cat_class).filter((value) => /^[1-5]$/.test(value))
        : [],
    ageCategories: splitValues(row.cat_eta),
    tpraLevel: expectedSource === "tpra" ? inferTpraLevel(title) : null,
    registrationOnline: booleanValue(row.iscrizione_online),
    officialUrl,
    sourceStatus: statusCode
      ? (sourceStatusLabels[statusCode] ?? String(statusCode))
      : null,
    rawJson: JSON.stringify(input),
  };

  return {
    ...normalized,
    checksum: createHash("sha256")
      .update(JSON.stringify(normalized))
      .digest("hex"),
  };
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function buildPayload(
  source: TournamentSource,
  startDate: Date,
  regionId: number | null,
  provinceId: number | null,
) {
  return {
    guid: "",
    profilazione: "",
    freetext: null,
    id_regione: regionId,
    id_provincia: provinceId,
    id_stato: null,
    id_disciplina: 172,
    sesso: null,
    data_inizio: toItalianDate(startDate),
    data_fine: null,
    tipo_competizione: sourceConfiguration[source].competitionType,
    categoria_eta: null,
    id_classifica: null,
    classifica: null,
    massimale_montepremi: null,
    id_area_regionale: null,
    ambito: null,
    rowstoskip: 0,
    fetchrows: MAX_RESULTS_PER_REQUEST,
    sortcolumn: "data_inizio",
    sortorder: "asc",
  };
}

async function wait(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function requestPage(
  source: TournamentSource,
  options: Required<FetchOptions>,
  startDate: Date,
  regionId: number | null = null,
  provinceId: number | null = null,
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await options.fetchImplementation(options.apiUrl, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(
          buildPayload(source, startDate, regionId, provinceId),
        ),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new PucHttpError(
          `PUC ha risposto HTTP ${response.status}`,
          response.status === 408 ||
            response.status === 429 ||
            response.status >= 500,
        );
      }

      const text = await response.text();
      if (text.trim() === "") {
        if (attempt === MAX_ATTEMPTS) return null;
        await wait(250 * 2 ** (attempt - 1));
        continue;
      }
      return pucEnvelopeSchema.parse(JSON.parse(text));
    } catch (error) {
      lastError = error;
      const retryable =
        !(error instanceof PucHttpError) || error.retryable === true;
      if (!retryable || attempt === MAX_ATTEMPTS) throw error;
      await wait(250 * 2 ** (attempt - 1));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

type PucShard = {
  declaredTotal: number;
  rows: unknown[];
};

function assertCompletePage(
  page: z.infer<typeof pucEnvelopeSchema>,
  label: string,
): PucShard {
  if (page.record > MAX_RESULTS_PER_REQUEST) {
    throw new Error(
      `Lo shard PUC ${label} supera ancora ${MAX_RESULTS_PER_REQUEST} risultati`,
    );
  }

  if (page.competizioni.length !== page.record) {
    throw new Error(
      `Snapshot PUC incompleto per ${label}: dichiarati ${page.record}, ricevuti ${page.competizioni.length}`,
    );
  }

  return { declaredTotal: page.record, rows: page.competizioni };
}

async function fetchTerritorySnapshot(
  source: TournamentSource,
  options: Required<FetchOptions>,
  startDate: Date,
): Promise<PucShard> {
  const label = `dal ${toItalianDate(startDate)}`;
  const rootPage = await requestPage(source, options, startDate);
  if (rootPage === null) {
    throw new Error(`PUC ha restituito un body vuoto per ${source} ${label}`);
  }

  if (rootPage.record <= MAX_RESULTS_PER_REQUEST) {
    return assertCompletePage(rootPage, `${source} ${label}`);
  }

  const regionalShards: PucShard[] = [];
  for (let regionId = 1; regionId <= 20; regionId += 1) {
    const regionalPage = await requestPage(
      source,
      options,
      startDate,
      regionId,
    );

    if (regionalPage === null) {
      regionalShards.push({ declaredTotal: 0, rows: [] });
      continue;
    }

    if (regionalPage.record <= MAX_RESULTS_PER_REQUEST) {
      regionalShards.push(
        assertCompletePage(regionalPage, `${source}, regione ${regionId}`),
      );
      continue;
    }

    const provinceShards: PucShard[] = [];
    for (const provinceId of pucProvinceIdsByRegion[regionId] ?? []) {
      const provincePage = await requestPage(
        source,
        options,
        startDate,
        regionId,
        provinceId,
      );

      if (provincePage === null) {
        provinceShards.push({ declaredTotal: 0, rows: [] });
        continue;
      }

      provinceShards.push(
        assertCompletePage(
          provincePage,
          `${source}, regione ${regionId}, provincia ${provinceId}`,
        ),
      );
    }

    const provinceTotal = provinceShards.reduce(
      (total, shard) => total + shard.declaredTotal,
      0,
    );
    if (provinceTotal !== regionalPage.record) {
      throw new Error(
        `Shard provinciali PUC incompleti per regione ${regionId}: dichiarati ${regionalPage.record}, ricostruiti ${provinceTotal}`,
      );
    }

    regionalShards.push({
      declaredTotal: regionalPage.record,
      rows: provinceShards.flatMap((shard) => shard.rows),
    });
  }

  const regionalTotal = regionalShards.reduce(
    (total, shard) => total + shard.declaredTotal,
    0,
  );

  if (regionalTotal !== rootPage.record) {
    throw new Error(
      `Shard regionali PUC incompleti per ${source}: dichiarati ${rootPage.record}, ricostruiti ${regionalTotal}`,
    );
  }

  return {
    declaredTotal: rootPage.record,
    rows: regionalShards.flatMap((shard) => shard.rows),
  };
}

export async function fetchPucTournaments(
  source: TournamentSource,
  options: FetchOptions = {},
): Promise<PucFetchResult> {
  const today = options.startDate ?? new Date();
  const horizon =
    options.endDate ??
    addDays(today, Number(process.env.SYNC_HORIZON_DAYS ?? 400));
  const resolvedOptions: Required<FetchOptions> = {
    apiUrl: options.apiUrl ?? process.env.PUC_API_URL ?? DEFAULT_API_URL,
    fetchImplementation: options.fetchImplementation ?? fetch,
    startDate: addDays(today, -31),
    endDate: horizon,
  };
  const shard = await fetchTerritorySnapshot(
    source,
    resolvedOptions,
    resolvedOptions.startDate,
  );
  const { declaredTotal, rows } = shard;

  const tournaments = new Map<string, NormalizedPucTournament>();
  const rowErrors: string[] = [];

  for (const [index, row] of rows.entries()) {
    try {
      const tournament = normalizePucRow(row, source);
      tournaments.set(tournament.id, tournament);
    } catch (error) {
      rowErrors.push(
        `riga ${index + 1}: ${error instanceof Error ? error.message : "errore sconosciuto"}`,
      );
    }
  }

  if (rowErrors.length > 0) {
    throw new Error(
      `Scartate ${rowErrors.length}/${rows.length} righe ${source}: ${rowErrors
        .slice(0, 5)
        .join("; ")}`,
    );
  }

  const earliestEndDate = toIsoDate(toItalianDate(today));
  const latestStartDate = toIsoDate(toItalianDate(horizon));
  if (!earliestEndDate || !latestStartDate) {
    throw new Error("Intervallo locale di sincronizzazione non valido");
  }

  return {
    source,
    declaredTotal,
    tournaments: [...tournaments.values()].filter(
      (tournament) =>
        tournament.endDate >= earliestEndDate &&
        tournament.startDate <= latestStartDate,
    ),
  };
}
