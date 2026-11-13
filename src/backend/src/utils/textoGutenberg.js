// Prepara los libros de Project Gutenberg: quién es dominio público en Colombia, nombres, texto limpio y partes para leer

const ANIOS_PROTECCION = 80; // Ley 23 de 1982: la vida del autor y 80 años más
const PALABRAS_OBJETIVO = 1300;
const PALABRAS_MINIMAS = 450;
const PALABRAS_MAXIMAS = 1900;
const MAX_PARTES = 200;

/** Un libro es de dominio público en Colombia si todos sus autores y traductores murieron hace más de 80 años. */
function esDominioPublicoColombia(libro, anio = new Date().getFullYear()) {
  const autores = Array.isArray(libro && libro.authors) ? libro.authors : [];
  const traductores = Array.isArray(libro && libro.translators) ? libro.translators : [];
  if (!autores.length) return false;
  const limite = anio - ANIOS_PROTECCION - 1;
  return [...autores, ...traductores].every((p) => p && Number.isInteger(p.death_year) && p.death_year <= limite);
}

/** "Shelley, Mary Wollstonecraft" pasa a "Mary Wollstonecraft Shelley", sin lo que va entre paréntesis. */
function nombreAutor(nombre) {
  const limpio = String(nombre || "").replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  const partes = limpio.split(", ");
  if (partes.length < 2) return limpio;
  const [apellido, ...resto] = partes;
  return `${resto.join(" ")} ${apellido}`.replace(/\s+/g, " ").trim();
}

/** El título sin subtítulos: lo que va antes del primer punto y coma, dos puntos o salto de línea. */
function tituloCorto(titulo) {
  const primero = String(titulo || "").split(/[;:\r\n]/)[0].replace(/\s+/g, " ").trim();
  return primero.length > 90 ? `${primero.slice(0, 87).trim()}...` : primero;
}

/** La mejor versión en texto plano que ofrece Gutenberg: primero la UTF-8 y nunca un zip. */
function urlDeTexto(formatos) {
  const claves = Object.keys(formatos || {}).filter((k) => k.startsWith("text/plain") && !/\.zip$/i.test(formatos[k]));
  const utf8 = claves.find((k) => /utf-8/i.test(k));
  return utf8 ? formatos[utf8] : claves.length ? formatos[claves[0]] : null;
}

/** Deja un resultado de Gutendex listo para el estante, o null si no sirve: sin texto, sin inglés o protegido. */
function normalizarResultado(libro, anio) {
  if (!libro || !Number.isInteger(libro.id)) return null;
  if (!Array.isArray(libro.languages) || !libro.languages.includes("en")) return null;
  if (libro.media_type && libro.media_type !== "Text") return null;
  if (libro.copyright === true || !esDominioPublicoColombia(libro, anio)) return null;
  const textoUrl = urlDeTexto(libro.formats);
  const titulo = tituloCorto(libro.title);
  if (!textoUrl || !titulo) return null;
  const portada = libro.formats && typeof libro.formats["image/jpeg"] === "string" ? libro.formats["image/jpeg"] : null;
  return {
    id: `pg${libro.id}`,
    gutenbergId: libro.id,
    titulo,
    autor: libro.authors.map((a) => nombreAutor(a.name)).filter(Boolean).slice(0, 2).join(" & "),
    portada: portada && /^https:\/\/www\.gutenberg\.org\//.test(portada) ? portada : null,
    textoUrl,
  };
}

