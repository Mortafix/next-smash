import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ItalianDateInput } from "@/components/tournaments/italian-date-input";

afterEach(cleanup);

describe("ItalianDateInput", () => {
  it("inserisce entrambe le barre durante la digitazione con la tastiera numerica", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ItalianDateInput label="Dal" value="" onChange={onChange} />);
    await user.type(screen.getByLabelText("Dal"), "05092026");
    expect(screen.getByLabelText("Dal")).toHaveValue("05/09/2026");
    await user.tab();
    expect(onChange).toHaveBeenCalledWith("2026-09-05");
  });

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

  it("apre un calendario italiano personalizzato e seleziona una data ISO", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ItalianDateInput label="Dal" value="2026-09-04" onChange={onChange} />,
    );
    const trigger = screen.getByRole("button", { name: "Apri calendario per Dal" });
    expect(container.querySelector('input[type="date"]')).toBeNull();

    fireEvent.click(trigger);
    const picker = screen.getByRole("dialog", { name: "Data iniziale" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(within(picker).getByRole("heading", { name: "settembre 2026" })).toBeVisible();
    expect(within(picker).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "lun", "mar", "mer", "gio", "ven", "sab", "dom",
    ]);
    expect(screen.getByRole("button", { name: "venerdì 4 settembre 2026" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "domenica 6 settembre 2026" }));

    expect(onChange).toHaveBeenCalledWith("2026-09-06");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("rispetta i limiti di data anche con le frecce e nella navigazione mensile", () => {
    const onChange = vi.fn();
    render(<ItalianDateInput label="Al" value="2026-09-10" min="2026-09-10" max="2026-09-20" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Apri calendario per Al" }));
    const first = screen.getByRole("button", { name: "giovedì 10 settembre 2026" });

    expect(screen.getByRole("button", { name: "mercoledì 9 settembre 2026" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "lunedì 21 settembre 2026" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mese precedente" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mese successivo" })).toBeDisabled();
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(screen.getByRole("button", { name: "giovedì 17 settembre 2026" })).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("cambia mese e anno da tastiera conservando un giorno valido negli anni bisestili", () => {
    render(<ItalianDateInput label="Dal" value="2028-01-31" onChange={vi.fn()} />);
    fireEvent.keyDown(screen.getByLabelText("Dal"), { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("button", { name: "lunedì 31 gennaio 2028" }), { key: "PageDown" });
    const leapDay = screen.getByRole("button", { name: "martedì 29 febbraio 2028" });
    expect(leapDay).toHaveFocus();
    fireEvent.keyDown(leapDay, { key: "PageDown", shiftKey: true });
    expect(screen.getByRole("button", { name: "mercoledì 28 febbraio 2029" })).toHaveFocus();
  });

  it("chiude con Escape, con la X o al click esterno senza modificare la data", () => {
    const onChange = vi.fn();
    render(<ItalianDateInput label="Dal" value="2026-09-04" onChange={onChange} />);
    const trigger = screen.getByRole("button", { name: "Apri calendario per Dal" });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Chiudi calendario" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("apre il mese del limite quando la data è vuota e permette di svuotare il campo", () => {
    render(<ItalianDateInput label="Al" value="" min="2099-12-10" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Apri calendario per Al" }));
    expect(screen.getByRole("button", { name: "giovedì 10 dicembre 2099" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Oggi" })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    const onChange = vi.fn();
    render(<ItalianDateInput label="Dal" value="2026-09-04" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Apri calendario per Dal" }));
    fireEvent.click(screen.getByRole("button", { name: "Svuota" }));
    expect(onChange).toHaveBeenCalledWith("");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
