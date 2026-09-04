"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const countedPaths = ["/tornei", "/calendario", "/preferenze"] as const;
const countedThisRuntime = new Set<string>();
const inFlightThisRuntime = new Map<string, symbol>();
const visitNumberFormat = new Intl.NumberFormat("it-IT");

function releaseReservation(sessionKey: string, reservation: symbol) {
  if (inFlightThisRuntime.get(sessionKey) === reservation) {
    inFlightThisRuntime.delete(sessionKey);
  }
}

export function VisitCounter() {
  const pathname = usePathname();
  const [result, setResult] = useState<{ pathname: string; count: number | null }>({
    pathname,
    count: null,
  });
  const count = result.pathname === pathname ? result.count : null;

  useEffect(() => {
    const path = countedPaths.find(
      (candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`),
    );
    const sessionKey = path ? `nextsmash:view:${path}` : null;
    const controller = new AbortController();
    let alreadyCounted = true;
    let reservation: symbol | null = null;

    if (sessionKey) {
      try {
        alreadyCounted =
          countedThisRuntime.has(sessionKey) ||
          window.sessionStorage.getItem(sessionKey) === "1";
      } catch {
        alreadyCounted = countedThisRuntime.has(sessionKey);
      }

      if (alreadyCounted) {
        countedThisRuntime.add(sessionKey);
      } else if (!inFlightThisRuntime.has(sessionKey)) {
        reservation = Symbol(sessionKey);
        inFlightThisRuntime.set(sessionKey, reservation);
      }
    }

    const request =
      path && sessionKey && reservation
        ? fetch("/api/pageviews", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ path }),
            signal: controller.signal,
          })
        : fetch("/api/pageviews", { signal: controller.signal });

    void request
      .then(async (response) => {
        if (!response.ok || controller.signal.aborted) return;

        if (sessionKey && reservation) {
          countedThisRuntime.add(sessionKey);
          try {
            window.sessionStorage.setItem(sessionKey, "1");
          } catch {
            // The runtime marker still prevents duplicate counts while this page is open.
          }
        }

        const payload = (await response.json()) as { count: number | null };
        if (!controller.signal.aborted) {
          setResult({ pathname, count: payload.count });
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (sessionKey && reservation) {
          releaseReservation(sessionKey, reservation);
        }
      });

    return () => {
      controller.abort();
      if (sessionKey && reservation) {
        releaseReservation(sessionKey, reservation);
      }
    };
  }, [pathname]);

  return count === null ? null : (
    <span>
      {visitNumberFormat.format(count)} {count === 1 ? "visita" : "visite"}
    </span>
  );
}
