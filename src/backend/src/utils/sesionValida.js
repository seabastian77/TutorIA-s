// Decide si un token sigue valiendo después de que el usuario cambió su clave

// Un segundo de holgura: el token se firma con los segundos redondeados hacia
// abajo, así que sin esto el token recién dado tras el cambio se rechazaría
const HOLGURA_MS = 1000;

/**
 * Dice si el token es anterior al último cambio de contraseña. Si lo es, el
 * que lo tenga quedó por fuera: eso es lo que saca al intruso de la cuenta.
 */
function tokenAnteriorAlCambio(emitidoEn, cambiadaEn) {
  if (!cambiadaEn) return false; // nunca la ha cambiado: nada que invalidar

  const cambio = cambiadaEn instanceof Date ? cambiadaEn : new Date(cambiadaEn);
  if (isNaN(cambio.getTime())) return false;

  // 'iat' del JWT viene en segundos
  const emitido = Number(emitidoEn);
  if (!isFinite(emitido) || emitido <= 0) return false;

  return emitido * 1000 + HOLGURA_MS < cambio.getTime();
}

module.exports = { tokenAnteriorAlCambio, HOLGURA_MS };
