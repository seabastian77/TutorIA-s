const { POLITICA_VERSION, aceptoPolitica } = require("../src/backend/src/utils/politica");

describe("aceptoPolitica", () => {
  test("solo un true de verdad cuenta como aceptación", () => {
    expect(aceptoPolitica(true)).toBe(true);
  });

  test("nada que se parezca a un sí vale: la ley pide autorización expresa", () => {
    [false, "true", "sí", 1, "1", "on", null, undefined, {}, []].forEach((casi) => {
      expect(aceptoPolitica(casi)).toBe(false);
    });
  });
});

describe("POLITICA_VERSION", () => {
  test("hay una versión para dejar constancia de qué se aceptó", () => {
    expect(typeof POLITICA_VERSION).toBe("string");
    expect(POLITICA_VERSION.length).toBeGreaterThan(0);
  });

  test("coincide con la versión que dice la página publicada", () => {
    const fs = require("fs");
    const pagina = fs.readFileSync(`${__dirname}/../src/frontend/privacidad.html`, "utf8");
    expect(pagina).toContain(`Versión ${POLITICA_VERSION}`);
  });
});
