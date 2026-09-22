// Decide por dónde salen los correos, según lo que esté configurado

/**
 * Gmail primero porque le llega a cualquiera; Resend después; y si no hay
 * nada, el enlace se imprime en los logs para poder probar en local.
 */
function elegirProveedor(env = {}) {
  if (env.GMAIL_USUARIO && env.GMAIL_CLAVE_APP) return "gmail";
  if (env.RESEND_API_KEY) return "resend";
  return "ninguno";
}

/** El remitente que se muestra, según el proveedor que haya quedado. */
function remitenteDe(env = {}, proveedor) {
  if (env.CORREO_REMITENTE) return env.CORREO_REMITENTE;
  if (proveedor === "gmail") return `TutorIA's <${env.GMAIL_USUARIO}>`;
  return "TutorIA's <onboarding@resend.dev>";
}

module.exports = { elegirProveedor, remitenteDe };
