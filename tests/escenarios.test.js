// Comprueba que cada situación trae lo que pinta su tarjeta y nada de sus prompts internos
process.env.GROQ_API_KEY = "clave-de-prueba";

jest.mock("groq-sdk", () => class GroqFalso {}, { virtual: true });

const { listarEscenarios } = require("../src/backend/src/services/iaContenido");

const NIVELES = ["A1", "A2", "B1", "B2", "C1", "C2"];
const CATEGORIAS = ["travel", "work", "daily"];

describe("catálogo de situaciones", () => {
  const escenarios = listarEscenarios();

  test("hay situaciones para mostrar", () => {
    expect(escenarios.length).toBeGreaterThan(0);
  });

  test.each(escenarios.map((e) => [e.id, e]))("%s trae nivel, minutos y tema válidos", (_id, e) => {
    expect(NIVELES).toContain(e.nivel);
    expect(Number.isInteger(e.minutos)).toBe(true);
    expect(e.minutos).toBeGreaterThan(0);
    expect(CATEGORIAS).toContain(e.categoria);
  });

  test("ningún filtro queda vacío", () => {
    CATEGORIAS.forEach((c) => {
      expect(escenarios.some((e) => e.categoria === c)).toBe(true);
    });
  });

  test("los prompts internos no salen hacia el cliente", () => {
    escenarios.forEach((e) => {
      expect(e.personaje).toBeUndefined();
      expect(e.apertura).toBeUndefined();
    });
  });
});
