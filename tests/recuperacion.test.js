const {
  TOKEN_BYTES,
  VIGENCIA_MINUTOS,
  crearToken,
  hashDeToken,
  tokenBienFormado,
  expiraEn,
  estaVencido,
  correoValido,
  contrasenaValida,
  enlaceDeRecuperacion,
  cuerpoDelCorreo,
} = require("../src/backend/src/utils/recuperacion");

describe("crearToken", () => {
  test("el token va en el correo y a la base solo entra su hash", () => {
    const { token, hash } = crearToken();
    expect(hash).not.toBe(token);
    expect(hash).toBe(hashDeToken(token));
  });

  test("dos tokens seguidos nunca salen iguales", () => {
    const vistos = new Set(Array.from({ length: 200 }, () => crearToken().token));
    expect(vistos.size).toBe(200);
  });

  test("el token es lo bastante largo para no adivinarse", () => {
    expect(crearToken().token).toHaveLength(TOKEN_BYTES * 2);
    expect(TOKEN_BYTES).toBeGreaterThanOrEqual(32);
  });

  test("del hash no se puede sacar el token", () => {
    const { token, hash } = crearToken();
    expect(hash).not.toContain(token.slice(0, 8));
  });
});

describe("hashDeToken", () => {
  test("el mismo token da siempre el mismo hash", () => {
    expect(hashDeToken("abc")).toBe(hashDeToken("abc"));
  });

  test("un token distinto da un hash distinto", () => {
    expect(hashDeToken("abc")).not.toBe(hashDeToken("abd"));
  });

  test("aguanta null sin reventar", () => {
    expect(typeof hashDeToken(null)).toBe("string");
  });
});

describe("tokenBienFormado", () => {
  test("acepta el que sale de crearToken", () => {
    expect(tokenBienFormado(crearToken().token)).toBe(true);
  });

  test("rechaza lo que venga inventado de la URL", () => {
    ["", "hola", "../../etc", "ZZZ", "a".repeat(63), null, undefined, 7, {}].forEach((malo) => {
      expect(tokenBienFormado(malo)).toBe(false);
    });
  });
});

describe("vencimiento", () => {
  test("nace con una hora de vida", () => {
    const ahora = new Date("2026-09-21T10:00:00Z");
    expect(expiraEn(ahora).toISOString()).toBe("2026-09-21T11:00:00.000Z");
    expect(VIGENCIA_MINUTOS).toBeLessThanOrEqual(60);
  });

  test("recién creado no está vencido", () => {
    const ahora = new Date("2026-09-21T10:00:00Z");
    expect(estaVencido(expiraEn(ahora), ahora)).toBe(false);
  });

  test("un minuto después de la hora ya no sirve", () => {
    const ahora = new Date("2026-09-21T10:00:00Z");
    const despues = new Date("2026-09-21T11:01:00Z");
    expect(estaVencido(expiraEn(ahora), despues)).toBe(true);
  });

  test("justo en el segundo del vencimiento ya no sirve", () => {
    const ahora = new Date("2026-09-21T10:00:00Z");
    expect(estaVencido(expiraEn(ahora), new Date("2026-09-21T11:00:00Z"))).toBe(true);
  });

  test("una fecha ilegible se trata como vencida, no como válida", () => {
    [null, undefined, "mañana", NaN].forEach((mala) => {
      expect(estaVencido(mala)).toBe(true);
    });
  });

  test("también entiende la fecha como texto, que es como sale de la base", () => {
    const ahora = new Date("2026-09-21T10:00:00Z");
    expect(estaVencido("2026-09-21T11:00:00.000Z", ahora)).toBe(false);
    expect(estaVencido("2026-09-21T09:00:00.000Z", ahora)).toBe(true);
  });
});

describe("validaciones", () => {
  test("un correo con forma pasa", () => {
    expect(correoValido("sebas@correo.com")).toBe(true);
    expect(correoValido("  sebas@correo.com  ")).toBe(true);
  });

  test("lo que no es correo no pasa", () => {
    ["", "sebas", "sebas@", "@correo.com", "sebas correo.com", null, 7].forEach((malo) => {
      expect(correoValido(malo)).toBe(false);
    });
  });

  test("la contraseña nueva pide lo mismo que el registro", () => {
    expect(contrasenaValida("123456")).toBe(true);
    expect(contrasenaValida("12345")).toBe(false);
    expect(contrasenaValida(null)).toBe(false);
  });
});

describe("enlaceDeRecuperacion", () => {
  test("arma el enlace sobre la dirección de la app", () => {
    expect(enlaceDeRecuperacion("https://tutorias.app", "abc123")).toBe(
      "https://tutorias.app/?recuperar=abc123",
    );
  });

  test("no deja dos barras cuando la base ya trae una", () => {
    expect(enlaceDeRecuperacion("https://tutorias.app/", "abc")).toBe(
      "https://tutorias.app/?recuperar=abc",
    );
  });

  test("escapa el token para que no rompa la URL", () => {
    expect(enlaceDeRecuperacion("https://x.com", "a b&c")).toContain("a%20b%26c");
  });
});

describe("cuerpoDelCorreo", () => {
  const enlace = "https://tutorias.app/?recuperar=abc";

  test("lleva el enlace en texto y en HTML", () => {
    const c = cuerpoDelCorreo("Sebas", enlace);
    expect(c.texto).toContain(enlace);
    expect(c.html).toContain(enlace);
    expect(c.asunto).toMatch(/contraseña/i);
  });

  test("le dice al usuario que si no fue él, no haga nada", () => {
    expect(cuerpoDelCorreo("Sebas", enlace).texto).toMatch(/Si no fuiste tú/);
  });

  test("avisa que vence y que es de un solo uso", () => {
    const c = cuerpoDelCorreo("Sebas", enlace);
    expect(c.texto).toContain(`${VIGENCIA_MINUTOS} minutos`);
    expect(c.texto).toMatch(/una sola vez/);
  });

  test("sin nombre saluda igual, no dice 'Hola undefined'", () => {
    const c = cuerpoDelCorreo(null, enlace);
    expect(c.texto).toMatch(/^Hola,/);
    expect(c.texto).not.toContain("undefined");
  });

  test("un nombre con HTML no se cuela en el correo", () => {
    const c = cuerpoDelCorreo('<img src=x onerror=alert(1)>', enlace);
    expect(c.html).not.toContain("<img");
    expect(c.html).toContain("&lt;img");
  });
});
