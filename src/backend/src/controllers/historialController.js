const pool = require("../config/db");
const { reportarError } = require("../utils/errores");
const {
  serieDeNiveles,
  aciertoPorSemana,
  compararHabilidades,
  resumenTotales,
  hayHistorial,
} = require("../utils/progresoSerie");

const SEMANAS = 8;

const HistorialController = {
  /** Devuelve todo lo que la pantalla de progreso necesita, en una sola llamada. */
  async progreso(req, res) {
    const id = req.usuario.id;

    try {
      const [diagnosticos, semanas, ejercicios, conversaciones, palabras, usuario] =
        await Promise.all([
          pool.query(
            `SELECT nivel_mcer, vocabulario, gramatica, comprension, fluidez, resumen, fecha
               FROM diagnosticos_nivel WHERE usuario_id = $1 ORDER BY fecha ASC`,
            [id],
          ),
          pool.query(
            `SELECT date_trunc('week', fecha)::date AS semana,
                    COUNT(*)                        AS total,
                    COUNT(*) FILTER (WHERE correcto) AS correctos
               FROM ejercicios
              WHERE usuario_id = $1
                AND fecha >= date_trunc('week', NOW()) - INTERVAL '${SEMANAS - 1} weeks'
              GROUP BY semana ORDER BY semana ASC`,
            [id],
          ),
          pool.query(
            `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE correcto) AS correctos
               FROM ejercicios WHERE usuario_id = $1`,
            [id],
          ),
          pool.query("SELECT COUNT(*) AS total FROM conversaciones WHERE usuario_id = $1", [id]),
          pool.query("SELECT COUNT(*) AS total FROM vocabulario_usuario WHERE usuario_id = $1", [id]),
          pool.query("SELECT racha_maxima, ayuda_es FROM usuarios WHERE id = $1", [id]),
        ]);

      const u = usuario.rows[0] || {};
      const enEspanol = u.ayuda_es !== false;

      const resumen = resumenTotales({
        ejercicios: ejercicios.rows[0],
        conversaciones: conversaciones.rows[0].total,
        palabras: palabras.rows[0].total,
        usuario: u,
        diagnosticos: diagnosticos.rows,
      });

      // El párrafo que la IA escribió en el último diagnóstico nunca se volvía a leer
      const ultimo = diagnosticos.rows[diagnosticos.rows.length - 1];

      res.json({
        resumen,
        hayHistorial: hayHistorial(resumen),
        niveles: serieDeNiveles(diagnosticos.rows),
        semanas: aciertoPorSemana(semanas.rows, SEMANAS),
        habilidades: compararHabilidades(diagnosticos.rows, enEspanol),
        ultimoResumen: (ultimo && ultimo.resumen) || null,
        enEspanol,
      });
    } catch (error) {
      reportarError("Error en /historial/progreso", error);
      res.status(500).json({ error: "No se pudo cargar tu historial" });
    }
  },
};

module.exports = HistorialController;
