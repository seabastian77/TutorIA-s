// Marca un ejercicio como respondido una sola vez, para que no se cobre XP dos veces

const pool = require("../config/db");

/** Devuelve el id como entero positivo, o null si no sirve. */
function idValido(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Guarda el resultado solo si el ejercicio de esta persona aún no tenía uno; dice si lo guardó. */
async function marcarRespondido(ejercicioId, usuarioId, correcto) {
  const { rows } = await pool.query(
    `UPDATE ejercicios SET correcto = $1
      WHERE id = $2 AND usuario_id = $3 AND correcto IS NULL
      RETURNING id`,
    [Boolean(correcto), ejercicioId, usuarioId],
  );
  return rows.length > 0;
}

const YA_RESPONDIDO = { error: "Ya respondiste este ejercicio", codigo: "ya_respondido" };

module.exports = { idValido, marcarRespondido, YA_RESPONDIDO };
