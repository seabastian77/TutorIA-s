const {
  CAMPOS,
  elegirAlAzar,
  campoAlAzar,
  instruccionVariedad,
  instruccionVariedadEs,
} = require("../src/backend/src/utils/variedad");

describe("elegirAlAzar", () => {
  test("siempre saca algo que estaba en la lista", () => {
    const lista = ["a", "b", "c"];
    for (let i = 0; i < 50; i++) {
      expect(lista).toContain(elegirAlAzar(lista));
    }
  });

  test("una lista vacía o inválida devuelve null", () => {
    expect(elegirAlAzar([])).toBeNull();
    expect(elegirAlAzar(null)).toBeNull();
  });
});

describe("campoAlAzar", () => {
  test("cada campo trae su versión en inglés y en español", () => {
    CAMPOS.forEach((campo) => {
      expect(typeof campo.en).toBe("string");
      expect(typeof campo.es).toBe("string");
      expect(campo.en.length).toBeGreaterThan(0);
      expect(campo.es.length).toBeGreaterThan(0);
    });
  });

  test("hay campos de sobra para que no se note la repetición", () => {
    expect(CAMPOS.length).toBeGreaterThanOrEqual(20);
  });

  test("en varias llamadas no siempre sale el mismo", () => {
    const salidas = new Set();
    for (let i = 0; i < 60; i++) salidas.add(campoAlAzar().en);
    expect(salidas.size).toBeGreaterThan(1);
  });
});

describe("instruccionVariedad", () => {
  test("siempre nombra un campo temático de la lista", () => {
    const texto = instruccionVariedad();
    expect(CAMPOS.some((c) => texto.includes(c.en))).toBe(true);
  });

  test("mete las palabras que hay que evitar", () => {
    const texto = instruccionVariedad(["house", "water"]);
    expect(texto).toContain("Do NOT use");
    expect(texto).toContain("house");
    expect(texto).toContain("water");
  });

  test("sin nada que evitar no habla de evitar", () => {
    expect(instruccionVariedad([])).not.toContain("Do NOT use");
    expect(instruccionVariedad()).not.toContain("Do NOT use");
  });

  test("no manda más de 25 palabras aunque le pasen cien", () => {
    const muchas = Array.from({ length: 100 }, (_, i) => `palabra${i}`);
    const texto = instruccionVariedad(muchas);
    const listadas = texto.split("Do NOT use any of these words: ")[1].split(".")[0];
    expect(listadas.split(",").length).toBe(25);
  });

  test("ignora los huecos vacíos de la lista", () => {
    const texto = instruccionVariedad(["  ", null, "", "house"]);
    expect(texto).toContain("house");
    expect(texto).not.toContain(", ,");
  });
});

describe("instruccionVariedadEs", () => {
  test("va en español y nombra un campo en español", () => {
    const texto = instruccionVariedadEs();
    expect(texto).toContain("campo temático");
    expect(CAMPOS.some((c) => texto.includes(c.es))).toBe(true);
  });

  test("también sabe listar lo que hay que evitar", () => {
    const texto = instruccionVariedadEs(["casa"]);
    expect(texto).toContain("NO uses");
    expect(texto).toContain("casa");
  });
});
