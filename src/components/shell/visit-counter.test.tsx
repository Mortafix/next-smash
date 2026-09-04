import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VisitCounter } from "@/components/shell/visit-counter";

const navigation = vi.hoisted(() => ({ pathname: "/tornei" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

const fetchMock = vi.fn<typeof fetch>();

function response(ok: boolean, count: number | null = null) {
  return {
    ok,
    json: vi.fn().mockResolvedValue({ count }),
  } as unknown as Response;
}

function abortableRequest() {
  return (_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => reject(new DOMException("Request aborted", "AbortError")),
        { once: true },
      );
    });
}

beforeEach(() => {
  window.sessionStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("VisitCounter", () => {
  it("segna la sessione solo dopo il POST riuscito e usa il singolare", async () => {
    navigation.pathname = "/tornei";
    fetchMock.mockResolvedValueOnce(response(true, 1));

    const view = render(<VisitCounter />);

    expect(await screen.findByText("1 visita")).toBeVisible();
    expect(window.sessionStorage.getItem("nextsmash:view:/tornei")).toBe("1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pageviews",
      expect.objectContaining({ method: "POST", signal: expect.any(AbortSignal) }),
    );

    fetchMock.mockImplementationOnce(abortableRequest());
    navigation.pathname = "/pagina-inesistente";
    view.rerender(<VisitCounter />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("1 visita")).not.toBeInTheDocument();
  });

  it("rilascia la prenotazione dopo un errore e permette un nuovo tentativo", async () => {
    navigation.pathname = "/calendario";
    let resolveFailure!: (value: Response) => void;
    const failedRequest = new Promise<Response>((resolve) => {
      resolveFailure = resolve;
    });
    fetchMock.mockReturnValueOnce(failedRequest);

    const firstRender = render(<VisitCounter />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => {
      resolveFailure(response(false));
      await failedRequest;
    });
    firstRender.unmount();

    expect(window.sessionStorage.getItem("nextsmash:view:/calendario")).toBeNull();

    fetchMock.mockResolvedValueOnce(response(true, 2));
    render(<VisitCounter />);

    expect(await screen.findByText("2 visite")).toBeVisible();
    expect(window.sessionStorage.getItem("nextsmash:view:/calendario")).toBe("1");
    expect(
      fetchMock.mock.calls.map(([, init]) => init?.method ?? "GET"),
    ).toEqual(["POST", "POST"]);
  });

  it("evita POST concorrenti e può riprovare dopo l’abort", async () => {
    navigation.pathname = "/preferenze";
    fetchMock.mockImplementation(abortableRequest());

    const firstRender = render(<VisitCounter />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const secondRender = render(<VisitCounter />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(
      fetchMock.mock.calls.map(([, init]) => init?.method ?? "GET"),
    ).toEqual(["POST", "GET"]);

    firstRender.unmount();
    secondRender.unmount();
    expect(window.sessionStorage.getItem("nextsmash:view:/preferenze")).toBeNull();

    fetchMock.mockResolvedValueOnce(response(true, 3));
    render(<VisitCounter />);

    expect(await screen.findByText("3 visite")).toBeVisible();
    expect(fetchMock.mock.calls.at(-1)?.[1]?.method).toBe("POST");
    expect(window.sessionStorage.getItem("nextsmash:view:/preferenze")).toBe("1");
  });
});
