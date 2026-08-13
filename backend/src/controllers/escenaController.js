const {
  generarEscenaGuion,
  evaluarLineaEscena,
} = require("../services/iaService");
const { registrarActividad } = require("../utils/gamificacion");
const { guardarPalabraSiFalla } = require("../utils/vocabulario");
const pool = require("../config/db");

const EscenaController = {
  async nueva(req, res) {
    try {
      const nivel = req.usuario.nivel_mcer || "B1";
      const escena = await generarEscenaGuion({ nivel });
      res.json(escena);
    } catch (error) {
      console.error("Error en /escena/nueva:", error);
      res.status(500).json({ error: "No se pudo generar la escena" });
    }
  },

  async evaluarLinea(req, res) {
    try {
      const { lineaObjetivo, transcripcion } = req.body;

      if (!lineaObjetivo || !transcripcion) {
        return res.status(400).json({ error: "Faltan datos para evaluar" });
      }

      const evaluacion = await evaluarLineaEscena({
        lineaObjetivo,
        transcripcion,
      });

      // Queda registrado en el historial de conversaciones (también cuenta
      // para los logros de "conversación") y si salió mal, capturamos la palabra
      await pool.query(
        `INSERT INTO conversaciones (usuario_id, mensaje_usuario, respuesta_ia, correcciones)
         VALUES ($1, $2, $3, $4)`,
        [
          req.usuario.id,
          transcripcion,
          lineaObjetivo,
          JSON.stringify({
            tipo: "escena",
            puntuacion: evaluacion.puntuacion,
            feedback: evaluacion.feedback,
          }),
        ],
      );

      if ((evaluacion.puntuacion || 0) < 60) {
        guardarPalabraSiFalla(req.usuario.id, "escrita", {
          frase: lineaObjetivo,
          tema: "movie scene practice",
        });
      }

      const puntosGanados = Math.max(
        2,
        Math.round((evaluacion.puntuacion || 50) / 10),
      );
      const gamificacion = await registrarActividad(
        req.usuario.id,
        puntosGanados,
      );

      res.json({
        ...evaluacion,
        puntosGanados,
        puntosTotales: gamificacion.puntos,
        racha: gamificacion.racha,
      });
    } catch (error) {
      console.error("Error en /escena/evaluar-linea:", error);
      res.status(500).json({ error: "No se pudo evaluar tu línea" });
    }
  },
};

module.exports = EscenaController;
