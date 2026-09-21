// Manda los correos de la app por la API de Resend, sin librerías de por medio

const { reportarError } = require("../utils/errores");

const API = "https://api.resend.com/emails";
// Sin dominio propio, Resend solo deja este remitente y solo al correo de la cuenta
const REMITENTE = process.env.CORREO_REMITENTE || "TutorIA's <onboarding@resend.dev>";
const ESPERA_MS = 10000;

/** Dice si hay con qué mandar correos; si no, la app sigue funcionando igual. */
function correoConfigurado() {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Manda un correo y devuelve si salió. Nunca revienta hacia arriba: que el
 * correo falle no puede tumbar la petición del usuario.
 */
async function enviarCorreo({ para, asunto, texto, html }) {
  if (!correoConfigurado()) {
    // En local no hay clave: el enlace se imprime para poder probar el flujo
    console.log(`[correo sin configurar] para ${para}\n${texto}`);
    return { enviado: false, motivo: "sin-configurar" };
  }

  const corte = AbortSignal.timeout ? AbortSignal.timeout(ESPERA_MS) : undefined;

  try {
    const resp = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: REMITENTE, to: [para], subject: asunto, text: texto, html }),
      signal: corte,
    });

    if (!resp.ok) {
      // El cuerpo del error trae el motivo, pero nunca la clave
      const detalle = await resp.text().catch(() => "");
      throw new Error(`Resend respondió ${resp.status}: ${detalle.slice(0, 300)}`);
    }
    return { enviado: true };
  } catch (error) {
    reportarError("No se pudo enviar el correo", error);
    return { enviado: false, motivo: "fallo-envio" };
  }
}

module.exports = { enviarCorreo, correoConfigurado, REMITENTE };
