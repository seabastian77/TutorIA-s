// Libros de Project Gutenberg: dominio público en Colombia, limpieza del texto y partes para leer
const {
  esDominioPublicoColombia,
  nombreAutor,
  tituloCorto,
  normalizarResultado,
  limpiarTextoGutenberg,
  esEncabezado,
  partirEnPartes,
  PALABRAS_MAXIMAS,
} = require("../src/backend/src/utils/textoGutenberg");

const frase = (n) => Array.from({ length: n }, (_, i) => `Alice looked at the garden number ${i} and smiled.`).join(" ");
const parrafos = (cuantos, frases) => Array.from({ length: cuantos }, () => frase(frases)).join("\n\n");

function libroGutendex(cambios = {}) {
  return {
    id: 11,
    title: "Alice's Adventures in Wonderland",
    authors: [{ name: "Carroll, Lewis", birth_year: 1832, death_year: 1898 }],
    translators: [],
    languages: ["en"],
    copyright: false,
    media_type: "Text",
    formats: {
      "text/plain; charset=us-ascii": "https://www.gutenberg.org/ebooks/11.txt.utf-8",
      "image/jpeg": "https://www.gutenberg.org/cache/epub/11/pg11.cover.medium.jpg",
      "application/octet-stream": "https://www.gutenberg.org/cache/epub/11/pg11-h.zip",
    },
    download_count: 50000,
    ...cambios,
  };
}

describe("dominio público en Colombia", () => {
  test("un autor muerto hace más de 80 años está libre; uno reciente no", () => {
    expect(esDominioPublicoColombia(libroGutendex(), 2026)).toBe(true);
    const reciente = libroGutendex({ authors: [{ name: "Orwell, George", birth_year: 1903, death_year: 1950 }] });
    expect(esDominioPublicoColombia(reciente, 2026)).toBe(false);
  });

  test("la cuenta corre desde el año siguiente a la muerte", () => {
    const libro = libroGutendex({ authors: [{ name: "X", death_year: 1945 }] });
    expect(esDominioPublicoColombia(libro, 2026)).toBe(true);
    expect(esDominioPublicoColombia(libro, 2025)).toBe(false);
  });

  test("sin autor conocido, sin fecha de muerte o con traductor reciente no se ofrece", () => {
    expect(esDominioPublicoColombia(libroGutendex({ authors: [] }), 2026)).toBe(false);
    expect(esDominioPublicoColombia(libroGutendex({ authors: [{ name: "Anonymous", death_year: null }] }), 2026)).toBe(false);
    const traducido = libroGutendex({ translators: [{ name: "Y", death_year: 1990 }] });
    expect(esDominioPublicoColombia(traducido, 2026)).toBe(false);
  });
});

describe("ficha del libro", () => {
  test("ordena el nombre del autor y corta el subtítulo", () => {
    expect(nombreAutor("Shelley, Mary Wollstonecraft")).toBe("Mary Wollstonecraft Shelley");
    expect(nombreAutor("Andersen, H. C. (Hans Christian)")).toBe("H. C. Andersen");
    expect(nombreAutor("Homer")).toBe("Homer");
    expect(tituloCorto("Frankenstein; Or, The Modern Prometheus")).toBe("Frankenstein");
    expect(tituloCorto("Dracula\r\nA Novel")).toBe("Dracula");
  });

  test("un resultado de Gutendex queda listo para el estante", () => {
    expect(normalizarResultado(libroGutendex(), 2026)).toEqual({
      id: "pg11",
      gutenbergId: 11,
      titulo: "Alice's Adventures in Wonderland",
      autor: "Lewis Carroll",
      portada: "https://www.gutenberg.org/cache/epub/11/pg11.cover.medium.jpg",
      textoUrl: "https://www.gutenberg.org/ebooks/11.txt.utf-8",
    });
  });

  test("descarta lo que no es texto en inglés, lo protegido y lo que no trae texto plano", () => {
    expect(normalizarResultado(libroGutendex({ languages: ["fr"] }), 2026)).toBeNull();
    expect(normalizarResultado(libroGutendex({ copyright: true }), 2026)).toBeNull();
    expect(normalizarResultado(libroGutendex({ media_type: "Sound" }), 2026)).toBeNull();
    expect(normalizarResultado(libroGutendex({ formats: { "text/html": "https://x" } }), 2026)).toBeNull();
  });

  test("una portada que no viene de Gutenberg no se usa", () => {
    const libro = libroGutendex({ formats: { "text/plain": "https://www.gutenberg.org/ebooks/11.txt.utf-8", "image/jpeg": "https://otro.sitio/x.jpg" } });
    expect(normalizarResultado(libro, 2026).portada).toBeNull();
  });
});

