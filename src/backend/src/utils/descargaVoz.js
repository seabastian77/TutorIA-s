// Descarga y deja lista la voz en inglés que corre en el propio servidor (Piper, vía sherpa-onnx)

const fs = require("fs");
const path = require("path");

const MODELO = "vits-piper-en_US-hfc_female-medium";
const URL_MODELO = `https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/${MODELO}.tar.bz2`;
const CARPETA_VOCES = process.env.TUTORIAS_CARPETA_VOCES || path.join(__dirname, "..", "..", "voces");

/** Rutas de los archivos que necesita el motor de voz. */
function rutasVoz(carpeta = CARPETA_VOCES) {
  const base = path.join(carpeta, MODELO);
  return {
    carpeta: base,
    modelo: path.join(base, "en_US-hfc_female-medium.onnx"),
    tokens: path.join(base, "tokens.txt"),
    datos: path.join(base, "espeak-ng-data"),
  };
}

/** Dice si la voz ya está descargada y completa. */
function vozDescargada(carpeta = CARPETA_VOCES) {
  const r = rutasVoz(carpeta);
  return [r.modelo, r.tokens, r.datos].every((p) => fs.existsSync(p));
}

/** Lee un número octal de la cabecera de un tar. */
function octal(buffer, inicio, largo) {
  const texto = buffer.toString("latin1", inicio, inicio + largo).replace(/\0.*$/, "").trim();
  return texto ? parseInt(texto, 8) : 0;
}

/** Saca los archivos de un tar ya descomprimido, sin dejar que ninguno se salga de la carpeta destino. */
function extraerTar(tar, destino) {
  const raiz = path.resolve(destino);
  let pos = 0;
  let nombreLargo = null;

  while (pos + 512 <= tar.length) {
    const cabecera = tar.subarray(pos, pos + 512);
    if (cabecera.every((b) => b === 0)) break;

    const nombreCorto = cabecera.toString("utf8", 0, 100).replace(/\0.*$/, "");
    const prefijo = cabecera.toString("utf8", 345, 500).replace(/\0.*$/, "");
    const tamano = octal(cabecera, 124, 12);
    const tipo = String.fromCharCode(cabecera[156] || 48);
    const datos = tar.subarray(pos + 512, pos + 512 + tamano);
    pos += 512 + Math.ceil(tamano / 512) * 512;

    if (tipo === "L") {
      nombreLargo = datos.toString("utf8").replace(/\0.*$/, "");
      continue;
    }

    const nombre = nombreLargo || (prefijo ? `${prefijo}/${nombreCorto}` : nombreCorto);
    nombreLargo = null;
    if (!nombre || tipo === "x" || tipo === "g") continue;

    const ruta = path.resolve(raiz, nombre);
    if (ruta !== raiz && !ruta.startsWith(raiz + path.sep)) continue;

    if (tipo === "5") fs.mkdirSync(ruta, { recursive: true });
    else if (tipo === "0" || tipo === "\0" || tipo === "7") {
      fs.mkdirSync(path.dirname(ruta), { recursive: true });
      fs.writeFileSync(ruta, datos);
    }
  }
}

let descargaEnCurso = null;

/** Descarga la voz si falta. Nunca revienta: si algo falla, la app sigue con la voz del navegador. */
function asegurarVoz({ carpeta = CARPETA_VOCES, url = URL_MODELO, registrar = console.log } = {}) {
  if (vozDescargada(carpeta)) return Promise.resolve(true);
  if (descargaEnCurso) return descargaEnCurso;

  descargaEnCurso = (async () => {
    const temporal = path.join(carpeta, `.descarga-${process.pid}`);
    try {
      registrar("Descargando la voz en inglés del servidor...");
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`la descarga respondió ${resp.status}`);
      const comprimido = Buffer.from(await resp.arrayBuffer());

      const Bunzip = require("seek-bzip");
      const tar = Bunzip.decode(comprimido);

      fs.rmSync(temporal, { recursive: true, force: true });
      fs.mkdirSync(temporal, { recursive: true });
      extraerTar(tar, temporal);

      const lista = path.join(temporal, MODELO);
      if (!vozDescargada(temporal)) throw new Error("el paquete de la voz llegó incompleto");
      fs.rmSync(rutasVoz(carpeta).carpeta, { recursive: true, force: true });
      fs.renameSync(lista, rutasVoz(carpeta).carpeta);
      registrar("Voz en inglés lista");
      return true;
    } catch (error) {
      registrar(`No se pudo descargar la voz en inglés: ${error.message}`);
      return false;
    } finally {
      fs.rmSync(temporal, { recursive: true, force: true });
      descargaEnCurso = null;
    }
  })();

  return descargaEnCurso;
}

module.exports = { MODELO, URL_MODELO, CARPETA_VOCES, rutasVoz, vozDescargada, extraerTar, asegurarVoz };
