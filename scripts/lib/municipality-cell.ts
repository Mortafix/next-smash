import type ExcelJS from "exceljs";

export function municipalityCellText(row: ExcelJS.Row, column: number) {
  // ExcelJS conserva il testo formattato come oggetto, es. il nome bilingue della Valle d’Aosta.
  return row.getCell(column).text.trim().replace(/\s+/g, " ");
}
