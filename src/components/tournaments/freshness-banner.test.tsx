import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FreshnessBanner } from "@/components/tournaments/freshness-banner";

const { routerRefresh } = vi.hoisted(() => ({ routerRefresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}));

afterEach(() => {
  cleanup();
  routerRefresh.mockClear();
  vi.unstubAllGlobals();
});

describe("FreshnessBanner", () => {
  it("mostra sempre l'ultimo aggiornamento disponibile senza un box di avviso", () => {
    const lastSuccessfulSync = "2026-09-04T08:00:00.000Z";

    render(
      <FreshnessBanner
        lastSuccessfulSync={lastSuccessfulSync}
        setupRequired={false}
        stale={false}
      />,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    const freshness = screen.getByText(/Ultimo aggiornamento:/).closest("p");
    expect(freshness).toHaveClass("ns-freshness");
    expect(freshness?.querySelector("time")).toHaveAttribute(
      "dateTime",
      lastSuccessfulSync,
    );
  });

  it("avvia il refresh dei dati vecchi e annuncia il completamento", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "running", runId: 7 }), {
          status: 202,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            runId: 7,
            status: "success",
            startedAt: "2026-09-04T08:00:00.000Z",
            completedAt: "2026-09-04T08:01:00.000Z",
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <FreshnessBanner
        lastSuccessfulSync="2026-09-03T08:00:00.000Z"
        setupRequired={false}
        stale
      />,
    );

    expect(
      screen.getByText("Aggiornamento tornei in corso"),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");

    await waitFor(() => expect(routerRefresh).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Tornei aggiornati")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/tournaments/refresh",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/tournaments/refresh?runId=7",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("mantiene visibile l'ultimo snapshot se il refresh fallisce", async () => {
    const retryAt = new Date(Date.now() + 60_000).toISOString();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "cooldown", retryAt }), {
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal(
      "fetch",
      fetchMock,
    );

    render(
      <FreshnessBanner
        lastSuccessfulSync="2026-09-03T08:00:00.000Z"
        setupRequired={false}
        stale
      />,
    );

    expect(
      await screen.findByText("Aggiornamento non riuscito"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Continui a vedere l’ultimo elenco valido/)).toBeInTheDocument();
    expect(screen.getByText(/Potrai riprovare alle/)).toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: "Riprova" });
    expect(retryButton).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(retryButton);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(routerRefresh).not.toHaveBeenCalled();
  });

  it("mostra subito i dati validi di un aggiornamento parziale", async () => {
    const retryAt = new Date(Date.now() + 60_000).toISOString();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "running", runId: 8 }), {
          status: 202,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            runId: 8,
            status: "failed",
            startedAt: "2026-09-04T08:00:00.000Z",
            completedAt: "2026-09-04T08:01:00.000Z",
            retryAt,
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <FreshnessBanner
        lastSuccessfulSync="2026-09-03T08:00:00.000Z"
        setupRequired={false}
        stale
      />,
    );

    expect(
      await screen.findByText("Aggiornamento non riuscito"),
    ).toBeInTheDocument();
    expect(routerRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Riprova" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("non tenta il refresh se il servizio dati non è inizializzato", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <FreshnessBanner
        lastSuccessfulSync={null}
        setupRequired
        stale
      />,
    );

    expect(
      screen.getByText("Tornei momentaneamente non disponibili"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
