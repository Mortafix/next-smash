import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { municipalityCellText } from "./municipality-cell";

describe("lettura celle anagrafiche ISTAT", () => {
  it("legge testo formattato e bilingue senza convertire oggetti in etichette", () => {
    const workbook = new ExcelJS.Workbook();
    const row = workbook.addWorksheet("Comuni").getRow(1);
    row.getCell(11).value = {
      richText: [{ text: "Valle d’Aosta" }, { text: " / Vallée d’Aoste" }],
    };
    expect(municipalityCellText(row, 11)).toBe("Valle d’Aosta / Vallée d’Aoste");
  });

  it("preserva valori testuali, numerici e vuoti", () => {
    const workbook = new ExcelJS.Workbook();
    const row = workbook.addWorksheet("Comuni").getRow(1);
    row.getCell(1).value = 2;
    row.getCell(2).value = "  Valle   d’Aosta  ";
    expect(municipalityCellText(row, 1)).toBe("2");
    expect(municipalityCellText(row, 2)).toBe("Valle d’Aosta");
    expect(municipalityCellText(row, 3)).toBe("");
  });
});
