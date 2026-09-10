const {
  generarEscenaGuion,
  evaluarLineaEscena,
} = require("../services/iaService");
const { registrarActividad } = require("../utils/gamificacion");
const { guardarPalabraSiFalla } = require("../utils/vocabulario");
const pool = require("../config/db");
const { compararPronunciacion } = require("../utils/textoDictado");
const { reportarError } = require("../utils/errores");
const { obtenerMedio } = require("../services/medios");

// Ambientes de video: la primera palabra que aparezca en la escena manda
const AMBIENTES = [
  { palabras: ["cafe", "coffee", "barista"], consulta: "coffee shop ambience" },
  { palabras: ["airport", "flight", "boarding"], consulta: "airport terminal people" },
  { palabras: ["office", "meeting", "interview"], consulta: "modern office people working" },
  { palabras: ["restaurant", "dinner", "waiter"], consulta: "restaurant evening ambience" },
  { palabras: ["hotel", "reception", "lobby"], consulta: "hotel lobby" },
  { palabras: ["park", "garden", "outdoor"], consulta: "park trees sunny day" },
  { palabras: ["train", "station", "subway"], consulta: "train station platform" },
  { palabras: ["shop", "store", "market"], consulta: "shopping street storefront" },
  { palabras: ["beach", "sea", "ocean"], consulta: "beach waves slow" },
  { palabras: ["home", "kitchen", "living"], consulta: "cozy living room home" },
];

const AMBIENTE_POR_DEFECTO = "city street ambience";

/** Elige el ambiente cuyo tema aparezca en el texto de la escena. */
function consultaDeAmbiente(escena) {
  const texto = `${escena.titulo || ""} ${escena.situacion || ""}`.toLowerCase();
  const encontrado = AMBIENTES.find((a) =>
    a.palabras.some((palabra) => texto.includes(palabra)),
  );
  return encontrado ? encontrado.consulta : AMBIENTE_POR_DEFECTO;
}

const EscenaController = {
  async nueva(req, res) {
    try {
      const nivel = req.usuario.nivel_mcer || "B1";
      const escena = await generarEscenaGuion({ nivel });

      // El video es solo ambiente: si falla, la escena sigue funcionando igual
      let video = null;
      try {
        video = await obtenerMedio("video", consultaDeAmbiente(escena));
      } catch (error) {
        reportarError("No se pudo traer el video de ambiente", error);
      }

      res.json({
        ...escena,
        video: video ? { url: video.url, autor: video.autor, autorUrl: video.autorUrl } : null,
      });
    } catch (error) {
      reportarError("Error en /escena/nueva", error);
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
      reportarError("Error en /escena/evaluar-linea", error);
      res.status(500).json({ error: "No se pudo evaluar tu línea" });
    }
  },
};

module.exports = EscenaController;
