import { z } from "zod";

import type {
  TournamentRegistrationEntry,
  TournamentRegistrationSummary,
} from "@/lib/tournaments/registration-types";
import type { TournamentSource } from "@/lib/tournaments/types";

const DEFAULT_FITP_API_URL =
  "https://dp-myfit-test-function-v2.azurewebsites.net/api/v3/puc/competizione/dettaglio";
const DEFAULT_TPRA_API_URL =
  "https://tpra-prod-frontend-function.azurewebsites.net/api/v1/tornei/iscritti/view";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_ATTEMPTS = 2;

const nonNegativeIntegerSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : value,
  z.number().int().nonnegative(),
);

const nullableNonNegativeIntegerSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === "") return null;
    return typeof value === "string" ? Number(value) : value;
  },
  z.number().int().nonnegative().nullable(),
);

const booleanSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    if (value.trim().toLowerCase() === "true" || value.trim() === "1") {
      return true;
    }
    if (value.trim().toLowerCase() === "false" || value.trim() === "0") {
      return false;
    }
  }
  if (value === 1) return true;
  if (value === 0) return false;
  return value;
}, z.boolean());

const fitpTournamentSchema = z
  .object({
    TournamentDescription: z.string().trim().min(1),
    IsDoubleTournament: booleanSchema,
    NumberOfParticipants: nonNegativeIntegerSchema,
    Participants: z.array(z.unknown()).nullable().optional(),
  })
  .passthrough();

const fitpResponseSchema = z
  .object({
    Tournaments: z.array(fitpTournamentSchema),
  })
  .passthrough();

const tpraResultSchema = z
  .object({
    numero_iscritti: nonNegativeIntegerSchema,
    numero_iscritti_massimi: nullableNonNegativeIntegerSchema.optional(),
    doppio: booleanSchema,
    riserve: z.array(z.unknown()).nullable().optional(),
  })
  .passthrough();

const tpraResponseSchema = z
  .object({
    results: z.array(tpraResultSchema).min(1),
  })
  .passthrough();

export type RegistrationFetchOptions = {
  fetchImplementation?: typeof fetch;
  fitpApiUrl?: string;
  tpraApiUrl?: string;
  timeoutMs?: number;
  maxAttempts?: number;
  now?: () => Date;
};

class RegistrationHttpError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "RegistrationHttpError";
  }
}

function pairsFromPlayers(players: number, isDouble: boolean) {
  return isDouble && players % 2 === 0 ? players / 2 : null;
}

function fitpEntries(input: unknown): TournamentRegistrationEntry[] {
  const response = fitpResponseSchema.parse(input);

  return response.Tournaments.map((tournament) => {
    const registeredPairs = tournament.IsDoubleTournament
      ? tournament.NumberOfParticipants
      : null;
    const registeredPlayers = tournament.IsDoubleTournament
      ? tournament.Participants?.length ?? tournament.NumberOfParticipants * 2
      : tournament.NumberOfParticipants;

    return {
      label: tournament.TournamentDescription,
      registeredPlayers,
      registeredPairs,
      capacityPlayers: null,
      capacityPairs: null,
      reservePlayers: 0,
      reservePairs: tournament.IsDoubleTournament ? 0 : null,
    };
  });
}

function tpraEntries(input: unknown): TournamentRegistrationEntry[] {
  const result = tpraResponseSchema.parse(input).results[0];
  const registeredPlayers = result.numero_iscritti;
  const capacityPlayers = result.numero_iscritti_massimi ?? null;
  const reserveEntries = result.riserve?.length ?? 0;

  return [
    {
      label: "Iscrizioni confermate",
      registeredPlayers,
      registeredPairs: pairsFromPlayers(registeredPlayers, result.doppio),
      capacityPlayers,
      capacityPairs:
        capacityPlayers === null
          ? null
          : pairsFromPlayers(capacityPlayers, result.doppio),
      reservePlayers: result.doppio ? reserveEntries * 2 : reserveEntries,
      reservePairs: result.doppio ? reserveEntries : null,
    },
  ];
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

async function wait(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function postJson(
  url: string,
  body: Record<string, string>,
  options: Required<
    Pick<RegistrationFetchOptions, "fetchImplementation" | "timeoutMs" | "maxAttempts">
  >,
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const response = await options.fetchImplementation(url, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new RegistrationHttpError(
          `La fonte iscrizioni ha risposto HTTP ${response.status}`,
          isRetryableStatus(response.status),
        );
      }

      const text = await response.text();
      if (text.trim() === "") {
        throw new Error("La fonte iscrizioni ha restituito un body vuoto");
      }

      return JSON.parse(text) as unknown;
    } catch (error) {
      lastError = error;
      const retryable =
        !(error instanceof RegistrationHttpError) || error.retryable;
      if (!retryable || attempt === options.maxAttempts) throw error;
      await wait(150 * 2 ** (attempt - 1));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

export async function fetchTournamentRegistrationSummary(
  source: TournamentSource,
  sourceId: string,
  options: RegistrationFetchOptions = {},
): Promise<TournamentRegistrationSummary> {
  const requestOptions = {
    fetchImplementation: options.fetchImplementation ?? fetch,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxAttempts: options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
  };

  if (requestOptions.timeoutMs <= 0 || requestOptions.maxAttempts <= 0) {
    throw new Error("Configurazione fetch iscrizioni non valida");
  }

  const response =
    source === "fitp"
      ? await postJson(
          options.fitpApiUrl ??
            process.env.FITP_REGISTRATIONS_API_URL ??
            DEFAULT_FITP_API_URL,
          { competitionUid: sourceId },
          requestOptions,
        )
      : await postJson(
          options.tpraApiUrl ??
            process.env.TPRA_REGISTRATIONS_API_URL ??
            DEFAULT_TPRA_API_URL,
          { id: sourceId },
          requestOptions,
        );

  let entries: TournamentRegistrationEntry[];
  try {
    entries = source === "fitp" ? fitpEntries(response) : tpraEntries(response);
  } catch {
    throw new Error(`Risposta iscrizioni ${source.toUpperCase()} non valida`);
  }

  return {
    source,
    entries,
    fetchedAt: (options.now ?? (() => new Date()))().toISOString(),
  };
}
