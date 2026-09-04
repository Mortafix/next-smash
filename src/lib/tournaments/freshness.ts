export const defaultStaleAfterHours = 12;
export const tournamentSyncCooldownMinutes = 5;
export const tournamentSyncLeaseMinutes = 30;

export function resolveStaleAfterHours(value: string | undefined) {
  const hours = value === undefined ? defaultStaleAfterHours : Number(value);

  return Number.isFinite(hours) && hours > 0 ? hours : defaultStaleAfterHours;
}

export function oldestCompleteSync(
  dates: readonly (Date | null | undefined)[],
) {
  const completedDates = dates.filter(
    (date): date is Date => date instanceof Date,
  );

  if (completedDates.length !== dates.length || completedDates.length === 0) {
    return null;
  }

  return new Date(
    Math.min(...completedDates.map((date) => date.getTime())),
  );
}

export function isTournamentDataStale(
  lastSuccessfulSync: Date | null,
  now: Date,
  staleAfterHours: number,
) {
  if (!lastSuccessfulSync) return true;

  return (
    now.getTime() - lastSuccessfulSync.getTime() >
    staleAfterHours * 3_600_000
  );
}
