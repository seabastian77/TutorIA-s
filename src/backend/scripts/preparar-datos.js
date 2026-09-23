// Arma los datos de CEFR-J y de Tatoeba que usa la app. Solo se corre cuando se quieren actualizar.
//
// Uso:  node scripts/preparar-datos.js <cefrj.csv> <sentences.tsv>
//   cefrj.csv      CEFR-J Wordlist 1.5 (http://www.cefr-j.org/download.html)
//   sentences.tsv  pares inglés-español de Tatoeba ya alineados
//                  (https://github.com/doozan/spanish_data, archivo sentences.tsv)
//
// Escribe src/data/cefrj.json y src/data/frases-tatoeba.json.

const fs = require("fs");
const path = require("path");

const [, , rutaCefr, rutaFrases] = process.argv;
if (!rutaCefr || !rutaFrases) {
  console.error("Uso: node scripts/preparar-datos.js <cefrj.csv> <sentences.tsv>");
  process.exit(1);
}

const DATOS = path.join(__dirname, "..", "src", "data");
const NIVELES = ["A1", "A2", "B1", "B2"];

// ── 1. CEFR-J: cada palabra con su nivel más bajo ──
function leerCsv(texto) {
  const filas = [];
  for (const linea of texto.split(/\r?\n/)) {
    if (!linea) continue;
    const celdas = [];
    let actual = "";
    let comillas = false;
    for (const c of linea) {
      if (c === '"') comillas = !comillas;
      else if (c === "," && !comillas) {
        celdas.push(actual);
        actual = "";
      } else actual += c;
    }
    celdas.push(actual);
    filas.push(celdas);
  }
  return filas;
}

