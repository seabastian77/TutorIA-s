// Manda los correos de la app: por Gmail si está configurado, si no por Resend

const nodemailer = require("nodemailer");
const { reportarError } = require("../utils/errores");
const { elegirProveedor, remitenteDe } = require("../utils/proveedorCorreo");

const API_RESEND = "https://api.resend.com/emails";
const ESPERA_MS = 15000;

let transporteGmail = null;

/** Arma el transporte de Gmail una sola vez y lo reutiliza. */
function gmail() {
  if (!transporteGmail) {
    transporteGmail = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USUARIO,
        // Es una contraseña de aplicación, no la del correo
        pass: process.env.GMAIL_CLAVE_APP,
      },
    });
  }
  return transporteGmail;
}

/** Dice si hay con qué mandar correos; si no, la app sigue funcionando igual. */
function correoConfigurado() {
  return elegirProveedor(process.env) !== "ninguno";
}

async function porGmail({ de, para, asunto, texto, html }) {
  await gmail().sendMail({ from: de, to: para, subject: asunto, text: texto, html });
  return { enviado: true, por: "gmail" };
}

async function porResend({ de, para, asunto, texto, html }) {
  const corte = AbortSignal.timeout ? AbortSignal.timeout(ESPERA_MS) : undefined;
  const resp = await fetch(API_RESEND, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: de, to: [para], subject: asunto, text: texto, html }),
    signal: corte,
  });

  if (!resp.ok) {
    // El cuerpo trae el motivo, pero nunca la clave
    const detalle = await resp.text().catch(() => "");
    throw new Error(`Resend respondió ${resp.status}: ${detalle.slice(0, 300)}`);
  }
  return { enviado: true, por: "resend" };
}

/**
 * Manda un correo y devuelve si salió. Nunca revienta hacia arriba: que el
 * correo falle no puede tumbar la petición del usuario.
 */
async function enviarCorreo({ para, asunto, texto, html }) {
  const proveedor = elegirProveedor(process.env);
  const de = remitenteDe(process.env, proveedor);

  if (proveedor === "ninguno") {
    // En local no hay nada configurado: el enlace se imprime para poder probar
    console.log(`[correo sin configurar] para ${para}\n${texto}`);
    return { enviado: false, motivo: "sin-configurar" };
  }

  try {
    const envio = { de, para, asunto, texto, html };
    return proveedor === "gmail" ? await porGmail(envio) : await porResend(envio);
  } catch (error) {
    reportarError(`No se pudo enviar el correo por ${proveedor}`, error);
    return { enviado: false, motivo: "fallo-envio" };
  }
}

module.exports = { enviarCorreo, correoConfigurado };
