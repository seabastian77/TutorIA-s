// Avatar de la tutoría en video: dice qué modo está activo y abre sesiones con el proveedor real

const URL_SIMLI = "https://api.simli.ai";
const PROVEEDORES = ["simli"];

/** Segundos que puede durar una sesión real; corta el gasto si alguien deja la pestaña abierta. */
function maxSegundos() {
  const n = parseInt(process.env.AVATAR_MAX_SEGUNDOS, 10);
  return Number.isFinite(n) && n >= 60 && n <= 3600 ? n : 600;
}

/** El proveedor configurado, o null si falta algo y la app debe usar el avatar de demostración. */
function proveedorAvatar() {
  const nombre = String(process.env.AVATAR_PROVEEDOR || "").trim().toLowerCase();
  if (!PROVEEDORES.includes(nombre)) return null;
  if (nombre === "simli" && process.env.SIMLI_API_KEY && process.env.SIMLI_FACE_ID) return "simli";
  return null;
}

/** Lo que el navegador puede saber del avatar, sin ninguna clave. */
function configuracionPublica() {
  const proveedor = proveedorAvatar();
  return {
    modo: proveedor ? "real" : "demo",
    proveedor,
    maxSegundos: proveedor ? maxSegundos() : null,
  };
}

/** Error con el código HTTP que debe responder el controlador. */
function errorConEstado(estado, mensaje) {
  const error = new Error(mensaje);
  error.status = estado;
  return error;
}

/** Pide a Simli un token de sesión de un solo uso; la clave nunca sale del servidor. */
async function crearSesionSimli() {
  const respuesta = await fetch(`${URL_SIMLI}/compose/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-simli-api-key": process.env.SIMLI_API_KEY,
    },
    body: JSON.stringify({
      faceId: process.env.SIMLI_FACE_ID,
      handleSilence: true,
      maxSessionLength: maxSegundos(),
      maxIdleTime: 120,
      audioInputFormat: "pcm16",
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!respuesta.ok) {
    throw errorConEstado(502, `Simli respondió ${respuesta.status}`);
  }
  const datos = await respuesta.json();
  if (!datos || typeof datos.session_token !== "string" || !datos.session_token) {
    throw errorConEstado(502, "Simli no devolvió un token de sesión");
  }
  return { proveedor: "simli", sessionToken: datos.session_token, maxSegundos: maxSegundos() };
}

/** Abre una sesión con el proveedor configurado; sin proveedor responde 503 y el navegador sigue en demo. */
async function crearSesion() {
  const proveedor = proveedorAvatar();
  if (!proveedor) {
    throw errorConEstado(503, "El avatar en video no está configurado; se usa el modo de demostración");
  }
  return crearSesionSimli();
}

module.exports = { configuracionPublica, crearSesion, proveedorAvatar, maxSegundos, URL_SIMLI };
