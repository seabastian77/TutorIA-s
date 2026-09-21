const pool = require("../config/db");

const RecuperacionModel = {
  /** Guarda una solicitud nueva; a la base solo entra el hash del token. */
  async crear({ usuarioId, tokenHash, expira }) {
    const { rows } = await pool.query(
      `INSERT INTO recuperaciones_contrasena (usuario_id, token_hash, expira)
       VALUES ($1, $2, $3) RETURNING id, usuario_id, expira, creado_en`,
      [usuarioId, tokenHash, expira],
    );
    return rows[0];
  },

  /** Busca la solicitud por el hash del token que llegó en el enlace. */
  async buscarPorHash(tokenHash) {
    const { rows } = await pool.query(
      `SELECT r.id, r.usuario_id, r.expira, r.usado_en, u.correo, u.nombre
         FROM recuperaciones_contrasena r
         JOIN usuarios u ON u.id = r.usuario_id
        WHERE r.token_hash = $1`,
      [tokenHash],
    );
    return rows[0];
  },

  async marcarUsado(id) {
    await pool.query(
      "UPDATE recuperaciones_contrasena SET usado_en = NOW() WHERE id = $1",
      [id],
    );
  },

  /** Al pedir una nueva, las anteriores dejan de servir. */
  async invalidarPendientes(usuarioId) {
    await pool.query(
      `UPDATE recuperaciones_contrasena SET usado_en = NOW()
        WHERE usuario_id = $1 AND usado_en IS NULL`,
      [usuarioId],
    );
  },

  /** Cuántas pidió en la última hora, para no dejar inundarle el correo. */
  async solicitudesRecientes(usuarioId) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM recuperaciones_contrasena
        WHERE usuario_id = $1 AND creado_en > NOW() - INTERVAL '1 hour'`,
      [usuarioId],
    );
    return rows[0].total;
  },

  /** Limpia las que ya no sirven; se llama de vez en cuando, no es crítico. */
  async borrarVencidas() {
    const { rowCount } = await pool.query(
      "DELETE FROM recuperaciones_contrasena WHERE expira < NOW() - INTERVAL '7 days'",
    );
    return rowCount;
  },
};

module.exports = RecuperacionModel;
