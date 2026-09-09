const pool = require("../config/db");

/** Lee el nivel MCER del usuario y si tiene activada la ayuda en español. */
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
