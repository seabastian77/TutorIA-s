const { elegirProveedor, remitenteDe } = require("../src/backend/src/utils/proveedorCorreo");

const GMAIL = { GMAIL_USUARIO: "yo@gmail.com", GMAIL_CLAVE_APP: "abcd efgh ijkl mnop" };

describe("elegirProveedor", () => {
  test("con Gmail configurado, se va por Gmail", () => {
    expect(elegirProveedor(GMAIL)).toBe("gmail");
  });

  test("Gmail le gana a Resend, porque le llega a cualquiera", () => {
    expect(elegirProveedor({ ...GMAIL, RESEND_API_KEY: "re_x" })).toBe("gmail");
  });

  test("sin Gmail pero con Resend, se va por Resend", () => {
    expect(elegirProveedor({ RESEND_API_KEY: "re_x" })).toBe("resend");
  });

  test("Gmail a medias no cuenta como configurado", () => {
    expect(elegirProveedor({ GMAIL_USUARIO: "yo@gmail.com" })).toBe("ninguno");
    expect(elegirProveedor({ GMAIL_CLAVE_APP: "abcd" })).toBe("ninguno");
  });

  test("sin nada, ninguno: el enlace se imprime en los logs", () => {
    expect(elegirProveedor({})).toBe("ninguno");
    expect(elegirProveedor()).toBe("ninguno");
  });
});

describe("remitenteDe", () => {
  test("con Gmail, el remitente es esa misma cuenta", () => {
    expect(remitenteDe(GMAIL, "gmail")).toBe("TutorIA's <yo@gmail.com>");
  });

  test("lo que se ponga a mano manda sobre lo demás", () => {
    expect(remitenteDe({ ...GMAIL, CORREO_REMITENTE: "Hola <hola@mio.com>" }, "gmail")).toBe(
      "Hola <hola@mio.com>",
    );
  });

  test("con Resend cae al remitente de prueba", () => {
    expect(remitenteDe({ RESEND_API_KEY: "re_x" }, "resend")).toContain("resend.dev");
  });
});
