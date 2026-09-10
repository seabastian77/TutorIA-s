const Sentry = require("@sentry/node");

/**
 * Deja el error en el log y se lo manda a Sentry. Sin SENTRY_DSN configurado
 * captureException no hace nada, así que en local todo sigue igual.
 */
function reportarError(contexto, error) {
  console.error(`${contexto}:`, error);
  Sentry.captureException(error, { tags: { contexto } });
}

module.exports = { reportarError };
