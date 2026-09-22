// Decide qué hacer con alguien que entra con Google, sin tocar red ni base

/**
 * Saca del token de Google lo que la app necesita. Rechaza el correo sin
 * verificar: si no, cualquiera podría crear una cuenta de Google con el correo
 * de otro y quedarse con su cuenta de TutorIA's.
 */
function datosDePerfilGoogle(payload) {
  const p = payload || {};

  if (!p.sub) {
    const error = new Error("El token de Google no trae usuario");
    error.status = 401;
    throw error;
  }
  if (!p.email) {
    const error = new Error("El token de Google no trae correo");
    error.status = 401;
    throw error;
  }
  if (p.email_verified !== true && p.email_verified !== "true") {
    const error = new Error("Google no ha verificado ese correo");
    error.status = 401;
    throw error;
  }

  const correo = String(p.email).trim().toLowerCase();
  return {
    googleId: String(p.sub),
    correo,
    // Sin nombre se usa lo que va antes del arroba, para no saludar en blanco
    nombre: String(p.name || p.given_name || correo.split("@")[0]).trim().slice(0, 80),
  };
}

/**
 * Con lo que hay en la base, dice qué toca hacer:
 * - entrar: ya tiene cuenta de Google
 * - vincular: tenía cuenta con contraseña y ese mismo correo verificado
 * - crear: no existe
 */
function decidirVinculo({ porGoogleId, porCorreo }) {
  if (porGoogleId) return "entrar";
  if (porCorreo) return "vincular";
  return "crear";
}

/**
 * Dice si esta cuenta puede entrar con contraseña. Quien se registró solo con
 * Google no tiene ninguna guardada, y hay que decírselo en vez de dejarlo
 * probando claves que nunca van a servir.
 */
function entraConContrasena(usuario) {
  return !!(usuario && usuario.contrasena_hash);
}

module.exports = { datosDePerfilGoogle, decidirVinculo, entraConContrasena };
