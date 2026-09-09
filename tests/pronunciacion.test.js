const {
  compararPronunciacion,
} = require("../src/backend/src/utils/textoDictado");

const LINEA = "I would like a coffee please";

describe("compararPronunciacion", () => {
  test("una lectura idéntica da 100%", () => {
    const r = compararPronunciacion(LINEA, LINEA);
    expect(r.porcentaje).toBe(100);
    expect(r.detalle.every((d) => d.acerto)).toBe(true);
    expect(r.sobrantes).toHaveLength(0);
  });

  test("ignora mayúsculas y puntuación", () => {
    const r = compararPronunciacion(LINEA, "I WOULD like, a coffee... please!");
    expect(r.porcentaje).toBe(100);
  });

  test("marca solo la palabra equivocada", () => {
    const r = compararPronunciacion(LINEA, "I would like a tea please");
    const falladas = r.detalle.filter((d) => !d.acerto).map((d) => d.palabra);
    expect(falladas).toEqual(["coffee"]);
    expect(r.sobrantes).toContain("tea");
  });

  test("una palabra de más no quita aciertos, pero queda registrada", () => {
    const r = compararPronunciacion(LINEA, "I would really like a coffee please");
    expect(r.porcentaje).toBe(100);
    expect(r.sobrantes).toEqual(["really"]);
  });

  test("el orden importa: decirlo al revés baja la nota", () => {
    const r = compararPronunciacion(LINEA, "please coffee a like would I");
    expect(r.porcentaje).toBeLessThan(50);
  });

  test("las palabras que faltan cuentan como falladas", () => {
    const r = compararPronunciacion(LINEA, "I like coffee");
    expect(r.aciertos).toBe(3);
    expect(r.total).toBe(6);
    expect(r.porcentaje).toBe(50);
  });

  test("no decir nada da 0% pero devuelve todas las palabras", () => {
    const r = compararPronunciacion(LINEA, "");
    expect(r.porcentaje).toBe(0);
    expect(r.detalle).toHaveLength(6);
  });

  test("una línea vacía no rompe ni divide por cero", () => {
    const r = compararPronunciacion("", "algo");
    expect(r.total).toBe(0);
    expect(r.porcentaje).toBe(0);
    expect(r.detalle).toHaveLength(0);
  });

  test("una palabra repetida en la línea se evalúa en sus dos posiciones", () => {
    const r = compararPronunciacion("very very good", "very good");
    expect(r.aciertos).toBe(2);
    expect(r.total).toBe(3);
  });
});
