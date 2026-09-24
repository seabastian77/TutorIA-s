const { generarRespuestaConversacion } = require("../services/iaService");
const { registrarActividad } = require("../utils/gamificacion");
const pool = require("../config/db");
const { reportarError } = require("../utils/errores");
const { idiomasConVoz, leerEnServidor } = require("../services/vozServidor");

const VozController = {
  /**
   * Lee un texto con la voz del servidor (Google o la propia en inglés). Pide sesión a propósito:
   * sin eso, cualquiera en internet podría gastarle el cupo o el procesador a la app.
   */
  async hablar(req, res) {
    if (!idiomasConVoz().length) {
      return res.json({ audio: null, motivo: "sin-configurar" });
    }

    const { texto, idioma, velocidad } = req.body || {};
    const audio = await leerEnServidor(texto, idioma, velocidad);

    // Sin audio el navegador lee con su propia voz: la app no se queda muda
    res.json({ audio, motivo: audio ? null : "fallo" });
  },

  async responder(req, res) {
    try {
      const { historial, nivel } = req.body || {};
      const mensajeUsuario = typeof (req.body || {}).mensajeUsuario === "string" ? req.body.mensajeUsuario.slice(0, 500) : "";

      if (!mensajeUsuario.trim()) {
        return res.status(400).json({ error: "No llegó ningún mensaje" });
      }

      const NIVELES = ["A1", "A2", "B1", "B2", "C1", "C2"];
      const nivelUsuario = NIVELES.includes(nivel) ? nivel : req.usuario.nivel_mcer || "B1";

      // Solo los últimos turnos y cortos: la conversación sigue igual y la IA no recibe textos gigantes
      const historialCorto = (Array.isArray(historial) ? historial : [])
        .slice(-12)
        .map((t) => ({ ...t, texto: String((t && t.texto) || "").slice(0, 500) }));

      const resultado = await generarRespuestaConversacion({
        historial: historialCorto,
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
      const gamificacion = await registrarActividad(req.usuario.id, 8, { modulo: "voz" });

      res.json({
        respuesta: resultado.respuesta,
        correccion: resultado.correccion,
        puntosTotales: gamificacion.puntos,
        racha: gamificacion.racha,
        monedas: gamificacion.monedas,
        monedasGanadas: gamificacion.monedasGanadas,
        metaCompletada: gamificacion.metaCompletada,
      });
    } catch (error) {
      reportarError("Error en /voz/responder", error);
      res.status(500).json({ error: "No se pudo procesar tu mensaje" });
    }
  },
};

module.exports = VozController;
