// El avatar de la tutoría: modo demo sin claves y sesión real con Simli sin exponer la clave
const { configuracionPublica, crearSesion, maxSegundos } = require("../src/backend/src/services/avatarService");

const VARIABLES = ["AVATAR_PROVEEDOR", "SIMLI_API_KEY", "SIMLI_FACE_ID", "AVATAR_MAX_SEGUNDOS"];
const guardadas = {};
const fetchReal = global.fetch;

beforeEach(() => {
  VARIABLES.forEach((v) => { guardadas[v] = process.env[v]; delete process.env[v]; });
});

afterEach(() => {
  VARIABLES.forEach((v) => { if (guardadas[v] === undefined) delete process.env[v]; else process.env[v] = guardadas[v]; });
  global.fetch = fetchReal;
});

describe("modo del avatar", () => {
  test("sin variables queda en demostración", () => {
    expect(configuracionPublica()).toEqual({ modo: "demo", proveedor: null, maxSegundos: null });
  });

  test("con el proveedor pero sin la cara o la clave sigue en demostración", () => {
    process.env.AVATAR_PROVEEDOR = "simli";
    process.env.SIMLI_API_KEY = "clave";
    expect(configuracionPublica().modo).toBe("demo");
  });

  test("un proveedor desconocido no se activa", () => {
    Object.assign(process.env, { AVATAR_PROVEEDOR: "otro", SIMLI_API_KEY: "c", SIMLI_FACE_ID: "f" });
    expect(configuracionPublica().modo).toBe("demo");
  });

  test("con todo configurado pasa a real y nunca muestra la clave", () => {
    Object.assign(process.env, { AVATAR_PROVEEDOR: "Simli", SIMLI_API_KEY: "secreta-123", SIMLI_FACE_ID: "cara" });
    const conf = configuracionPublica();
    expect(conf).toEqual({ modo: "real", proveedor: "simli", maxSegundos: 600 });
    expect(JSON.stringify(conf)).not.toContain("secreta-123");
  });

  test("la duración máxima se respeta solo dentro de un rango sensato", () => {
    process.env.AVATAR_MAX_SEGUNDOS = "300";
    expect(maxSegundos()).toBe(300);
    process.env.AVATAR_MAX_SEGUNDOS = "999999";
    expect(maxSegundos()).toBe(600);
  });
});

describe("sesión con el proveedor", () => {
  test("sin configuración responde 503 y no llama a nadie", async () => {
    global.fetch = jest.fn();
    await expect(crearSesion()).rejects.toMatchObject({ status: 503 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("pide el token a Simli con la clave en la cabecera y devuelve solo el token", async () => {
    Object.assign(process.env, { AVATAR_PROVEEDOR: "simli", SIMLI_API_KEY: "secreta-123", SIMLI_FACE_ID: "cara-1" });
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ session_token: "tok-abc", warnings: [] }) }));

    const sesion = await crearSesion();
    expect(sesion).toEqual({ proveedor: "simli", sessionToken: "tok-abc", maxSegundos: 600 });
    expect(JSON.stringify(sesion)).not.toContain("secreta-123");

    const [url, opciones] = global.fetch.mock.calls[0];
    expect(url).toBe("https://api.simli.ai/compose/token");
    expect(opciones.headers["x-simli-api-key"]).toBe("secreta-123");
    expect(JSON.parse(opciones.body)).toMatchObject({ faceId: "cara-1", audioInputFormat: "pcm16", maxSessionLength: 600 });
  });

  test("si Simli falla responde 502", async () => {
    Object.assign(process.env, { AVATAR_PROVEEDOR: "simli", SIMLI_API_KEY: "c", SIMLI_FACE_ID: "f" });
    global.fetch = jest.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }));
    await expect(crearSesion()).rejects.toMatchObject({ status: 502 });
  });
});