const palabras = {};
for (const [headword, , nivel] of leerCsv(fs.readFileSync(rutaCefr, "utf8")).slice(1)) {
  if (!NIVELES.includes(nivel)) continue;
  for (const forma of headword.split("/")) {
    const p = forma.trim().toLowerCase();
    if (p && (!palabras[p] || NIVELES.indexOf(nivel) < NIVELES.indexOf(palabras[p]))) {
      palabras[p] = nivel;
    }
  }
}
const ordenadas = Object.fromEntries(Object.entries(palabras).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(
  path.join(DATOS, "cefrj.json"),
  JSON.stringify({
    fuente:
      "The CEFR-J Wordlist Version 1.5. Compiled by Yukio Tono, Tokyo University of Foreign Studies. Retrieved from http://www.cefr-j.org/download.html",
    palabras: ordenadas,
  }),
);
console.log(`CEFR-J: ${Object.keys(ordenadas).length} palabras`);

// El medidor se carga después de escribir la lista para usar la versión nueva
const { nivelDeFrase, palabrasDe, formasBase, baseDe } = require("../src/utils/cefr");

// ── 2. Tatoeba: solo frases de hablantes nativos, cortas y con todas sus palabras en CEFR-J ──
const ATRIBUCION = /#(\d+) \(([^)]+)\) & #(\d+) \(([^)]+)\)/;
const LARGO_DICTADO = { A1: [4, 8], A2: [5, 10], B1: [6, 12], B2: [7, 14] };
const POR_NIVEL = 600;

// Temas que no queremos en una app de estudio: violencia, muerte, drogas, sexo, insultos
const VETADAS = new Set(
  ("kill killer murder murderer suicide die dead death dying corpse gun pistol rifle shoot bomb " +
    "weapon knife stab strangle hang hanged blood bleed drug cocaine sex sexy naked nude rape " +
    "drunk alcohol beer wine vodka whisky cigarette smoke tobacco prison jail arrest crime criminal " +
    "steal thief rob robber war enemy torture poison hate stupid idiot fool ugly fat damn hell " +
    "god jesus church pray religion divorce pregnant abortion cliff grave funeral terrorist").split(" "),
);
const vetada = (en) => palabrasDe(en).some((p) => formasBase(p).some((f) => VETADAS.has(f)));

const vistas = new Set();
const candidatas = [];
for (const linea of fs.readFileSync(rutaFrases, "utf8").split("\n")) {
  const [en, es, atribucion, nivelEn, nivelEs] = linea.split("\t");
  if (!en || !es || !atribucion) continue;

  const m = atribucion.match(ATRIBUCION);
  if (!m) continue;
  const [, idEn, autorEn, idEs, autorEs] = m;

  const nativoEn = Number(nivelEn) >= 5 || autorEn === "CK";
  if (!nativoEn || Number(nivelEs) < 5) continue;

  // Sin números, comillas ni símbolos: deben poder leerse en voz alta sin ambigüedad
  if (!/^[A-Z][A-Za-z ,'’-]*[.?!]$/.test(en)) continue;
  if (vistas.has(en)) continue;

  const largo = en.split(/\s+/).length;
  if (largo < 3 || largo > 14) continue;

  const { nivel, desconocidas } = nivelDeFrase(en);
  if (desconocidas.length || vetada(en)) continue;

  vistas.add(en);
  candidatas.push({ en, es, nivel, largo, idEn, autorEn, idEs, autorEs });
}
console.log(`Tatoeba: ${candidatas.length} frases útiles`);

// Barajado fijo para que el archivo salga igual cada vez
let semilla = 20260923;
const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const barajar = (lista) => {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
};

// Dictado: el mismo número de frases por nivel, con el largo que le corresponde
const elegidas = new Map();
for (const nivel of NIVELES) {
  const [min, max] = LARGO_DICTADO[nivel];
  const grupo = barajar(candidatas.filter((f) => f.nivel === nivel && f.largo >= min && f.largo <= max));
  // Tatoeba está lleno de "Tom": se deja en una de cada cinco frases para que haya variedad
  const conNombre = grupo.filter((f) => /\b(Tom|Mary|John|Alice)\b/.test(f.en)).slice(0, POR_NIVEL / 5);
  const sinNombre = grupo.filter((f) => !/\b(Tom|Mary|John|Alice)\b/.test(f.en));
  for (const f of barajar([...conNombre, ...sinNombre.slice(0, POR_NIVEL - conNombre.length)])) {
    elegidas.set(f.en, { ...f, dictado: 1 });
  }
}

// Ejemplos: la frase más corta de su mismo nivel para cada palabra de la lista
const mejorPorPalabra = new Map();
for (const f of candidatas) {
  if (f.largo > 10) continue;
  for (const p of new Set(palabrasDe(f.en))) {
    const base = baseDe(p);
    if (!base) continue;
    const distancia = Math.abs(NIVELES.indexOf(f.nivel) - NIVELES.indexOf(ordenadas[base]));
    const puntaje = distancia * 20 + f.largo;
    const actual = mejorPorPalabra.get(base);
    if (!actual || puntaje < actual.puntaje) mejorPorPalabra.set(base, { f, puntaje });
  }
}
for (const { f } of mejorPorPalabra.values()) {
  if (!elegidas.has(f.en)) elegidas.set(f.en, { ...f, dictado: 0 });
}

const frases = [...elegidas.values()]
  .sort((a, b) => Number(a.idEn) - Number(b.idEn))
  .map((f) => [f.en, f.es, f.nivel, f.dictado, Number(f.idEn), f.autorEn, Number(f.idEs), f.autorEs]);

fs.writeFileSync(
  path.join(DATOS, "frases-tatoeba.json"),
  JSON.stringify({
    fuente: "Tatoeba (https://tatoeba.org), licencia CC BY 2.0 FR (https://creativecommons.org/licenses/by/2.0/fr/)",
    columnas: ["ingles", "espanol", "nivel", "dictado", "idIngles", "autorIngles", "idEspanol", "autorEspanol"],
    frases,
  }),
);

const conteo = {};
for (const f of frases) conteo[`${f[2]}${f[3] ? " dictado" : ""}`] = (conteo[`${f[2]}${f[3] ? " dictado" : ""}`] || 0) + 1;
console.log(`Guardadas ${frases.length} frases`, conteo);
console.log(`Palabras con ejemplo: ${mejorPorPalabra.size}`);