describe("texto del libro", () => {
  const ejemplo = [
    "﻿The Project Gutenberg eBook of Alice's Adventures in Wonderland",
    "This eBook is for the use of anyone anywhere.",
    "*** START OF THE PROJECT GUTENBERG EBOOK ALICE'S ADVENTURES IN WONDERLAND ***",
    "",
    "[Illustration]",
    "",
    "Alice's Adventures in Wonderland",
    "",
    "by Lewis Carroll",
    "",
    "Contents",
    "",
    " CHAPTER I.     Down the Rabbit-Hole",
    "",
    " CHAPTER II.    The Pool of Tears",
    "",
    "CHAPTER I.",
    "Down the Rabbit-Hole",
    "",
    parrafos(8, 12),
    "",
    "CHAPTER II.",
    "The Pool of Tears",
    "",
    parrafos(30, 12),
    "",
    "CHAPTER III.",
    "A Caucus-Race",
    "",
    parrafos(2, 10),
    "",
    "*** END OF THE PROJECT GUTENBERG EBOOK ALICE'S ADVENTURES IN WONDERLAND ***",
    "Section 1. General Terms of Use...",
  ].join("\r\n");

  test("quita la licencia, las ilustraciones y las cursivas", () => {
    const limpio = limpiarTextoGutenberg(`${ejemplo}\r\nShe was _very_ tired [Pg 12] and sad.[1]`);
    expect(limpio.startsWith("Alice's Adventures in Wonderland")).toBe(true);
    expect(limpio).not.toMatch(/PROJECT GUTENBERG|\[Illustration\]|General Terms/);
    expect(limpiarTextoGutenberg("She was _very_ tired [Pg 12] and sad.[1]")).toBe("She was very tired  and sad.");
  });

  test("reconoce títulos de capítulo y no confunde frases normales", () => {
    expect(esEncabezado("CHAPTER I.")).toBe(true);
    expect(esEncabezado("Chapter the First")).toBe(true);
    expect(esEncabezado("STAVE ONE")).toBe(true);
    expect(esEncabezado("XII.")).toBe(true);
    expect(esEncabezado("I. A SCANDAL IN BOHEMIA")).toBe(true);
    expect(esEncabezado("I went to the market.")).toBe(false);
    expect(esEncabezado("Letter from the editor, who wrote at length about the weather and many other things that day.")).toBe(false);
  });

  test("sigue los capítulos: salta el índice, junta los cortos y reparte los largos", () => {
    const partes = partirEnPartes(limpiarTextoGutenberg(ejemplo));
    expect(partes[0].titulo).toBe("Chapter I. Down the Rabbit-Hole");
    expect(partes[0].texto).not.toMatch(/Contents|by Lewis Carroll/);
    const segundo = partes.filter((p) => /^Chapter II\./.test(p.titulo));
    expect(segundo.length).toBeGreaterThan(1);
    expect(segundo[0].titulo).toMatch(/\(1\/\d\)$/);
    partes.forEach((p) => expect(p.palabras).toBeLessThanOrEqual(PALABRAS_MAXIMAS));
    // El capítulo III es muy corto y queda pegado al final del anterior
    expect(partes.some((p) => /^Chapter III/.test(p.titulo || ""))).toBe(false);
    // No se pierde ni una palabra de los tres capítulos (9 palabras por frase)
    const total = partes.reduce((n, p) => n + p.palabras, 0);
    expect(total).toBe((8 * 12 + 30 * 12 + 2 * 10) * 9);
  });

  test("un texto sin capítulos se corta por párrafos en partes parecidas", () => {
    const partes = partirEnPartes(`A Short Essay\n\nby Someone\n\n${parrafos(40, 10)}`);
    expect(partes.length).toBeGreaterThan(2);
    expect(partes[0].titulo).toBeNull();
    expect(partes[0].texto.startsWith("Alice looked")).toBe(true);
    partes.forEach((p) => expect(p.palabras).toBeLessThanOrEqual(PALABRAS_MAXIMAS));
  });

  test("un párrafo larguísimo se parte por frases y el total de partes tiene tope", () => {
    const partes = partirEnPartes(frase(600));
    expect(partes.length).toBeGreaterThan(2);
    partes.forEach((p) => expect(p.palabras).toBeLessThanOrEqual(PALABRAS_MAXIMAS));
    expect(partirEnPartes(parrafos(400, 30), { maxPartes: 5 })).toHaveLength(5);
    expect(partirEnPartes("")).toEqual([]);
  });
});
