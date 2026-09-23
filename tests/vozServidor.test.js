// Comprueba la voz en inglés del servidor: la descarga, quién lee cada idioma y que el audio salga en MP3
const fs = require("fs");
const os = require("os");
const path = require("path");

const { extraerTar, vozDescargada, rutasVoz } = require("../src/backend/src/utils/descargaVoz");

/** Arma un tar mínimo en memoria con los archivos dados. */
function tarDe(archivos) {
  const bloques = [];
  for (const [nombre, contenido] of Object.entries(archivos)) {
    const datos = Buffer.from(contenido);
    const cabecera = Buffer.alloc(512);
    cabecera.write(nombre, 0, "utf8");
    cabecera.write(datos.length.toString(8).padStart(11, "0"), 124, "latin1");
    cabecera.write("0", 156, "latin1");
    bloques.push(cabecera, datos, Buffer.alloc((512 - (datos.length % 512)) % 512));
  }
  bloques.push(Buffer.alloc(1024));
  return Buffer.concat(bloques);
}

describe("descarga de la voz", () => {
  let carpeta;
  beforeEach(() => {
    carpeta = fs.mkdtempSync(path.join(os.tmpdir(), "voz-"));
  });
  afterEach(() => fs.rmSync(carpeta, { recursive: true, force: true }));

  test("saca los archivos del paquete en sus carpetas", () => {
    extraerTar(tarDe({ "a/b.txt": "hola", "c.txt": "chao" }), carpeta);
    expect(fs.readFileSync(path.join(carpeta, "a/b.txt"), "utf8")).toBe("hola");
    expect(fs.readFileSync(path.join(carpeta, "c.txt"), "utf8")).toBe("chao");
  });

  test("no deja que un archivo del paquete se salga de la carpeta", () => {
    extraerTar(tarDe({ "../fuera.txt": "x" }), carpeta);
    expect(fs.existsSync(path.join(carpeta, "..", "fuera.txt"))).toBe(false);
  });

  test("solo da la voz por lista cuando están el modelo, los tokens y los datos", () => {
    expect(vozDescargada(carpeta)).toBe(false);
    const r = rutasVoz(carpeta);
    fs.mkdirSync(r.datos, { recursive: true });
    fs.writeFileSync(r.tokens, "a 1");
    expect(vozDescargada(carpeta)).toBe(false);
    fs.writeFileSync(r.modelo, "x");
    expect(vozDescargada(carpeta)).toBe(true);
  });
});

describe("quién lee en el servidor", () => {
  const original = process.env.GOOGLE_TTS_API_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.GOOGLE_TTS_API_KEY;
    else process.env.GOOGLE_TTS_API_KEY = original;
    jest.resetModules();
  });

  test("con la clave de Google lee inglés y español", () => {
    process.env.GOOGLE_TTS_API_KEY = "prueba";
    const { idiomasConVoz } = require("../src/backend/src/services/vozServidor");
    expect(idiomasConVoz()).toEqual(["en", "es"]);
  });

  test("sin Google, lee inglés solo si la voz propia está descargada", () => {
    delete process.env.GOOGLE_TTS_API_KEY;
    const { idiomasConVoz } = require("../src/backend/src/services/vozServidor");
    const { vozPiperLista } = require("../src/backend/src/services/vozPiperService");
    expect(idiomasConVoz()).toEqual(vozPiperLista() ? ["en"] : []);
  });
});

describe("voz propia en inglés", () => {
  const { vozPiperLista, sintetizarPiper, aMp3 } = require("../src/backend/src/services/vozPiperService");

  test("convierte las muestras en un MP3 válido", async () => {
    const muestras = new Float32Array(22050).map((_, i) => Math.sin(i / 10) * 0.3);
    const mp3 = await aMp3(muestras, 22050);
    expect(mp3.length).toBeGreaterThan(1000);
    expect(mp3[0]).toBe(0xff); // cabecera de cuadro MP3
  });

  const siHayVoz = vozPiperLista() ? test : test.skip;
  siHayVoz("lee una frase en inglés y la devuelve en MP3", async () => {
    const audio = await sintetizarPiper("Could you please close the window?", 0.9);
    const bytes = Buffer.from(audio, "base64");
    expect(bytes.length).toBeGreaterThan(5000);
    expect(bytes[0]).toBe(0xff);
    // La segunda vez sale del caché
    expect(await sintetizarPiper("Could you please close the window?", 0.9)).toBe(audio);
  }, 30000);

  siHayVoz("no lee textos vacíos", async () => {
    expect(await sintetizarPiper("   ", 1)).toBeNull();
  });
});
