// Comprueba la lista CEFR-J y las frases de Tatoeba que usan el dictado y el vocabulario
const { nivelDePalabra, nivelDeFrase, palabrasDe, baseDe } = require("../src/backend/src/utils/cefr");
const {
  FRASES,
  DICTADO,
  credito,
  fraseDeDictado,
  ejemploPara,
} = require("../src/backend/src/utils/frasesTatoeba");

describe("nivel de las palabras (CEFR-J)", () => {
  test("encuentra la forma de diccionario de plurales y verbos", () => {
    expect(baseDe("studies")).toBe("study");
    expect(baseDe("cares")).toBe("care");
    expect(baseDe("played")).toBe("play");
    expect(baseDe("used")).toBe("used"); // "used" ya es palabra de la lista (adjetivo)
    expect(baseDe("making")).toBe("make");
    expect(baseDe("stopped")).toBe("stop");
  });

  test("da el nivel de palabras, expresiones y formas irregulares", () => {
    expect(nivelDePalabra("Apples")).toBe("A1");
    expect(nivelDePalabra("went")).toBe("A1");
    expect(nivelDePalabra("abandon")).toBe("B1");
    expect(nivelDePalabra("alarm clock")).toBe("A2");
  });

  test("no inventa un nivel para lo que no está en la lista", () => {
    expect(nivelDePalabra("xyzzy")).toBeNull();
    expect(nivelDePalabra("")).toBeNull();
    expect(nivelDePalabra(null)).toBeNull();
  });

  test("quita las contracciones antes de medir", () => {
    expect(palabrasDe("Tom doesn't know I'm here.")).toEqual(["tom", "does", "know", "i", "here"]);
  });

  test("una frase vale lo que su palabra más difícil y avisa las desconocidas", () => {
    expect(nivelDeFrase("I like apples.")).toEqual({ nivel: "A1", desconocidas: [] });
    expect(nivelDeFrase("We abandoned the plan.").nivel).toBe("B1");
    expect(nivelDeFrase("The zyxwv is here.").desconocidas).toEqual(["zyxwv"]);
  });
});

describe("frases de Tatoeba", () => {
  test("hay frases de dictado de A1 a B2", () => {
    for (const nivel of ["A1", "A2", "B1", "B2"]) expect(DICTADO[nivel].length).toBeGreaterThan(100);
  });

  test("todas tienen traducción, autores y solo palabras de su nivel o menos", () => {
    for (const f of FRASES) {
      expect(f.es).toBeTruthy();
      expect(f.autorEn).toBeTruthy();
      expect(f.autorEs).toBeTruthy();
      const medida = nivelDeFrase(f.en);
      expect(medida.desconocidas).toEqual([]);
      expect(medida.nivel).toBe(f.nivel);
    }
  });

  test("las del dictado se pueden leer en voz alta: sin números ni comillas", () => {
    for (const nivel of Object.keys(DICTADO)) {
      for (const f of DICTADO[nivel]) expect(f.en).toMatch(/^[A-Z][A-Za-z ,'’-]*[.?!]$/);
    }
  });

  test("no repite una frase que la persona ya vio si quedan otras", () => {
    const vistas = new Set(DICTADO.A1.slice(1).map((f) => f.en));
    expect(fraseDeDictado("A1", vistas).en).toBe(DICTADO.A1[0].en);
  });

  test("si ya las vio todas vuelve a empezar, y en C1 deja el trabajo a la IA", () => {
    const todas = new Set(DICTADO.A2.map((f) => f.en));
    expect(fraseDeDictado("A2", todas)).not.toBeNull();
    expect(fraseDeDictado("C1")).toBeNull();
    expect(fraseDeDictado("C2")).toBeNull();
  });

  test("el crédito lleva autores, licencia y enlace a la frase", () => {
    const c = credito({ idEn: 12, autorEn: "CK", idEs: 34, autorEs: "marcelostockle" });
    expect(c.texto).toBe("Tatoeba #12 (CK) & #34 (marcelostockle) · CC BY 2.0 FR");
    expect(c.enlace).toBe("https://tatoeba.org/en/sentences/show/12");
  });
});

describe("ejemplos para el vocabulario", () => {
  test("prefiere una frase con la palabra tal como se escribió", () => {
    expect(ejemploPara("went").en.toLowerCase()).toMatch(/\bwent\b/);
    expect(ejemploPara("apples").en.toLowerCase()).toMatch(/\bapples\b/);
  });

  test("encuentra la forma base cuando no hay otra", () => {
    const e = ejemploPara("perseverance");
    expect(e.en.toLowerCase()).toContain("perseverance");
  });

  test("devuelve null si no hay ejemplo", () => {
    expect(ejemploPara("xyzzy")).toBeNull();
    expect(ejemploPara("")).toBeNull();
  });
});
