// Comprueba la limpieza de la palabra tocada y la caché que evita repetir consultas a la IA
const {
  limpiarPalabra,
  esPalabraInglesa,
  limpiarFrase,
  normalizarTraduccion,
  crearCacheTraducciones,
  claveTraduccion,
} = require("../src/backend/src/utils/palabraTocada");

describe("palabra tocada", () => {
  test("quita signos y espacios de los bordes", () => {
    expect(limpiarPalabra("  “Don’t,  ")).toBe("Don’t");
    expect(limpiarPalabra("(house).")).toBe("house");
    expect(limpiarPalabra(42)).toBe("");
    expect(limpiarPalabra(null)).toBe("");
    expect(limpiarPalabra("a".repeat(90))).toHaveLength(40);
  });

  test("acepta solo palabras en inglés", () => {
    expect(esPalabraInglesa("well-known")).toBe(true);
    expect(esPalabraInglesa("don't")).toBe(true);
    expect(esPalabraInglesa("canción")).toBe(false);
    expect(esPalabraInglesa("two words")).toBe(false);
    expect(esPalabraInglesa("<script>")).toBe(false);
    expect(esPalabraInglesa("")).toBe(false);
  });

  test("deja la frase en una línea y con tope", () => {
    expect(limpiarFrase("  I  like\n\n coffee. ")).toBe("I like coffee.");
    expect(limpiarFrase({ texto: "x" })).toBe("");
    expect(limpiarFrase("b".repeat(500))).toHaveLength(300);
  });

  test("normaliza la respuesta de la IA y agrega el nivel CEFR", () => {
    const r = normalizarTraduccion({ palabra: "run", traduccion: " correr ", tipo: "Verb" }, "running");
    expect(r).toEqual({ palabra: "run", traduccion: "correr", tipo: "verb", ejemplo: "", nivel: "A1" });
    expect(normalizarTraduccion(null, "house").palabra).toBe("house");
    expect(normalizarTraduccion({ traduccion: 7 }, "house").traduccion).toBe("");
  });

  test("la llave separa idioma, palabra y frase", () => {
    const base = { palabra: "Bank", contexto: "The river bank.", ayudaEs: true };
    expect(claveTraduccion(base)).toBe("es|bank|the river bank.");
    expect(claveTraduccion({ ...base, ayudaEs: false })).not.toBe(claveTraduccion(base));
  });
});

describe("caché de traducciones", () => {
  test("dos toques seguidos comparten una sola consulta", async () => {
    const cache = crearCacheTraducciones();
    const producir = jest.fn(async () => ({ traduccion: "casa" }));
    const [a, b] = await Promise.all([cache.obtener("k", producir), cache.obtener("k", producir)]);
    expect(a).toEqual(b);
    expect(producir).toHaveBeenCalledTimes(1);
  });

  test("un error no se queda guardado", async () => {
    const cache = crearCacheTraducciones();
    await expect(cache.obtener("k", async () => { throw new Error("IA caída"); })).rejects.toThrow("IA caída");
    expect(cache.tamano).toBe(0);
    await expect(cache.obtener("k", async () => "ok")).resolves.toBe("ok");
  });

  test("respeta el límite y el vencimiento", async () => {
    const cache = crearCacheTraducciones({ limite: 2, vidaMs: 1000 });
    await cache.obtener("a", async () => 1);
    await cache.obtener("b", async () => 2);
    await cache.obtener("c", async () => 3);
    expect(cache.tamano).toBe(2);

    const reloj = jest.spyOn(Date, "now").mockReturnValue(Date.now() + 5000);
    const producir = jest.fn(async () => 4);
    await cache.obtener("c", producir);
    expect(producir).toHaveBeenCalledTimes(1);
    reloj.mockRestore();
  });
});
