const {
  datosDePerfilGoogle,
  decidirVinculo,
  entraConContrasena,
} = require("../src/backend/src/utils/cuentaGoogle");

const PERFIL = {
  sub: "109876543210",
  email: "Sebas@Gmail.com",
  email_verified: true,
  name: "Sebas González",
};

describe("datosDePerfilGoogle", () => {
  test("saca el id, el correo y el nombre", () => {
    expect(datosDePerfilGoogle(PERFIL)).toEqual({
      googleId: "109876543210",
      correo: "sebas@gmail.com",
      nombre: "Sebas González",
    });
  });

  test("baja el correo a minúsculas para que no se duplique la cuenta", () => {
    expect(datosDePerfilGoogle(PERFIL).correo).toBe("sebas@gmail.com");
  });

  test("RECHAZA el correo que Google no verificó", () => {
    expect(() => datosDePerfilGoogle({ ...PERFIL, email_verified: false })).toThrow(
      /no ha verificado/,
    );
    expect(() => datosDePerfilGoogle({ ...PERFIL, email_verified: undefined })).toThrow(
      /no ha verificado/,
    );
  });

  test("sin usuario o sin correo no pasa", () => {
    expect(() => datosDePerfilGoogle({ ...PERFIL, sub: null })).toThrow(/usuario/);
    expect(() => datosDePerfilGoogle({ ...PERFIL, email: null })).toThrow(/correo/);
    expect(() => datosDePerfilGoogle(null)).toThrow();
  });

  test("los rechazos son 401, no error del servidor", () => {
    try {
      datosDePerfilGoogle({ ...PERFIL, email_verified: false });
    } catch (e) {
      expect(e.status).toBe(401);
    }
  });

  test("sin nombre usa lo que va antes del arroba", () => {
    const d = datosDePerfilGoogle({ ...PERFIL, name: null, given_name: null });
    expect(d.nombre).toBe("sebas");
  });

  test("un nombre larguísimo se corta", () => {
    const d = datosDePerfilGoogle({ ...PERFIL, name: "a".repeat(300) });
    expect(d.nombre).toHaveLength(80);
  });

  test("el id se guarda como texto, no como número", () => {
    expect(typeof datosDePerfilGoogle({ ...PERFIL, sub: 109876543210 }).googleId).toBe("string");
  });
});

describe("decidirVinculo", () => {
  test("si ya entró antes con Google, solo entra", () => {
    expect(decidirVinculo({ porGoogleId: { id: 1 }, porCorreo: null })).toBe("entrar");
  });

  test("si ya tenía cuenta con ese correo, se vincula en vez de duplicar", () => {
    expect(decidirVinculo({ porGoogleId: null, porCorreo: { id: 2 } })).toBe("vincular");
  });

  test("si no existe, se crea", () => {
    expect(decidirVinculo({ porGoogleId: null, porCorreo: null })).toBe("crear");
  });

  test("manda el id de Google por encima del correo", () => {
    expect(decidirVinculo({ porGoogleId: { id: 1 }, porCorreo: { id: 2 } })).toBe("entrar");
  });
});

describe("entraConContrasena", () => {
  test("quien tiene contraseña guardada puede entrar con ella", () => {
    expect(entraConContrasena({ contrasena_hash: "$2a$10$loquesea" })).toBe(true);
  });

  test("quien se registró solo con Google, no", () => {
    [{ contrasena_hash: null }, { contrasena_hash: "" }, {}, null].forEach((u) => {
      expect(entraConContrasena(u)).toBe(false);
    });
  });
});
