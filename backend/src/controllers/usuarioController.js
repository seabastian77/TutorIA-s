const pool = require("../config/db");

const NIVELES = ["A1", "A2", "B1", "B2", "C1", "C2"];
const META_DIARIA = 5; // actividades por día para completar la meta

const LOGROS = [
  {
    id: "primeros_pasos",
    nombre: "First Steps",
    descripcion: "Complete your first practice exercise",
    icono: "fa-shoe-prints",
  },
  {
    id: "nivel_revisado",
    nombre: "Level Checked",
    descripcion: "Complete your first level diagnostic",
    icono: "fa-clipboard-check",
  },
  {
    id: "conversador",
    nombre: "Conversationalist",
    descripcion: "Have your first spoken exchange with the AI",
    icono: "fa-comments",
  },
  {
    id: "charlatan",
    nombre: "Talkative",
    descripcion: "Reach 10 spoken exchanges with the AI",
    icono: "fa-comment-dots",
  },
  {
    id: "en_racha",
    nombre: "On Fire",
    descripcion: "Reach a 3-day streak",
    icono: "fa-fire",
  },
  {
    id: "imparable",
    nombre: "Unstoppable",
    descripcion: "Reach a 7-day streak",
    icono: "fa-bolt",
  },
  {
    id: "coleccionista",
    nombre: "Point Collector",
    descripcion: "Earn 100 points",
    icono: "fa-star",
  },
  {
    id: "maestro_puntos",
    nombre: "Point Master",
    descripcion: "Earn 500 points",
    icono: "fa-trophy",
  },
  {
    id: "aprendiz_palabras",
    nombre: "Word Learner",
    descripcion: "Save 10 words to your vocabulary",
    icono: "fa-book",
  },
  {
    id: "maestro_vocabulario",
    nombre: "Vocabulary Master",
    descripcion: "Master 10 words (fully reviewed)",
    icono: "fa-graduation-cap",
  },
  {
    id: "estrella_ascenso",
    nombre: "Rising Star",
    descripcion: "Reach B2 level or higher",
    icono: "fa-rocket",
  },
];

const UsuarioController = {
  async progreso(req, res) {
    try {
      const { rows: urows } = await pool.query(
        "SELECT puntos, racha_dias, nivel_mcer, actividades_hoy FROM usuarios WHERE id = $1",
        [req.usuario.id],
      );
      const usuario = urows[0] || {};

      const { rows: diag } = await pool.query(
        `SELECT nivel_mcer, fecha FROM diagnosticos_nivel
         WHERE usuario_id = $1 ORDER BY fecha DESC LIMIT 2`,
        [req.usuario.id],
      );

      let tendencia = "sin-datos";
      if (diag.length === 2) {
        const actual = NIVELES.indexOf(diag[0].nivel_mcer);
        const anterior = NIVELES.indexOf(diag[1].nivel_mcer);
        if (actual > anterior) tendencia = "mejorando";
        else if (actual < anterior) tendencia = "bajando";
        else tendencia = "estable";
      }

      res.json({
        puntos: usuario.puntos || 0,
        racha: usuario.racha_dias || 0,
        nivel: usuario.nivel_mcer || null,
        tendencia,
        actividadesHoy: Math.min(usuario.actividades_hoy || 0, META_DIARIA),
        metaDiaria: META_DIARIA,
      });
    } catch (error) {
      console.error("Error en /usuario/progreso:", error);
      res.status(500).json({ error: "No se pudo obtener el progreso" });
    }
  },

  async logros(req, res) {
    try {
      const usuarioId = req.usuario.id;

      const [
        { rows: u },
        { rows: ejercicios },
        { rows: diagnosticos },
        { rows: conversaciones },
        { rows: vocabulario },
        { rows: vocabularioDominado },
        { rows: mejorNivelRows },
      ] = await Promise.all([
        pool.query("SELECT puntos, racha_dias FROM usuarios WHERE id = $1", [
          usuarioId,
        ]),
        pool.query(
          "SELECT COUNT(*)::int AS total FROM ejercicios WHERE usuario_id = $1",
          [usuarioId],
        ),
        pool.query(
          "SELECT COUNT(*)::int AS total FROM diagnosticos_nivel WHERE usuario_id = $1",
          [usuarioId],
        ),
        pool.query(
          "SELECT COUNT(*)::int AS total FROM conversaciones WHERE usuario_id = $1",
          [usuarioId],
        ),
        pool.query(
          "SELECT COUNT(*)::int AS total FROM vocabulario_usuario WHERE usuario_id = $1",
          [usuarioId],
        ),
        pool.query(
          "SELECT COUNT(*)::int AS total FROM vocabulario_usuario WHERE usuario_id = $1 AND nivel_dominio >= 3",
          [usuarioId],
        ),
        pool.query(
          "SELECT nivel_mcer FROM diagnosticos_nivel WHERE usuario_id = $1",
          [usuarioId],
        ),
      ]);

      const puntos = u[0]?.puntos || 0;
      const racha = u[0]?.racha_dias || 0;
      const totalEjercicios = ejercicios[0].total;
      const totalDiagnosticos = diagnosticos[0].total;
      const totalConversaciones = conversaciones[0].total;
      const totalVocabulario = vocabulario[0].total;
      const totalVocabularioDominado = vocabularioDominado[0].total;
      const mejorNivelIndice = mejorNivelRows.reduce(
        (max, row) => Math.max(max, NIVELES.indexOf(row.nivel_mcer)),
        -1,
      );

      const progresoPorId = {
        primeros_pasos: { actual: totalEjercicios, meta: 1 },
        nivel_revisado: { actual: totalDiagnosticos, meta: 1 },
        conversador: { actual: totalConversaciones, meta: 1 },
        charlatan: { actual: totalConversaciones, meta: 10 },
        en_racha: { actual: racha, meta: 3 },
        imparable: { actual: racha, meta: 7 },
        coleccionista: { actual: puntos, meta: 100 },
        maestro_puntos: { actual: puntos, meta: 500 },
        aprendiz_palabras: { actual: totalVocabulario, meta: 10 },
        maestro_vocabulario: { actual: totalVocabularioDominado, meta: 10 },
        estrella_ascenso: {
          actual: mejorNivelIndice + 1,
          meta: NIVELES.indexOf("B2") + 1,
        },
      };

      const logros = LOGROS.map((logro) => {
        const p = progresoPorId[logro.id];
        return {
          ...logro,
          actual: p.actual,
          meta: p.meta,
          desbloqueado: p.actual >= p.meta,
        };
      });

      res.json({ logros });
    } catch (error) {
      console.error("Error en /usuario/logros:", error);
      res.status(500).json({ error: "No se pudieron cargar los logros" });
    }
  },
};

module.exports = UsuarioController;
