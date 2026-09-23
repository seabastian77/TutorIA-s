// Nivel MCER de palabras y frases con la lista CEFR-J (Tono, 2020), que va de A1 a B2

const { palabras: LISTA } = require("../data/cefrj.json");

const NIVELES = ["A1", "A2", "B1", "B2"];

// Formas irregulares que la lista guarda solo en su forma base
const IRREGULARES = {
  am: "be", are: "be", is: "be", was: "be", were: "be", been: "be", being: "be",
  has: "have", had: "have", does: "do", did: "do", done: "do",
  went: "go", gone: "go", saw: "see", seen: "see", took: "take", taken: "take",
  got: "get", gotten: "get", made: "make", said: "say", came: "come",
  knew: "know", known: "know", thought: "think", told: "tell", gave: "give",
  given: "give", found: "find", left: "leave", felt: "feel", bought: "buy",
  brought: "bring", ate: "eat", eaten: "eat", wrote: "write", written: "write",
  spoke: "speak", spoken: "speak", ran: "run", sat: "sit", stood: "stand",
  kept: "keep", slept: "sleep", met: "meet", paid: "pay", sold: "sell",
  sent: "send", spent: "spend", built: "build", began: "begin", begun: "begin",
  drank: "drink", drunk: "drink", drove: "drive", driven: "drive",
  broke: "break", broken: "break", chose: "choose", chosen: "choose",
  forgot: "forget", forgotten: "forget", heard: "hear", held: "hold",
  lost: "lose", meant: "mean", taught: "teach", understood: "understand",
  won: "win", wore: "wear", worn: "wear", fell: "fall", fallen: "fall",
  flew: "fly", flown: "fly", grew: "grow", grown: "grow", hid: "hide",
  hidden: "hide", led: "lead", lent: "lend", lay: "lie", rode: "ride",
  ridden: "ride", rang: "ring", rung: "ring", rose: "rise", risen: "rise",
  sang: "sing", sung: "sing", sank: "sink", swam: "swim", swum: "swim",
  threw: "throw", thrown: "throw", woke: "wake", woken: "wake",
  caught: "catch", fought: "fight", fed: "feed", shot: "shoot",
  shook: "shake", stole: "steal", stolen: "steal", struck: "strike",
  swore: "swear", tore: "tear", torn: "tear",
  bit: "bite", bitten: "bite", blew: "blow", blown: "blow", drew: "draw",
  drawn: "draw", froze: "freeze", frozen: "freeze", forgave: "forgive",
  forgiven: "forgive", hung: "hang", dug: "dig", slid: "slide", spun: "spin",
  stuck: "stick", fled: "flee", sought: "seek", bent: "bend", bled: "bleed",
  bred: "breed", dealt: "deal", dreamt: "dream", learnt: "learn",
  burnt: "burn", smelt: "smell", spelt: "spell", spilt: "spill",
  children: "child", men: "man", women: "woman", people: "person",
  feet: "foot", teeth: "tooth", mice: "mouse", geese: "goose", lives: "life",
  wives: "wife", knives: "knife", leaves: "leaf", wolves: "wolf",
  halves: "half", shelves: "shelf", thieves: "thief",
  better: "good", best: "good", worse: "bad", worst: "bad",
  further: "far", farther: "far", furthest: "far", farthest: "far",
  mine: "my", yours: "your", hers: "her", ours: "our", theirs: "their",
  myself: "my", yourself: "your", himself: "him", herself: "her",
  itself: "it", ourselves: "our", yourselves: "your", themselves: "them",
  "won't": "will", "can't": "can", "shan't": "shall", cannot: "can",
};

// Nombres muy repetidos en Tatoeba; se aceptan como A1 porque no son vocabulario que aprender
const NOMBRES = new Set(["tom", "mary", "john", "alice"]);

/** Formas base posibles de una palabra ya en minúscula, de la más probable a la menos. */
function formasBase(p) {
  const f = [p];
  if (IRREGULARES[p]) f.push(IRREGULARES[p]);
  const quitar = (sufijo, extra = "") =>
    p.length > sufijo.length + 1 && p.endsWith(sufijo) ? p.slice(0, -sufijo.length) + extra : null;

  const doble = (raiz) =>
    raiz && raiz.length > 2 && raiz.at(-1) === raiz.at(-2) ? raiz.slice(0, -1) : null;

  const candidatas = [
    // El orden importa: "cares" es "care" antes que "car", y "used" es "use" antes que "us"
    quitar("s"), quitar("es"), quitar("ies", "y"),
    quitar("d"), quitar("ed"), quitar("ied", "y"), doble(quitar("ed")),
    quitar("ing", "e"), quitar("ing"), doble(quitar("ing")),
    quitar("r"), quitar("er"), quitar("ier", "y"), doble(quitar("er")),
    quitar("st"), quitar("est"), quitar("iest", "y"), doble(quitar("est")),
    quitar("ily", "y"), quitar("ly"), quitar("ally"),
  ];
  for (const c of candidatas) if (c && !f.includes(c)) f.push(c);
  return f;
}

/** La forma de diccionario de una palabra suelta ("studies" -> "study"), o null si no está en la lista. */
function baseDe(palabra) {
  const p = String(palabra || "").trim().toLowerCase();
  return formasBase(p).find((f) => LISTA[f]) || null;
}

/** Nivel de una palabra o expresión ("alarm clock"), o null si no está en la lista. */
function nivelDePalabra(palabra) {
  if (!palabra) return null;
  const p = String(palabra).trim().toLowerCase().replace(/[’`]/g, "'");
  if (!p) return null;
  if (LISTA[p]) return LISTA[p];

  // Expresiones de varias palabras: si no está entera, se mide por su palabra más difícil
  const partes = p.split(/\s+/);
  if (partes.length > 1) {
    const r = nivelDeFrase(p);
    return r.desconocidas.length ? null : r.nivel;
  }

  const base = baseDe(p);
  return base ? LISTA[base] : null;
}

/** Separa una frase en palabras, quitando contracciones ("don't" -> "do", "Tom's" -> "tom"). */
function palabrasDe(texto) {
  const crudas = String(texto || "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .match(/[a-z]+(?:'[a-z]+)*/g) || [];

  const salida = [];
  for (const cruda of crudas) {
    if (IRREGULARES[cruda]) {
      salida.push(IRREGULARES[cruda]);
      continue;
    }
    const base = cruda.replace(/n't$/, "").replace(/'(s|re|m|ll|ve|d)$/, "");
    if (base) salida.push(base);
  }
  return salida;
}

/** Nivel de una frase: el de su palabra más difícil, y las palabras que la lista no conoce. */
function nivelDeFrase(texto) {
  let indice = 0;
  const desconocidas = [];
  for (const p of palabrasDe(texto)) {
    if (NOMBRES.has(p)) continue;
    // Se toma la forma más fácil: "learning" en una frase suele ser el verbo "learn", no el sustantivo B2
    const niveles = formasBase(p).map((f) => LISTA[f]).filter(Boolean).map((n) => NIVELES.indexOf(n));
    if (!niveles.length) desconocidas.push(p);
    else indice = Math.max(indice, Math.min(...niveles));
  }
  return { nivel: NIVELES[indice], desconocidas };
}

module.exports = { NIVELES, formasBase, baseDe, nivelDePalabra, palabrasDe, nivelDeFrase };
