// Abrir libros rápido: ficha guardada desde el catálogo, descarga que no insiste y narrador que repite solo lo justo
process.env.GROQ_API_KEY = "clave-de-prueba";

const mockCrear = jest.fn();
jest.mock(
  "groq-sdk",
  () =>
    class GroqFalso {
      constructor() {
        this.chat = { completions: { create: (...args) => mockCrear(...args) } };
      }
    },
  { virtual: true },
);

const RUTA_GUTENBERG = "../src/backend/src/services/gutenberg";
const fetchReal = global.fetch;

const LIBRO = {
  id: 209,
  title: "The Turn of the Screw",
  languages: ["en"],
  media_type: "Text",
  copyright: false,
  authors: [{ name: "James, Henry", birth_year: 1843, death_year: 1916 }],
  translators: [],
  formats: {
    "text/plain; charset=utf-8": "https://www.gutenberg.org/ebooks/209.txt.utf-8",
    "image/jpeg": "https://www.gutenberg.org/cache/epub/209/pg209.cover.medium.jpg",
  },
};
const FICHA = { gutenbergId: 209, textoUrl: "https://www.gutenberg.org/ebooks/209.txt.utf-8" };
const TEXTO = `*** START OF THE PROJECT GUTENBERG EBOOK THE TURN OF THE SCREW ***\n${"Words of the story. ".repeat(60)}\n*** END OF THE PROJECT GUTENBERG EBOOK THE TURN OF THE SCREW ***`;

const LINEAS = Array.from({ length: 8 }, (_, i) => `The governess saw something strange number ${i + 1}.`);
const PARTE = {
  titulo: "A story by the fire",
  tituloEs: "Una historia junto al fuego",
  ambiente: "old house by the fire",
  lineas: LINEAS,
  traducciones: LINEAS.map((_, i) => `La institutriz vio algo extraño número ${i + 1}.`),
};
const PEDIDO = {
  libro: { titulo: "The Turn of the Screw", autor: "Henry James", total: 30 },
  numero: 1,
  parte: { titulo: "", texto: "It was a dark night and the story held us round the fire." },
  nivel: "A2",
};
const respuesta = (contenido) => ({ choices: [{ message: { content: contenido } }] });

beforeEach(() => {
  jest.resetModules();
  mockCrear.mockReset();
});

afterAll(() => {
  global.fetch = fetchReal;
});

describe("libros del catálogo libre", () => {
  test("un libro visto en el catálogo se abre sin volver a preguntarle a Gutendex", async () => {
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ count: 1, next: null, results: [LIBRO] }) }));
    const { buscarLibros, obtenerFicha } = require(RUTA_GUTENBERG);
    const pagina = await buscarLibros({ busqueda: "turn of the screw" });
    expect(pagina.libros.map((l) => l.id)).toEqual(["pg209"]);
    expect(pagina.libros[0].textoUrl).toBeUndefined();

    const ficha = await obtenerFicha(209);
    expect(ficha.textoUrl).toBe("https://www.gutenberg.org/ebooks/209.txt.utf-8");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("baja primero el archivo directo y, si no existe, la dirección de la ficha", async () => {
    global.fetch = jest.fn(async (url) => (url.includes("/cache/epub/") ? { ok: false, status: 404 } : { ok: true, status: 200, text: async () => TEXTO }));
    const { descargarTexto } = require(RUTA_GUTENBERG);
    const limpio = await descargarTexto(FICHA);
    expect(limpio.startsWith("Words of the story.")).toBe(true);
    expect(global.fetch.mock.calls.map((llamada) => llamada[0])).toEqual([
      "https://www.gutenberg.org/cache/epub/209/pg209.txt",
      "https://www.gutenberg.org/ebooks/209.txt.utf-8",
    ]);
  });

  test("si Gutenberg no contesta, no insiste con la otra dirección y avisa con 502", async () => {
    global.fetch = jest.fn(async () => {
      throw Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
    });
    const { descargarTexto } = require(RUTA_GUTENBERG);
    await expect(descargarTexto(FICHA)).rejects.toMatchObject({ status: 502 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("la primera página del catálogo queda lista al arrancar, sin esperar a que alguien la abra", () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ count: 1, next: null, results: [LIBRO] }) }));
    const { mantenerCatalogoListo } = require(RUTA_GUTENBERG);
    mantenerCatalogoListo();
    expect(global.fetch).not.toHaveBeenCalled();
    jest.advanceTimersByTime(5000);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toBe("https://gutendex.com/books/?languages=en&mime_type=text%2Fplain");
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test("si Gutendex no contesta, el error sale con 502 y no como un fallo cualquiera", async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const { obtenerFicha } = require(RUTA_GUTENBERG);
    await expect(obtenerFicha(209)).rejects.toMatchObject({ status: 502 });
  });
});

describe("narrador de partes", () => {
  test("pide razonar poco y repite una sola vez si el JSON llega roto", async () => {
    mockCrear.mockResolvedValueOnce(respuesta("{ roto")).mockResolvedValueOnce(respuesta(JSON.stringify(PARTE)));
    const { generarParteLibro } = require("../src/backend/src/services/iaContenido");
    const parte = await generarParteLibro(PEDIDO);
    expect(parte.lineas).toHaveLength(8);
    expect(parte.titulo).toBe("A story by the fire");
    expect(mockCrear).toHaveBeenCalledTimes(2);
    expect(mockCrear.mock.calls[0][0].reasoning_effort).toBe("low");
  });

  test("si salen muy pocas líneas, la pide otra vez con un mínimo y no insiste más", async () => {
    const corta = { ...PARTE, lineas: ["One.", "Two."], traducciones: ["Uno.", "Dos."] };
    mockCrear.mockResolvedValue(respuesta(JSON.stringify(corta)));
    const { generarParteLibro } = require("../src/backend/src/services/iaContenido");
    await expect(generarParteLibro(PEDIDO)).rejects.toThrow(/líneas suficientes/);
    expect(mockCrear).toHaveBeenCalledTimes(2);
    expect(mockCrear.mock.calls[1][0].messages[0].content).toMatch(/at least 8 lines/);
  });

  test("si el modelo no acepta el esfuerzo pedido, la parte se pide sin él", async () => {
    mockCrear
      .mockRejectedValueOnce(Object.assign(new Error("400 `reasoning_effort` is not supported with this model"), { status: 400 }))
      .mockResolvedValueOnce(respuesta(JSON.stringify(PARTE)));
    const { generarParteLibro } = require("../src/backend/src/services/iaContenido");
    const parte = await generarParteLibro(PEDIDO);
    expect(parte.lineas).toHaveLength(8);
    expect(mockCrear).toHaveBeenCalledTimes(2);
    expect(mockCrear.mock.calls[1][0].reasoning_effort).toBeUndefined();
  });

  test("un error de la IA con estado, como el cupo por minuto, no se repite", async () => {
    mockCrear.mockRejectedValue(Object.assign(new Error("Rate limit reached"), { status: 429 }));
    const { generarParteLibro } = require("../src/backend/src/services/iaContenido");
    await expect(generarParteLibro(PEDIDO)).rejects.toMatchObject({ status: 429 });
    expect(mockCrear).toHaveBeenCalledTimes(1);
  });
});
