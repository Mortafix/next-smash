// Identificativi restituiti dal filtro territoriale ufficiale FITP (id_tipo: 8).
// I codici regione coincidono con quelli ISTAT; gli id provincia sono interni FITP.
export const pucProvinceIdsByRegion: Readonly<Record<number, readonly number[]>> = {
  1: [6, 5, 96, 4, 3, 201, 103, 2],
  2: [7],
  3: [16, 17, 13, 19, 97, 98, 20, 215, 108, 18, 14, 12],
  4: [21, 22],
  5: [25, 28, 29, 26, 227, 23, 24],
  6: [31, 93, 32, 30],
  7: [210, 8, 11, 9],
  8: [237, 38, 40, 36, 34, 33, 39, 35, 99],
  9: [51, 248, 53, 49, 46, 45, 50, 47, 100, 52],
  10: [54, 55],
  11: [42, 44, 109, 43, 41],
  12: [60, 59, 57, 258, 56],
  13: [69, 66, 68, 67],
  14: [70, 94],
  15: [64, 62, 61, 263, 65],
  16: [272, 110, 74, 71, 75, 73],
  17: [77, 76],
  18: [79, 78, 101, 280, 102],
  19: [84, 85, 287, 86, 283, 282, 88, 89, 81],
  20: [292, 91, 95, 90, 111],
};

