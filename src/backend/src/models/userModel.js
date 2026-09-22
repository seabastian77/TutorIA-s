const pool = require("../config/db");

const UserModel = {
  async crear({ nombre, correo, contrasenaHash }) {
    const query = `
      INSERT INTO usuarios (nombre, correo, contrasena_hash)
      VALUES ($1, $2, $3)
      RETURNING id, nombre, correo, nivel_mcer, fecha_registro
    `;
    const { rows } = await pool.query(query, [nombre, correo, contrasenaHash]);
    return rows[0];
  },

  async buscarPorCorreo(correo) {
    const { rows } = await pool.query(
      "SELECT * FROM usuarios WHERE correo = $1",
      [correo],
    );
    return rows[0];
  },

  async buscarPorId(id) {
    const { rows } = await pool.query(
      `SELECT id, nombre, correo, nivel_mcer, fecha_registro, ultimo_acceso,
              contrasena_cambiada_en
         FROM usuarios WHERE id = $1`,
      [id],
    );
    return rows[0];
  },

  async buscarPorGoogleId(googleId) {
    const { rows } = await pool.query(
      "SELECT * FROM usuarios WHERE google_id = $1",
      [googleId],
    );
    return rows[0];
  },

  /** Crea la cuenta de quien entra con Google: sin contraseña guardada. */
  async crearConGoogle({ nombre, correo, googleId }) {
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, correo, google_id)
       VALUES ($1, $2, $3)
       RETURNING id, nombre, correo, nivel_mcer, fecha_registro`,
      [nombre, correo, googleId],
    );
    return rows[0];
  },

  /** Ata una cuenta que ya existía al Google del mismo correo verificado. */
  async vincularGoogle(id, googleId) {
    const { rows } = await pool.query(
      `UPDATE usuarios SET google_id = $2 WHERE id = $1
       RETURNING id, nombre, correo, nivel_mcer, fecha_registro`,
      [id, googleId],
    );
    return rows[0];
  },

  async actualizarUltimoAcceso(id) {
    await pool.query(
      "UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1",
      [id],
    );
  },
};

module.exports = UserModel;
