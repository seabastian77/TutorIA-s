const pool = require("../config/db");

const EjercicioModel = {
  async registrar({ usuarioId, tipo, nivelDificultad, contenido, correcto }) {
    const query = `
      INSERT INTO ejercicios (usuario_id, tipo, nivel_dificultad, contenido, correcto)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const { rows } = await pool.query(query, [
      usuarioId,
      tipo,
      nivelDificultad,
      JSON.stringify(contenido),
      correcto,
    ]);
    return rows[0];
  },

  async obtenerHistorialReciente(usuarioId, limite = 15) {
    const { rows } = await pool.query(
      "SELECT tipo, nivel_dificultad, contenido, correcto, fecha FROM ejercicios WHERE usuario_id = $1 ORDER BY fecha DESC LIMIT $2",
      [usuarioId, limite],
    );
    return rows;
  },
};

module.exports = EjercicioModel;
