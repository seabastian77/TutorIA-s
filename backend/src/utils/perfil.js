const pool = require("../config/db");

/**
 * Lee lo que los módulos de contenido necesitan del usuario:
 * su nivel MCER y si tiene encendida la ayuda en español.
 * Devuelve valores por defecto si algo falta, para no romper nunca.
 */
async function obtenerPerfil(usuarioId) {
  const { rows } = await pool.query(
    "SELECT nivel_mcer, ayuda_es FROM usuarios WHERE id = $1",
    [usuarioId],
  );

  const u = rows[0] || {};
  return {
    nivel: u.nivel_mcer || "A1",
    ayudaEs: u.ayuda_es !== false, // por defecto encendida
  };
}

module.exports = { obtenerPerfil };
