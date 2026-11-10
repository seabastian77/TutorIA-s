const pool = require("../config/db");
const { reportarError } = require("../utils/errores");
const { normalizarReporte, REPORTES_POR_DIA } = require("../utils/reportes");

const ReportesController = {
  /** Guarda el reporte de un ejercicio mal hecho; un tope diario evita el abuso. */
  async crear(req, res) {
    try {
      const datos = normalizarReporte(req.body);
      if (datos.error) return res.status(400).json({ error: datos.error });

      const { rows: hoy } = await pool.query(
        "SELECT COUNT(*)::int AS n FROM reportes_ejercicio WHERE usuario_id = $1 AND fecha > NOW() - INTERVAL '1 day'",
        [req.usuario.id],
      );
      if (hoy[0].n >= REPORTES_POR_DIA) {
        return res.status(429).json({ error: "You've sent a lot of reports today. Thanks! Try again tomorrow." });
      }

      const { rows } = await pool.query(
        `INSERT INTO reportes_ejercicio (usuario_id, modulo, motivo, comentario, contenido)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         RETURNING id, fecha`,
        [req.usuario.id, datos.modulo, datos.motivo, datos.comentario, JSON.stringify(datos.contenido)],
      );
      res.status(201).json({ id: rows[0].id, fecha: rows[0].fecha });
    } catch (error) {
      reportarError("Error en /reportes", error);
      res.status(500).json({ error: "Could not send the report" });
    }
  },

  /** Lista para el equipo, sin decir quién reportó: solo el ejercicio y el motivo. */
  async listar(req, res) {
    try {
      const estado = req.query.estado === "revisado" ? "revisado" : "nuevo";
      const { rows } = await pool.query(
        `SELECT id, modulo, motivo, comentario, contenido, estado, fecha, revisado_en
           FROM reportes_ejercicio
          WHERE estado = $1
          ORDER BY fecha DESC
          LIMIT 50`,
        [estado],
      );
      const { rows: conteo } = await pool.query(
        "SELECT estado, COUNT(*)::int AS n FROM reportes_ejercicio GROUP BY estado",
      );
      const total = Object.fromEntries(conteo.map((c) => [c.estado, c.n]));
      res.json({ estado, reportes: rows, nuevos: total.nuevo || 0, revisados: total.revisado || 0 });
    } catch (error) {
      reportarError("Error en /reportes (lista)", error);
      res.status(500).json({ error: "Could not load the reports" });
    }
  },

  /** Marca un reporte como revisado cuando el equipo ya lo atendió. */
  async marcarRevisado(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid report" });
      const { rowCount } = await pool.query(
        "UPDATE reportes_ejercicio SET estado = 'revisado', revisado_en = NOW() WHERE id = $1 AND estado = 'nuevo'",
        [id],
      );
      if (!rowCount) return res.status(404).json({ error: "That report doesn't exist or was already reviewed" });
      res.json({ id, estado: "revisado" });
    } catch (error) {
      reportarError("Error en /reportes (revisar)", error);
      res.status(500).json({ error: "Could not update the report" });
    }
  },
};

module.exports = ReportesController;
