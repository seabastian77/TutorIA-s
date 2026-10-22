// Cálculos de la sincronía de labios del avatar: volumen, forma de la boca y audio para el proveedor de video

/** Volumen (RMS) de un bloque de muestras de audio entre -1 y 1. */
function nivelDesdeMuestras(muestras) {
  if (!muestras || !muestras.length) return 0;
  let suma = 0;
  for (let i = 0; i < muestras.length; i += 1) suma += muestras[i] * muestras[i];
  return Math.sqrt(suma / muestras.length);
}

/** Convierte el volumen en qué tan abierta va la boca (0 cerrada, 1 abierta del todo). */
function aperturaDesdeNivel(nivel, { ruido = 0.012, techo = 0.22 } = {}) {
  if (!(nivel > ruido)) return 0;
  const x = Math.min(1, (nivel - ruido) / (techo - ruido));
  return Math.pow(x, 0.7); // las sílabas suaves también mueven la boca
}

/** Acerca un valor a su objetivo: rápido al abrir la boca y más lento al cerrarla, como al hablar. */
function suavizar(actual, objetivo, subida = 0.55, bajada = 0.25) {
  const k = objetivo > actual ? subida : bajada;
  return actual + (objetivo - actual) * k;
}

/** Qué tan estirada va la boca: los sonidos agudos (i, e, s) la estiran y los graves (o, u) la redondean. */
function anchuraDesdeEspectro(bins, frecuenciaMuestreo, tamanoFft) {
  if (!bins || !bins.length) return 0.5;
  const hzPorBin = frecuenciaMuestreo / tamanoFft;
  let graves = 0;
  let agudos = 0;
  for (let i = 0; i < bins.length; i += 1) {
    const hz = i * hzPorBin;
    if (hz >= 250 && hz < 1000) graves += bins[i];
    else if (hz >= 2000 && hz < 5000) agudos += bins[i];
  }
  if (graves + agudos === 0) return 0.5;
  return Math.max(0, Math.min(1, (agudos / (graves + agudos)) * 1.8));
}

/** Sílabas aproximadas de una palabra en inglés, contando grupos de vocales. */
function silabasDePalabra(palabra) {
  const p = String(palabra || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!p) return 0;
  const grupos = p.replace(/e$/, "").match(/[aeiouy]+/g);
  return Math.max(1, grupos ? grupos.length : 1);
}

/** Total de sílabas de un texto; sirve para estimar cuánto dura cuando no hay audio que medir. */
function silabasDe(texto) {
  return String(texto || "").split(/\s+/).reduce((n, p) => n + silabasDePalabra(p), 0);
}

/** Duración estimada de un texto leído en voz alta, en milisegundos. */
function duracionEstimada(texto, velocidad = 1) {
  return Math.round((silabasDe(texto) * 210 + 400) / Math.max(0.5, velocidad));
}

/** Apertura de la boca en un instante cuando solo se sabe que está hablando (voz del navegador). */
function aperturaSintetica(ms, semilla = 0) {
  const silaba = (ms + semilla) / 190;
  const golpe = Math.abs(Math.sin(silaba * Math.PI));
  const variacion = 0.65 + 0.35 * Math.sin(silaba * 0.37 + semilla);
  return golpe * variacion;
}

const r = (n) => Math.round(n * 10) / 10;

/**
 * Forma de la boca centrada en (0, 0) para pintarla en SVG. Devuelve los trazos del interior,
 * los dos labios y dónde van los dientes, según apertura, anchura (0 redonda, 1 estirada) y sonrisa.
 */
function formaDeBoca({ abierta = 0, ancha = 0.5, sonrisa = 0.3 } = {}) {
  const a = Math.max(0, Math.min(1, abierta));
  const semiancho = 21 * (0.82 + 0.36 * ancha) * (1 - 0.12 * a * (1 - ancha));
  const esquina = -2.5 * sonrisa + a * 1.5;
  const alto = a * 20;
  const arribaInt = -0.6 - alto * 0.18;
  const abajoInt = alto * 0.82 + 0.6;
  const grosorSup = 5.2;
  const grosorInf = 6.6;

  const interior =
    `M${r(-semiancho)} ${r(esquina)} ` +
    `C${r(-semiancho * 0.55)} ${r(arribaInt)} ${r(semiancho * 0.55)} ${r(arribaInt)} ${r(semiancho)} ${r(esquina)} ` +
    `C${r(semiancho * 0.6)} ${r(abajoInt)} ${r(-semiancho * 0.6)} ${r(abajoInt)} ${r(-semiancho)} ${r(esquina)}Z`;

  const labioSup =
    `M${r(-semiancho - 1.5)} ${r(esquina)} ` +
    `C${r(-semiancho * 0.7)} ${r(arribaInt - grosorSup - 1)} ${r(-semiancho * 0.3)} ${r(arribaInt - grosorSup - 1.5)} 0 ${r(arribaInt - grosorSup + 1.2)} ` +
    `C${r(semiancho * 0.3)} ${r(arribaInt - grosorSup - 1.5)} ${r(semiancho * 0.7)} ${r(arribaInt - grosorSup - 1)} ${r(semiancho + 1.5)} ${r(esquina)} ` +
    `C${r(semiancho * 0.55)} ${r(arribaInt)} ${r(-semiancho * 0.55)} ${r(arribaInt)} ${r(-semiancho - 1.5)} ${r(esquina)}Z`;

  const labioInf =
    `M${r(-semiancho - 1.5)} ${r(esquina)} ` +
    `C${r(-semiancho * 0.6)} ${r(abajoInt)} ${r(semiancho * 0.6)} ${r(abajoInt)} ${r(semiancho + 1.5)} ${r(esquina)} ` +
    `C${r(semiancho * 0.6)} ${r(abajoInt + grosorInf + 2)} ${r(-semiancho * 0.6)} ${r(abajoInt + grosorInf + 2)} ${r(-semiancho - 1.5)} ${r(esquina)}Z`;

  return {
    interior,
    labioSup,
    labioInf,
    semiancho: r(semiancho),
    dientesY: r(arribaInt - 1),
    dientesAlto: r(Math.min(6, alto * 0.35)),
    lenguaY: r(abajoInt - 2),
    alto: r(alto),
  };
}

/** Pasa audio a PCM de 16 bits y 16 kHz, el formato que piden los proveedores de avatar en video. */
function aPcm16(muestras, frecuenciaOrigen, frecuenciaDestino = 16000) {
  const paso = frecuenciaOrigen / frecuenciaDestino;
  const largo = Math.floor(muestras.length / paso);
  const salida = new Uint8Array(largo * 2);
  const vista = new DataView(salida.buffer);
  for (let i = 0; i < largo; i += 1) {
    const pos = i * paso;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, muestras.length - 1);
    const v = muestras[i0] + (muestras[i1] - muestras[i0]) * (pos - i0);
    const s = Math.max(-1, Math.min(1, v));
    vista.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return salida;
}

const Labios = {
  nivelDesdeMuestras, aperturaDesdeNivel, suavizar, anchuraDesdeEspectro,
  silabasDePalabra, silabasDe, duracionEstimada, aperturaSintetica, formaDeBoca, aPcm16,
};

if (typeof window !== "undefined") window.Labios = Labios;
if (typeof module !== "undefined" && module.exports) module.exports = Labios;
