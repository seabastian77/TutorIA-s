const pool = require("../config/db");
const { reportarError } = require("../utils/errores");
const { actividadesDeHoy } = require("../utils/gamificacion");
const { elegirConsejo } = require("../utils/mentorReglas");
const { generarConsejoDelDia } = require("../services/mentorIA");
const { responderCharla } = require("../services/charlaIA");
const { mensajeUtil, limpiarMensaje, saludoInicial } = require("../utils/charlaMentor");

const META_DIARIA = 5;
const DOMINIO_DEBIL = 1; // una palabra con dominio 0 o 1 todavía no se asienta

/** Reúne en una sola consulta lo que el mentor necesita saber del estudiante. */
async function leerEstado(usuarioId) {
  const { rows: usuarios } = await pool.query(
    `SELECT nivel_mcer, racha_dias, actividades_hoy, ultima_actividad, monedas, ayuda_es
       FROM usuarios WHERE id = $1`,
    [usuarioId],
  );
  const u = usuarios[0] || {};

  const { rows: vocab } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE proximo_repaso <= NOW()) AS por_repasar,
       COUNT(*) FILTER (WHERE nivel_dominio <= $2)     AS debiles
     FROM vocabulario_usuario WHERE usuario_id = $1`,
    [usuarioId, DOMINIO_DEBIL],
  );
  const v = vocab[0] || {};

  // Al registrarse todos quedan en A1, así que el nivel solo cuenta como medido
  // cuando existe un diagnóstico terminado
  const { rows: diagnosticos } = await pool.query(
    "SELECT 1 FROM diagnosticos_nivel WHERE usuario_id = $1 LIMIT 1",
    [usuarioId],
  );
  const midioSuNivel = diagnosticos.length > 0;

  return {
    nivel: midioSuNivel ? u.nivel_mcer : null,
    racha: u.racha_dias || 0,
    actividadesHoy: actividadesDeHoy(u),
    metaDiaria: META_DIARIA,
    monedas: u.monedas || 0,
    palabrasPorRepasar: Number(v.por_repasar) || 0,
    palabrasDebiles: Number(v.debiles) || 0,
    ayudaEspanol: u.ayuda_es !== false,
  };
}

const MentorController = {
  /** Devuelve el consejo inmediato, calculado con reglas: sin IA y sin espera. */
  async estado(req, res) {
    try {
      const estado = await leerEstado(req.usuario.id);
      res.json({ estado, consejo: elegirConsejo(estado) });
    } catch (error) {
      reportarError("Error en /mentor/estado", error);
      res.status(500).json({ error: "No se pudo leer tu progreso" });
    }
  },

  /** Devuelve el consejo del día redactado por la IA, o el de reglas si la IA falla. */
  async consejoDelDia(req, res) {
    let estado;
    try {
      estado = await leerEstado(req.usuario.id);
    } catch (error) {
      reportarError("Error leyendo el estado para el consejo del día", error);
      return res.status(500).json({ error: "No se pudo leer tu progreso" });
    }

    try {
      const texto = await generarConsejoDelDia(estado, estado.ayudaEspanol);
      if (!texto) throw new Error("La IA devolvió un consejo vacío");
      res.json({ texto, origen: "ia" });
    } catch (error) {
      // Que la IA no responda no puede dejar al avatar mudo: cae al consejo de reglas
      if (error.status !== 429) reportarError("Error generando el consejo del día", error);
      res.json({ texto: elegirConsejo(estado).texto, origen: "reglas" });
    }
  },

  /** Abre la charla: devuelve el saludo con que Tuti empieza, sin gastar IA. */
  async saludo(req, res) {
    try {
      const estado = await leerEstado(req.usuario.id);
      res.json({
        texto: saludoInicial(estado, estado.ayudaEspanol),
        idioma: estado.ayudaEspanol ? "es" : "en",
      });
    } catch (error) {
      reportarError("Error abriendo la charla con el mentor", error);
      res.status(500).json({ error: "No se pudo abrir la charla" });
    }
  },

  /**
   * Un turno de conversación. El historial llega del navegador, así que se
   * limpia y se recorta antes de tocar la IA.
   */
  async charla(req, res) {
    const mensaje = limpiarMensaje(req.body && req.body.mensaje);
    if (!mensajeUtil(mensaje)) {
      return res.status(400).json({ error: "Escribe algo para que Tuti te responda" });
    }

    let estado;
    try {
      estado = await leerEstado(req.usuario.id);
    } catch (error) {
      reportarError("Error leyendo el estado para la charla", error);
      return res.status(500).json({ error: "No se pudo leer tu progreso" });
    }

    const historial = [
      ...(Array.isArray(req.body.historial) ? req.body.historial : []),
      { papel: "tu", texto: mensaje },
    ];
    const voz = { hablado: req.body.hablado === true, claridad: req.body.claridad };
    const idioma = estado.ayudaEspanol ? "es" : "en";

    try {
      const texto = await responderCharla(estado, historial, estado.ayudaEspanol, voz);
      if (!texto) throw new Error("La IA devolvió una respuesta vacía");
      res.json({ texto, origen: "ia", idioma });
    } catch (error) {
      // Si la IA no responde, Tuti no se queda mudo: contesta con el consejo de reglas
      if (error.status !== 429) reportarError("Error en la charla con el mentor", error);
      const disculpa = estado.ayudaEspanol
        ? "No alcancé a responderte eso ahora mismo, vuelve a escribírmelo en un momento. Mientras tanto: "
        : "I couldn't answer that right now — write it to me again in a moment. In the meantime: ";
      res.json({ texto: disculpa + elegirConsejo(estado).texto, origen: "reglas", idioma });
    }
  },
};

module.exports = MentorController;
