// Comprueba los arreglos de la revisión de errores: fechas de Colombia, límites, dictado y niveles
const { diaLocal, fechaDeBase, diasEntre } = require("../src/backend/src/utils/fechas");
const { limitar } = require("../src/backend/src/middleware/limitar");
const { idValido } = require("../src/backend/src/utils/ejercicios");
const { compararDictado } = require("../src/backend/src/utils/textoDictado");
const { nivelDePalabra, palabrasDe } = require("../src/backend/src/utils/cefr");

describe("el día cuenta en la hora de Colombia", () => {
  test("a las 8 p. m. de Bogotá sigue siendo el mismo día, aunque en UTC ya sea el siguiente", () => {
    expect(diaLocal(new Date("2026-09-24T01:00:00Z"))).toBe("2026-09-23");
    expect(diaLocal(new Date("2026-09-24T05:30:00Z"))).toBe("2026-09-24");
  });

  test("una columna DATE no se corre un día según la zona del servidor", () => {
    expect(fechaDeBase("2026-09-24")).toBe("2026-09-24");
    expect(fechaDeBase(new Date(2026, 8, 24))).toBe("2026-09-24");
    expect(fechaDeBase(null)).toBeNull();
  });

  test("cuenta los días entre dos fechas", () => {
    expect(diasEntre("2026-09-23", "2026-09-24")).toBe(1);
    expect(diasEntre("2026-09-24", "2026-09-24")).toBe(0);
  });
});

describe("límite de peticiones", () => {
  const correr = (mw, req) => {
    let estado = 200;
    let siguio = false;
    const res = { set() {}, status(s) { estado = s; return this; }, json() { return this; } };
    mw(req, res, () => { siguio = true; });
    return { estado, siguio };
  };

  test("deja pasar hasta el máximo y frena el resto con 429", () => {
    const mw = limitar({ max: 2 });
    const req = { method: "POST", headers: { authorization: "Bearer a" }, ip: "1.1.1.1" };
    expect(correr(mw, req).siguio).toBe(true);
    expect(correr(mw, req).siguio).toBe(true);
    expect(correr(mw, req)).toEqual({ estado: 429, siguio: false });
  });

  test("cada sesión tiene su cupo aunque compartan la IP del salón", () => {
    const mw = limitar({ max: 1 });
    expect(correr(mw, { method: "POST", headers: { authorization: "Bearer a" }, ip: "9.9.9.9" }).siguio).toBe(true);
    expect(correr(mw, { method: "POST", headers: { authorization: "Bearer b" }, ip: "9.9.9.9" }).siguio).toBe(true);
  });

  test("las preguntas previas del navegador (OPTIONS) no cuentan", () => {
    const mw = limitar({ max: 0 });
    expect(correr(mw, { method: "OPTIONS", headers: {}, ip: "1" }).siguio).toBe(true);
  });
});

describe("entradas raras", () => {
  test("solo acepta ids enteros positivos", () => {
    expect(idValido("12")).toBe(12);
    expect(idValido(7)).toBe(7);
    [null, undefined, "abc", "1.5", 0, -3, {}].forEach((v) => expect(idValido(v)).toBeNull());
  });

  test("el dictado acepta el apóstrofo curvo del iPhone", () => {
    expect(compararDictado("I don't know.", "I don’t know").porcentaje).toBe(100);
  });

  test("el dictado no revienta si llega algo que no es texto", () => {
    expect(compararDictado("Hello there.", 42).porcentaje).toBe(0);
  });

  test("palabras como 'constructor' no encuentran métodos de Object", () => {
    expect(nivelDePalabra("constructor")).toBeNull();
    expect(nivelDePalabra("__proto__")).toBeNull();
    expect(palabrasDe("constructor")).toEqual(["constructor"]);
  });
});
