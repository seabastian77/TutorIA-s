// Comprueba la validación de los reportes de ejercicios mal hechos
const { normalizarReporte, limpiarContenido, MODULOS, MOTIVOS } = require("../src/backend/src/utils/reportes");

describe("reporte de un ejercicio", () => {
  const base = { modulo: "practica", motivo: "respuesta_incorrecta", comentario: "  The answer   should be B  ", contenido: { pregunta: "Pick one" } };

  test("acepta un reporte bien hecho y limpia el comentario", () => {
    expect(normalizarReporte(base)).toEqual({
      modulo: "practica",
      motivo: "respuesta_incorrecta",
      comentario: "The answer should be B",
      contenido: { pregunta: "Pick one" },
    });
  });

  test("rechaza módulos y motivos que no existen", () => {
    expect(normalizarReporte({ ...base, modulo: "admin" }).error).toBeTruthy();
    expect(normalizarReporte({ ...base, motivo: "spam" }).error).toBeTruthy();
    expect(normalizarReporte(null).error).toBeTruthy();
  });

  test("el comentario es opcional, pero si llega debe ser texto", () => {
    expect(normalizarReporte({ ...base, comentario: "" }).comentario).toBeNull();
    expect(normalizarReporte({ ...base, comentario: { x: 1 } }).error).toBeTruthy();
    expect(normalizarReporte({ ...base, comentario: "a".repeat(900) }).comentario).toHaveLength(500);
  });

  test("todos los módulos y motivos de la interfaz son válidos", () => {
    expect(MODULOS).toEqual(expect.arrayContaining(["practica", "lectura", "dictado", "comprension", "visual"]));
    expect(MOTIVOS).toContain("otro");
  });
});

describe("contenido guardado", () => {
  test("recorta textos, listas y profundidad", () => {
    const limpio = limpiarContenido({ texto: "x".repeat(1000), lista: Array.from({ length: 30 }, (_, i) => i), a: { b: { c: { d: 1 } } } });
    expect(limpio.texto).toHaveLength(400);
    expect(limpio.lista).toHaveLength(10);
    expect(limpio.a.b.c).toBeNull();
  });

  test("descarta lo que no es dato y un contenido gigante", () => {
    expect(limpiarContenido({ f: () => 1, n: Infinity })).toEqual({ f: null, n: null });
    const enorme = { partes: Array.from({ length: 10 }, () => Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`k${i}`, "y".repeat(400)]))) };
    expect(normalizarReporte({ modulo: "lectura", motivo: "otro", contenido: enorme }).contenido).toEqual({ recortado: true });
  });
});
