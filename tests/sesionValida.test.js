const { tokenAnteriorAlCambio } = require("../src/backend/src/utils/sesionValida");

const enSegundos = (iso) => Math.floor(new Date(iso).getTime() / 1000);

describe("tokenAnteriorAlCambio", () => {
  const CAMBIO = "2026-09-21T10:00:00Z";

  test("un token de antes del cambio queda por fuera", () => {
    expect(tokenAnteriorAlCambio(enSegundos("2026-09-21T09:00:00Z"), CAMBIO)).toBe(true);
  });

  test("un token dado después del cambio sigue sirviendo", () => {
    expect(tokenAnteriorAlCambio(enSegundos("2026-09-21T10:05:00Z"), CAMBIO)).toBe(false);
  });

  test("el token del mismo segundo del cambio no se rechaza", () => {
    expect(tokenAnteriorAlCambio(enSegundos(CAMBIO), CAMBIO)).toBe(false);
  });

  test("quien nunca ha cambiado la clave no pierde su sesión", () => {
    [null, undefined].forEach((sinCambio) => {
      expect(tokenAnteriorAlCambio(enSegundos("2020-01-01T00:00:00Z"), sinCambio)).toBe(false);
    });
  });

  test("una fecha ilegible no saca a nadie", () => {
    expect(tokenAnteriorAlCambio(enSegundos("2020-01-01T00:00:00Z"), "cuando sea")).toBe(false);
  });

  test("un token sin 'iat' no se rechaza por esto", () => {
    [undefined, null, 0, -5, NaN, "ayer"].forEach((malo) => {
      expect(tokenAnteriorAlCambio(malo, CAMBIO)).toBe(false);
    });
  });

  test("entiende la fecha como objeto Date, que es como la devuelve pg", () => {
    expect(tokenAnteriorAlCambio(enSegundos("2026-09-21T09:00:00Z"), new Date(CAMBIO))).toBe(true);
  });
});
