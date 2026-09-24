// Comprueba cómo se leen y se aplican las correcciones de LanguageTool
const {
  tipoDeHallazgo,
  resumirHallazgos,
  aplicarSugerencia,
} = require("../src/frontend/src/utils/revisorEscritura");

const TEXTO = "She go to school yesterday and i has a apple.";

// Lo que devuelve LanguageTool para ese texto, recortado a lo que usa la app
const MATCHES = [
  { offset: 31, length: 1, message: "Use 'I' for the first person.", replacements: [{ value: "I" }], rule: { issueType: "typographical", category: { id: "CASING" } } },
  { offset: 4, length: 2, message: "The verb 'go' does not agree with 'She'.", replacements: [{ value: "goes" }, { value: "went" }], rule: { issueType: "grammar", category: { id: "GRAMMAR" } } },
  { offset: 37, length: 1, message: "Use 'an' before a vowel sound.", replacements: [{ value: "an" }], rule: { issueType: "misspelling", category: { id: "MISC" } } },
];

describe("tipos de error", () => {
  test("clasifica ortografía, gramática, mayúsculas, puntuación y estilo", () => {
    expect(tipoDeHallazgo({ rule: { issueType: "misspelling", category: { id: "TYPOS" } } })).toBe("ortografia");
    expect(tipoDeHallazgo({ rule: { issueType: "grammar", category: { id: "GRAMMAR" } } })).toBe("gramatica");
    expect(tipoDeHallazgo({ rule: { issueType: "typographical", category: { id: "CASING" } } })).toBe("mayusculas");
    expect(tipoDeHallazgo({ rule: { issueType: "typographical", category: { id: "PUNCTUATION" } } })).toBe("puntuacion");
    expect(tipoDeHallazgo({ rule: { issueType: "style", category: { id: "REDUNDANCY" } } })).toBe("estilo");
    expect(tipoDeHallazgo({})).toBe("estilo");
  });
});

describe("hallazgos", () => {
  const h = resumirHallazgos(TEXTO, MATCHES);

  test("salen en el orden del texto, con el fragmento señalado", () => {
    expect(h.map((x) => x.fragmento)).toEqual(["go", "i", "a"]);
    expect(h[0]).toMatchObject({ inicio: 4, largo: 2, tipo: "gramatica", sugerencias: ["goes", "went"] });
  });

  test("descarta lo que no cabe en el texto o viene mal formado", () => {
    const raros = [{ offset: 100, length: 3 }, { offset: "x", length: 1 }, null].filter(Boolean);
    expect(resumirHallazgos("short", raros)).toEqual([]);
    expect(resumirHallazgos("short", undefined)).toEqual([]);
  });

  test("deja máximo tres sugerencias", () => {
    const muchas = [{ offset: 0, length: 5, replacements: [1, 2, 3, 4, 5].map((n) => ({ value: `w${n}` })), rule: {} }];
    expect(resumirHallazgos("short", muchas)[0].sugerencias).toHaveLength(3);
  });
});

describe("aplicar una sugerencia", () => {
  test("cambia el fragmento y corre los errores que vienen después", () => {
    const h = resumirHallazgos(TEXTO, MATCHES);
    const r = aplicarSugerencia(TEXTO, h, 0, "goes");
    expect(r.texto).toBe("She goes to school yesterday and i has a apple.");
    expect(r.hallazgos.map((x) => r.texto.slice(x.inicio, x.inicio + x.largo))).toEqual(["i", "a"]);

    const r2 = aplicarSugerencia(r.texto, r.hallazgos, 0, "I");
    const r3 = aplicarSugerencia(r2.texto, r2.hallazgos, 0, "an");
    expect(r3.texto).toBe("She goes to school yesterday and I has an apple.");
    expect(r3.hallazgos).toEqual([]);
  });

  test("con un índice que no existe no toca nada", () => {
    const h = resumirHallazgos(TEXTO, MATCHES);
    expect(aplicarSugerencia(TEXTO, h, 9, "x")).toEqual({ texto: TEXTO, hallazgos: h });
  });
});