/** Quita el encabezado y la licencia de Gutenberg, las marcas de página, las ilustraciones y las cursivas. */
function limpiarTextoGutenberg(crudo) {
  let texto = String(crudo || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const inicio = texto.search(/\*{3}\s*START OF (THE|THIS) PROJECT GUTENBERG E(BOOK|TEXT)[^\n]*/i);
  if (inicio >= 0) texto = texto.slice(texto.indexOf("\n", inicio) + 1);
  const fin = texto.search(/\*{3}\s*END OF (THE|THIS) PROJECT GUTENBERG E(BOOK|TEXT)/i);
  if (fin >= 0) texto = texto.slice(0, fin);
  return texto
    .replace(/\[(Illustration|Ilustration)[^\]]*\]/gi, "")
    .replace(/\[(Pg|Page)\s*[\divxlc]+\]/gi, "")
    .replace(/\[\d{1,3}\]/g, "")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const NUMEROS = "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|last";
const ENCABEZADO = new RegExp(`^(chapter|chap\\.|book|part|stave|adventure|letter|canto)\\s+([0-9]+|[ivxlcdm]+|(the\\s+)?(${NUMEROS})([\\s-][a-z]+)?)\\b`, "i");
const NUMERAL_SOLO = /^([IVXLC]{1,7}|[0-9]{1,3})\.?$/;
const NUMERAL_CON_TITULO = /^[IVXLC]{1,7}\.\s+[A-Z][A-Z0-9'’,.!?\- ]{2,70}$/;

/** Dice si un párrafo corto es el título de un capítulo. */
function esEncabezado(parrafo) {
  if (parrafo.length > 110) return false;
  return ENCABEZADO.test(parrafo) || NUMERAL_SOLO.test(parrafo) || NUMERAL_CON_TITULO.test(parrafo);
}

/** Deja con mayúscula inicial las palabras escritas en mayúsculas, sin tocar los números romanos. */
function tituloLegible(texto) {
  const t = texto.replace(/\s+/g, " ").replace(/[.:]\s*$/, "").trim();
  return t
    .split(" ")
    .map((p) => (/^[IVXLCDM]+[.,]?$/.test(p) || !/^[A-Z][A-Z'’-]+[.,:!?]?$/.test(p) ? p : p.charAt(0) + p.slice(1).toLowerCase()))
    .join(" ");
}

const contarPalabras = (texto) => (texto.match(/\S+/g) || []).length;

/** Reparte párrafos en trozos de tamaño parecido, sin pasarse del máximo. */
function repartir(parrafos, maximo, objetivo) {
  const total = parrafos.reduce((n, p) => n + p.palabras, 0);
  const trozos = Math.max(1, Math.ceil(total / objetivo));
  const meta = total / trozos;
  const salida = [];
  let actual = [];
  let cuenta = 0;
  parrafos.forEach((p) => {
    if (actual.length && (cuenta + p.palabras > maximo || (cuenta >= meta && salida.length < trozos - 1))) {
      salida.push(actual);
      actual = [];
      cuenta = 0;
    }
    actual.push(p);
    cuenta += p.palabras;
  });
  if (actual.length) salida.push(actual);
  return salida;
}

/** Corta un párrafo muy largo en frases para que ninguna parte se pase del máximo. */
function partirParrafoLargo(p, maximo) {
  if (p.palabras <= maximo) return [p];
  const frases = p.texto.match(/[^.!?]+[.!?]+["'’”)]*\s*|[^.!?]+$/g) || [p.texto];
  return repartir(frases.map((f) => ({ texto: f.trim(), palabras: contarPalabras(f) })), maximo, maximo).map((grupo) => {
    const texto = grupo.map((f) => f.texto).join(" ");
    return { texto, palabras: contarPalabras(texto) };
  });
}

/** Divide el libro en partes para leer: sigue sus capítulos cuando los tiene y si no, corta por párrafos. */
function partirEnPartes(texto, opciones = {}) {
  const { objetivo = PALABRAS_OBJETIVO, minimo = PALABRAS_MINIMAS, maximo = PALABRAS_MAXIMAS, maxPartes = MAX_PARTES } = opciones;
  const parrafos = String(texto || "")
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

  const secciones = [];
  let actual = { titulo: null, parrafos: [] };
  for (let i = 0; i < parrafos.length; i += 1) {
    const p = parrafos[i];
    if (esEncabezado(p)) {
      secciones.push(actual);
      let titulo = p;
      const siguiente = parrafos[i + 1];
      if (siguiente && siguiente.length <= 70 && !/[.!?,;]["'’”]?$/.test(siguiente) && !esEncabezado(siguiente)) {
        titulo = `${p.replace(/[.:]\s*$/, "")}. ${siguiente}`;
        i += 1;
      }
      actual = { titulo: tituloLegible(titulo), parrafos: [] };
    } else {
      actual.parrafos.push({ texto: p, palabras: contarPalabras(p) });
    }
  }
  secciones.push(actual);

  const palabrasDe = (s) => s.parrafos.reduce((n, p) => n + p.palabras, 0);
  const conCapitulos = secciones.filter((s) => s.titulo && palabrasDe(s) >= 150).length >= 2;
  let bloques;
  if (conCapitulos) {
    // Lo que va antes del primer capítulo (portada, índice, prólogos de editores) no se lee
    bloques = secciones.filter((s) => s.titulo);
  } else {
    const todos = secciones.flatMap((s) => s.parrafos);
    const arranque = todos.findIndex((p) => p.palabras >= 40);
    bloques = [{ titulo: null, parrafos: arranque >= 0 ? todos.slice(arranque) : todos }];
  }

  // Los capítulos muy cortos se juntan con el siguiente y los muy largos se reparten
  const juntos = [];
  let pendiente = null;
  bloques.forEach((b) => {
    const unido = pendiente ? { titulo: pendiente.titulo, parrafos: [...pendiente.parrafos, ...b.parrafos] } : b;
    if (palabrasDe(unido) < minimo) pendiente = unido;
    else {
      juntos.push(unido);
      pendiente = null;
    }
  });
  if (pendiente && palabrasDe(pendiente) > 0) {
    if (juntos.length) juntos[juntos.length - 1].parrafos.push(...pendiente.parrafos);
    else juntos.push(pendiente);
  }

  const partes = [];
  juntos.forEach((b) => {
    const parrafosB = b.parrafos.flatMap((p) => partirParrafoLargo(p, maximo));
    const grupos = palabrasDe({ parrafos: parrafosB }) > maximo ? repartir(parrafosB, maximo, objetivo) : [parrafosB];
    grupos.forEach((g, i) => {
      const titulo = b.titulo ? (grupos.length > 1 ? `${b.titulo} (${i + 1}/${grupos.length})` : b.titulo) : null;
      const textoParte = g.map((p) => p.texto).join("\n\n");
      partes.push({ titulo: titulo ? titulo.slice(0, 110) : null, texto: textoParte, palabras: contarPalabras(textoParte) });
    });
  });
  return partes.filter((p) => p.palabras > 0).slice(0, maxPartes);
}

module.exports = {
  esDominioPublicoColombia,
  nombreAutor,
  tituloCorto,
  urlDeTexto,
  normalizarResultado,
  limpiarTextoGutenberg,
  esEncabezado,
  partirEnPartes,
  PALABRAS_MAXIMAS,
};
