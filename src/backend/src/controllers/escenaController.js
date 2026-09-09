const {
  generarEscenaGuion,
  evaluarLineaEscena,
} = require("../services/iaService");
const { registrarActividad } = require("../utils/gamificacion");
const { guardarPalabraSiFalla } = require("../utils/vocabulario");
const pool = require("../config/db");
const { compararPronunciacion } = require("../utils/textoDictado");

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

      const pronunciacion = compararPronunciacion(lineaObjetivo, transcripcion);

      // Registra la conversación y captura la palabra fallada
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
        { perfecto: (evaluacion.puntuacion || 0) >= 90 },
      );

      res.json({
        ...evaluacion,
        palabras: pronunciacion.detalle,
        sobrantes: pronunciacion.sobrantes,
        aciertos: pronunciacion.aciertos,
        totalPalabras: pronunciacion.total,
        precision: pronunciacion.porcentaje,
        puntosGanados,
        bonusPerfecto: gamificacion.bonusPerfecto,
        xpGanado: gamificacion.xpGanado,
        puntosTotales: gamificacion.puntos,
        racha: gamificacion.racha,
        monedas: gamificacion.monedas,
        monedasGanadas: gamificacion.monedasGanadas,
        metaCompletada: gamificacion.metaCompletada,
      });
    } catch (error) {
      console.error("Error en /escena/evaluar-linea:", error);
      res.status(500).json({ error: "No se pudo evaluar tu línea" });
    }
  },
};

module.exports = EscenaController;
