// El flujo de recuperar la contraseña: pedir el enlace y usarlo

const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const UserModel = require("../models/userModel");
const RecuperacionModel = require("../models/recuperacionModel");
const { enviarCorreo } = require("./correo");
const {
  crearToken,
  hashDeToken,
  tokenBienFormado,
  expiraEn,
  estaVencido,
  enlaceDeRecuperacion,
  cuerpoDelCorreo,
  SOLICITUDES_POR_HORA,
} = require("../utils/recuperacion");

const RONDAS_BCRYPT = 10; // las mismas que usa el registro

/** La dirección pública de la app, que es donde vive el formulario. */
function direccionDeLaApp() {
  return process.env.URL_FRONTEND || "http://localhost:8080";
}

const RecuperacionService = {
  /**
   * Pide el enlace. Quien llama nunca sabe si el correo existe: la respuesta
   * es igual en todos los casos, para que nadie averigüe quién está registrado.
   */
  async pedirEnlace(correo) {
    const usuario = await UserModel.buscarPorCorreo(String(correo).trim().toLowerCase());
    if (!usuario) return { enviado: false, motivo: "sin-cuenta" };

    const recientes = await RecuperacionModel.solicitudesRecientes(usuario.id);
    if (recientes >= SOLICITUDES_POR_HORA) {
      return { enviado: false, motivo: "demasiadas" };
    }

    // Pedir uno nuevo tumba los anteriores: solo el último enlace sirve
    await RecuperacionModel.invalidarPendientes(usuario.id);

    const { token, hash } = crearToken();
    await RecuperacionModel.crear({
      usuarioId: usuario.id,
      tokenHash: hash,
      expira: expiraEn(),
    });

    const enlace = enlaceDeRecuperacion(direccionDeLaApp(), token);
    const { asunto, texto, html } = cuerpoDelCorreo(usuario.nombre, enlace);
    const envio = await enviarCorreo({ para: usuario.correo, asunto, texto, html });

    return { enviado: envio.enviado, motivo: envio.motivo };
  },

  /**
   * Cambia la contraseña con el token del enlace. Todo pasa en una transacción:
   * o queda la clave nueva y el token gastado, o no queda nada.
   */
  async restablecer(token, contrasenaNueva) {
    if (!tokenBienFormado(token)) {
      const error = new Error("El enlace no sirve o ya venció");
      error.status = 400;
      throw error;
    }

    const solicitud = await RecuperacionModel.buscarPorHash(hashDeToken(token));
    if (!solicitud || solicitud.usado_en || estaVencido(solicitud.expira)) {
      const error = new Error("El enlace no sirve o ya venció");
      error.status = 400;
      throw error;
    }

    const contrasenaHash = await bcrypt.hash(contrasenaNueva, RONDAS_BCRYPT);
    const cliente = await pool.connect();

    try {
      await cliente.query("BEGIN");
      // contrasena_cambiada_en deja por fuera las sesiones abiertas de antes
      await cliente.query(
        "UPDATE usuarios SET contrasena_hash = $1, contrasena_cambiada_en = NOW() WHERE id = $2",
        [contrasenaHash, solicitud.usuario_id],
      );
      await cliente.query(
        `UPDATE recuperaciones_contrasena SET usado_en = NOW()
          WHERE usuario_id = $1 AND usado_en IS NULL`,
        [solicitud.usuario_id],
      );
      await cliente.query("COMMIT");
    } catch (error) {
      await cliente.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      cliente.release();
    }

    return { correo: solicitud.correo };
  },
};

module.exports = RecuperacionService;
