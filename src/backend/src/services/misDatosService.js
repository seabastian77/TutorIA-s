// Derechos del titular (Ley 1581): conocer sus datos, llevárselos y pedir que se borren

const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { enviarCorreo } = require("./correo");
const { reportarError } = require("../utils/errores");
const {
  TABLAS_DEL_USUARIO,
  correoCoincide,
  cuentaParaEntregar,
  correoDeDespedida,
} = require("../utils/misDatos");

/** Error con el código HTTP que le toca, para que el controlador lo devuelva tal cual. */
function errorConEstado(estado, mensaje) {
  const e = new Error(mensaje);
  e.estado = estado;
  return e;
}

/** Lee la fila completa de la cuenta; sin ella no hay nada que entregar ni borrar. */
async function leerCuenta(usuarioId) {
  const { rows } = await pool.query("SELECT * FROM usuarios WHERE id = $1", [usuarioId]);
  if (!rows[0]) throw errorConEstado(404, "La cuenta no existe");
  return rows[0];
}

/** Lo mínimo que necesita la pantalla para saber cómo pedir la confirmación. */
async function resumenCuenta(usuarioId) {
  const u = await leerCuenta(usuarioId);
  return {
    nombre: u.nombre,
    correo: u.correo,
    registradoEl: u.fecha_registro,
    tieneContrasena: Boolean(u.contrasena_hash),
    entraConGoogle: Boolean(u.google_id),
  };
}

/** Junta todo lo que la app guarda de esa persona en un solo documento. */
async function exportar(usuarioId) {
  const u = await leerCuenta(usuarioId);
  const datos = {
    exportadoEl: new Date().toISOString(),
    responsables: "Sebastián González González y Ebert de Jesús Ríos Arroyave · sebastiangonzalez304@gmail.com",
    cuenta: cuentaParaEntregar(u),
  };

  for (const { tabla, clave, columnas, orden } of TABLAS_DEL_USUARIO) {
    if (!clave) continue;
    const { rows } = await pool.query(
      `SELECT ${columnas} FROM ${tabla} WHERE usuario_id = $1 ORDER BY ${orden}`,
      [usuarioId],
    );
    datos[clave] = rows;
  }
  return datos;
}

/** Borra la cuenta y todo lo suyo en una sola transacción, después de confirmar que es la persona. */
async function borrar(usuarioId, { correo, contrasena }) {
  const u = await leerCuenta(usuarioId);

  if (!correoCoincide(correo, u.correo)) {
    throw errorConEstado(400, "El correo no coincide con el de tu cuenta");
  }
  if (u.contrasena_hash) {
    const coincide = contrasena ? await bcrypt.compare(contrasena, u.contrasena_hash) : false;
    if (!coincide) throw errorConEstado(403, "La contraseña no es correcta");
  }

  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    for (const { tabla } of TABLAS_DEL_USUARIO) {
      await cliente.query(`DELETE FROM ${tabla} WHERE usuario_id = $1`, [usuarioId]);
    }
    await cliente.query("DELETE FROM usuarios WHERE id = $1", [usuarioId]);
    await cliente.query("COMMIT");
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }

  // El aviso por correo es cortesía: si falla, la cuenta igual ya quedó borrada
  try {
    await enviarCorreo({ para: u.correo, ...correoDeDespedida(u.nombre) });
  } catch (error) {
    reportarError("No se pudo enviar el correo de cuenta borrada", error);
  }
}

module.exports = { resumenCuenta, exportar, borrar };
