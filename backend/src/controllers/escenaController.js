const {
  generarEscenaGuion,
  evaluarLineaEscena,
} = require("../services/iaService");
const { registrarActividad } = require("../utils/gamificacion");

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
