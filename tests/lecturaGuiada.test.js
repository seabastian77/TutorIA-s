const L = require("../src/frontend/src/utils/lecturaGuiada");
const { enPalabras, normalizar } = require("../src/backend/src/utils/textoDictado");

const LINEAS = [
  "Look at those mangoes, they look amazing!",
  "I can’t believe it’s already 3:00 — we’re late!",
  "My well-known café is closed... again?",
  "Don't you dare say \"goodbye\" to me, Mr. Lee.",
];

describe("lectura guiada", () => {
  test("las piezas reconstruyen la línea tal cual", () => {
    LINEAS.forEach((linea) => {
      expect(L.partirEnPiezas(linea).map((p) => p.texto).join("")).toBe(linea);
    });
  });

  test("cuenta las mismas palabras que el comparador de pronunciación, en el mismo orden", () => {
    LINEAS.forEach((linea) => {
      const palabras = L.partirEnPiezas(linea).filter((p) => p.palabra).map((p) => normalizar(p.texto));
      expect(palabras).toEqual(enPalabras(linea));
    });
  });

  test("las marcas empiezan en cero, crecen y la puntuación alarga la pausa", () => {
    const marcas = L.marcasDeTiempo(L.partirEnPiezas("one two, three four"));
    expect(marcas[0]).toBe(0);
    marcas.slice(1).forEach((m, i) => expect(m).toBeGreaterThan(marcas[i]));
    expect(marcas[marcas.length - 1]).toBeLessThan(1);
    const sinComa = L.marcasDeTiempo(L.partirEnPiezas("one two three four"));
    expect(marcas[2] - marcas[1]).toBeGreaterThan(sinComa[2] - sinComa[1]);
  });

  test("encuentra la palabra que suena por fracción del audio", () => {
    const marcas = L.marcasDeTiempo(L.partirEnPiezas("Look at those mangoes"));
    expect(L.palabraEnFraccion(marcas, 0)).toBe(0);
    expect(L.palabraEnFraccion(marcas, 1)).toBe(3);
    expect(L.palabraEnFraccion([], 0.5)).toBe(-1);
  });

  test("encuentra la palabra por la posición que avisa la voz del navegador", () => {
    const piezas = L.partirEnPiezas("Look at those mangoes");
    expect(L.palabraEnCaracter(piezas, 0)).toBe(0);
    expect(L.palabraEnCaracter(piezas, 9)).toBe(2);
    expect(L.palabraEnCaracter(piezas, 13)).toBe(3);
    expect(L.palabraEnCaracter(piezas, 99)).toBe(3);
  });

  test("descuenta el silencio del audio y nunca se sale de 0 a 1", () => {
    expect(L.fraccionDeAudio(0, 3)).toBe(0);
    expect(L.fraccionDeAudio(3, 3)).toBe(1);
    expect(L.fraccionDeAudio(1.5, 3)).toBeGreaterThan(0.4);
    expect(L.fraccionDeAudio(1, 0)).toBe(0);
    expect(L.fraccionDeAudio(1, Infinity)).toBe(0);
  });

  test("estima una duración razonable cuando no hay audio que medir", () => {
    const ms = L.duracionEstimada(L.partirEnPiezas("Look at those mangoes, they look amazing!"), 0.9);
    expect(ms).toBeGreaterThan(2000);
    expect(ms).toBeLessThan(7000);
  });
});
