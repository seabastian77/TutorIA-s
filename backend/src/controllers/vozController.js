// backend/src/controllers/vozController.js
const { generarRespuestaConversacion } = require("../services/iaService");
const { registrarActividad } = require("../utils/gamificacion");
const pool = require("../config/db");

const VozController = {
  async responder(req, res) {
    try {
      const { mensajeUsuario, historial, nivel } = req.body;

      if (!mensajeUsuario || !mensajeUsuario.trim()) {
        return res.status(400).json({ error: "No llegó ningún mensaje" });
      }

      const nivelUsuario = nivel || req.usuario.nivel_mcer || "B1";

      const resultado = await generarRespuestaConversacion({
        historial: historial || [],
        mensajeUsuario,
        nivel: nivelUsuario,
      });

      await pool.query(
        `INSERT INTO conversaciones (usuario_id, mensaje_usuario, respuesta_ia, correcciones)
         VALUES ($1, $2, $3, $4)`,
        [
          req.usuario.id,
          mensajeUsuario,
          resultado.respuesta,
          resultado.correccion
            ? JSON.stringify({ correccion: resultado.correccion })
            : null,
        ],
      );

      // Cada intercambio hablado suma puntos y mantiene viva la racha
      const gamificacion = await registrarActividad(req.usuario.id, 8);

      res.json({
        respuesta: resultado.respuesta,
        correccion: resultado.correccion,
        puntosTotales: gamificacion.puntos,
        racha: gamificacion.racha,
      });
    } catch (error) {
      console.error("Error en /voz/responder:", error);
      res.status(500).json({ error: "No se pudo procesar tu mensaje" });
    }
  },
};

module.exports = VozController;
