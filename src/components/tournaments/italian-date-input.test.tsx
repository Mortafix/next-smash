import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ItalianDateInput } from "@/components/tournaments/italian-date-input";

afterEach(cleanup);

describe("ItalianDateInput", () => {
  it("mostra e restituisce la data nel formato italiano", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ItalianDateInput label="Dal" value="2026-09-04" onChange={onChange} />,
    );
    const input = screen.getByLabelText("Dal");

    expect(input).toHaveValue("04/09/2026");
    expect(input).toHaveAttribute("placeholder", "gg/mm/aaaa");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "05092026" } });
    expect(input).toHaveValue("05/09/2026");
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("2026-09-05");

    rerender(
      <ItalianDateInput label="Dal" value="2026-09-05" onChange={onChange} />,
    );
    expect(input).toHaveValue("05/09/2026");
  });

  it("mantiene visibile una data non valida e spiega come correggerla", () => {
    const onChange = vi.fn();
    render(<ItalianDateInput label="Al" value="" onChange={onChange} />);
    const input = screen.getByLabelText("Al");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "31022026" } });
    fireEvent.blur(input);

    expect(input).toHaveValue("31/02/2026");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Inserisci una data valida nel formato GG/MM/AAAA.",
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("mantiene disponibile il selettore calendario nativo", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ItalianDateInput label="Dal" value="" onChange={onChange} />,
    );
    const nativePicker = container.querySelector<HTMLInputElement>('input[type="date"]');

    expect(screen.getByRole("button", { name: "Apri calendario per Dal" })).toBeVisible();
    expect(nativePicker).not.toBeNull();
    fireEvent.change(nativePicker!, { target: { value: "2026-09-06" } });
    expect(onChange).toHaveBeenCalledWith("2026-09-06");
  });
});
