// Prepara los enlaces para recuperar la contraseña, sin red ni base de datos

const crypto = require("crypto");

const TOKEN_BYTES = 32;
const VIGENCIA_MINUTOS = 60;
const LARGO_MINIMO = 6; // el mismo que pide el registro
const SOLICITUDES_POR_HORA = 3;

/**
 * Crea el token que viaja en el correo y el hash que se guarda.
 * A la base solo entra el hash: quien la lea no puede entrar con lo que ve.
 */
function crearToken() {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  return { token, hash: hashDeToken(token) };
}

function hashDeToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

/** Dice si un token tiene la pinta de haber salido de aquí. */
function tokenBienFormado(token) {
  return typeof token === "string" && new RegExp(`^[0-9a-f]{${TOKEN_BYTES * 2}}$`).test(token);
}

function expiraEn(desde = new Date()) {
  return new Date(desde.getTime() + VIGENCIA_MINUTOS * 60 * 1000);
}

function estaVencido(expira, ahora = new Date()) {
  const fin = expira instanceof Date ? expira : new Date(expira);
  if (isNaN(fin.getTime())) return true;
  return fin.getTime() <= ahora.getTime();
}

/** Un correo sirve si tiene la forma mínima; lo demás lo dirá el envío. */
function correoValido(correo) {
  return typeof correo === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
}

function contrasenaValida(contrasena) {
  return typeof contrasena === "string" && contrasena.length >= LARGO_MINIMO;
}

/** Arma el enlace del correo sobre la dirección pública de la app. */
function enlaceDeRecuperacion(base, token) {
  const limpia = String(base || "").replace(/\/+$/, "");
  return `${limpia}/?recuperar=${encodeURIComponent(token)}`;
}

/** El correo que le llega al estudiante, en texto y en HTML. */
function cuerpoDelCorreo(nombre, enlace) {
  const saludo = nombre ? `Hola ${nombre},` : "Hola,";
  const texto = [
    saludo,
    "",
    "Pediste cambiar tu contraseña de TutorIA's. Abre este enlace para poner una nueva:",
    enlace,
    "",
    `El enlace sirve por ${VIGENCIA_MINUTOS} minutos y una sola vez.`,
    "Si no fuiste tú, no tienes que hacer nada: tu contraseña sigue igual.",
    "",
    "TutorIA's",
  ].join("\n");

  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.55;color:#0f1b33">
  <p>${escaparHtml(saludo)}</p>
  <p>Pediste cambiar tu contraseña de TutorIA's. Abre este enlace para poner una nueva:</p>
  <p><a href="${escaparHtml(enlace)}" style="display:inline-block;padding:12px 20px;border-radius:12px;background:#0a1b3d;color:#eaf2ff;text-decoration:none;font-weight:700">Poner una contraseña nueva</a></p>
  <p style="color:#565c6b;font-size:13px">El enlace sirve por ${VIGENCIA_MINUTOS} minutos y una sola vez.<br>
  Si no fuiste tú, no tienes que hacer nada: tu contraseña sigue igual.</p>
  <p style="color:#565c6b;font-size:13px">TutorIA's</p>
</div>`;

  return { asunto: "Cambia tu contraseña de TutorIA's", texto, html };
}

/** El nombre del usuario entra al HTML del correo, así que va escapado. */
function escaparHtml(texto) {
  return String(texto == null ? "" : texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  TOKEN_BYTES,
  VIGENCIA_MINUTOS,
  LARGO_MINIMO,
  SOLICITUDES_POR_HORA,
  crearToken,
  hashDeToken,
  tokenBienFormado,
  expiraEn,
  estaVencido,
  correoValido,
  contrasenaValida,
  enlaceDeRecuperacion,
  cuerpoDelCorreo,
  escaparHtml,
};
