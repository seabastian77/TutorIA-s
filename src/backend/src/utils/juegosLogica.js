// Lógica de los minijuegos, sin dependencias de base de datos ni IA

const DIRECCIONES = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Devuelve una copia de la lista en orden aleatorio. */
function barajar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Deja la palabra en mayúsculas y sin nada que no sea una letra. */
function limpiarPalabra(texto) {
  return (texto || "").toUpperCase().replace(/[^A-Z]/g, "");
}

/** Calcula el estado del ahorcado a partir de las letras que ya se probaron. */
function estadoAhorcado(palabra, letrasUsadas, maxErrores = 6) {
  const objetivo = limpiarPalabra(palabra);
  const usadas = (letrasUsadas || []).map((l) => (l || "").toUpperCase());

  const mascara = [...objetivo].map((letra) =>
    usadas.includes(letra) ? letra : null,
  );

  const errores = usadas.filter((letra) => !objetivo.includes(letra)).length;
  const restantes = Math.max(maxErrores - errores, 0);
  const completa = objetivo.length > 0 && mascara.every((l) => l !== null);

  return {
    mascara,
    errores,
    restantes,
    estado: completa ? "ganada" : restantes === 0 ? "perdida" : "jugando",
  };
}

/** Elige al azar una letra de la palabra que todavía no se ha descubierto. */
function letraParaRevelar(palabra, letrasUsadas) {
  const objetivo = limpiarPalabra(palabra);
  const usadas = (letrasUsadas || []).map((l) => (l || "").toUpperCase());
  const ocultas = [...new Set([...objetivo])].filter((l) => !usadas.includes(l));
  if (ocultas.length === 0) return null;
  return ocultas[Math.floor(Math.random() * ocultas.length)];
}

/** Comprueba si la palabra cabe en esa posición sin chocar con otra distinta. */
function cabe(letras, palabra, fila, columna, df, dc) {
  const tamano = letras.length;

  for (let i = 0; i < palabra.length; i++) {
    const f = fila + df * i;
    const c = columna + dc * i;
    if (f < 0 || c < 0 || f >= tamano || c >= tamano) return false;
    if (letras[f][c] !== "" && letras[f][c] !== palabra[i]) return false;
  }

  return true;
}

/** Prueba posiciones al azar hasta encontrar una donde la palabra quepa. */
function colocarPalabra(letras, palabra, intentos = 120) {
  const tamano = letras.length;

  for (let intento = 0; intento < intentos; intento++) {
    const [df, dc] = DIRECCIONES[Math.floor(Math.random() * DIRECCIONES.length)];
    const fila = Math.floor(Math.random() * tamano);
    const columna = Math.floor(Math.random() * tamano);

    if (!cabe(letras, palabra, fila, columna, df, dc)) continue;

    for (let i = 0; i < palabra.length; i++) {
      letras[fila + df * i][columna + dc * i] = palabra[i];
    }
    return { fila, columna, df, dc };
  }

  return null;
}

/** Arma la sopa de letras y devuelve dónde quedó cada palabra. */
function crearSopa(palabras, tamano = 10) {
  const letras = Array.from({ length: tamano }, () =>
    new Array(tamano).fill(""),
  );
  const colocadas = [];

  // Las más largas primero: son las que menos sitios tienen donde caber
  const ordenadas = palabras
    .map(limpiarPalabra)
    .filter((p) => p.length >= 3 && p.length <= tamano)
    .sort((a, b) => b.length - a.length);

  ordenadas.forEach((palabra) => {
    if (colocadas.some((c) => c.palabra === palabra)) return;
    const puesta = colocarPalabra(letras, palabra);
    if (puesta) colocadas.push({ palabra, ...puesta });
  });

  for (let f = 0; f < tamano; f++) {
    for (let c = 0; c < tamano; c++) {
      if (letras[f][c] === "") {
        letras[f][c] = ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
      }
    }
  }

  return { letras, colocadas };
}

/** Lee las letras que hay entre dos casillas, o null si no forman una recta. */
function leerSegmento(letras, fila, columna, filaFin, columnaFin) {
  const saltoF = filaFin - fila;
  const saltoC = columnaFin - columna;
  const largoF = Math.abs(saltoF);
  const largoC = Math.abs(saltoC);

  if (largoF !== 0 && largoC !== 0 && largoF !== largoC) return null;

  const pasos = Math.max(largoF, largoC);
  const df = Math.sign(saltoF);
  const dc = Math.sign(saltoC);
  let texto = "";

  for (let i = 0; i <= pasos; i++) {
    const f = fila + df * i;
    const c = columna + dc * i;
    if (!letras[f] || letras[f][c] === undefined) return null;
    texto += letras[f][c];
  }

  return texto;
}

/** Dice si la selección del jugador cae justo sobre una palabra colocada. */
function coincideColocada(colocada, fila, columna, filaFin, columnaFin) {
  const ultimo = colocada.palabra.length - 1;
  const finF = colocada.fila + colocada.df * ultimo;
  const finC = colocada.columna + colocada.dc * ultimo;

  const empiezaIgual = colocada.fila === fila && colocada.columna === columna;
  const terminaIgual = finF === filaFin && finC === columnaFin;
  const alReves = finF === fila && finC === columna;
  const empiezaAlReves =
    colocada.fila === filaFin && colocada.columna === columnaFin;

  return (empiezaIgual && terminaIgual) || (alReves && empiezaAlReves);
}

/** Devuelve todas las casillas que ocupa una palabra ya colocada. */
function casillasDe(colocada) {
  return [...colocada.palabra].map((_, i) => ({
    fila: colocada.fila + colocada.df * i,
    columna: colocada.columna + colocada.dc * i,
  }));
}

module.exports = {
  DIRECCIONES,
  barajar,
  limpiarPalabra,
  estadoAhorcado,
  letraParaRevelar,
  crearSopa,
  leerSegmento,
  coincideColocada,
  casillasDe,
};
