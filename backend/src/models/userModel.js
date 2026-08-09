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
      "SELECT id, nombre, correo, nivel_mcer, fecha_registro, ultimo_acceso FROM usuarios WHERE id = $1",
      [id],
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
