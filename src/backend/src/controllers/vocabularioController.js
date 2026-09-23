const pool = require("../config/db");
const { reportarError } = require("../utils/errores");

const { tarjetaDesdeFila, calificar, filaDesdeTarjeta } = require("../utils/repaso");
const { nivelDePalabra } = require("../utils/cefr");
const { ejemploPara, credito } = require("../utils/frasesTatoeba");

const DIA_MS = 24 * 60 * 60 * 1000;

const VocabularioController = {
  async repaso(req, res) {
    try {
      const { rows } = await pool.query(
        `SELECT id, palabra, traduccion, contexto, nivel_dominio
         FROM vocabulario_usuario
         WHERE usuario_id = $1 AND proximo_repaso <= NOW()
         ORDER BY proximo_repaso ASC
         LIMIT 10`,
        [req.usuario.id],
      );
      // Cada palabra lleva su nivel CEFR-J y, si hay, un ejemplo real de Tatoeba con su traducción
      const palabras = rows.map((fila) => {
        const ejemplo = ejemploPara(fila.palabra);
        return {
          ...fila,
          nivel: nivelDePalabra(fila.palabra),
          ejemplo: ejemplo
            ? { ingles: ejemplo.en, espanol: ejemplo.es, credito: credito(ejemplo) }
            : null,
        };
      });
      res.json({ palabras });
    } catch (error) {
      reportarError("Error en /vocabulario/repaso", error);
      res.status(500).json({ error: "No se pudo cargar tu vocabulario" });
    }
  },

  async responder(req, res) {
    try {
      const { id, sabia } = req.body;

      const { rows } = await pool.query(
        `SELECT nivel_dominio, proximo_repaso, ultimo_repaso, fsrs_estabilidad, fsrs_dificultad,
                fsrs_estado, fsrs_pasos, fsrs_repasos, fsrs_fallos, fsrs_dias_programados
           FROM vocabulario_usuario WHERE id = $1 AND usuario_id = $2`,
        [id, req.usuario.id],
      );

      if (!rows[0]) {
        return res.status(404).json({ error: "Palabra no encontrada" });
      }

      // FSRS calcula cuándo debe volver según lo difícil que ha sido esta palabra para esta persona
      const ahora = new Date();
      const f = filaDesdeTarjeta(calificar(tarjetaDesdeFila(rows[0], ahora), Boolean(sabia), ahora));

      await pool.query(
        `UPDATE vocabulario_usuario
            SET proximo_repaso = $1, ultimo_repaso = $2, fsrs_estabilidad = $3, fsrs_dificultad = $4,
                fsrs_estado = $5, fsrs_pasos = $6, fsrs_repasos = $7, fsrs_fallos = $8,
                fsrs_dias_programados = $9, nivel_dominio = $10
          WHERE id = $11 AND usuario_id = $12`,
        [f.proximo_repaso, f.ultimo_repaso, f.fsrs_estabilidad, f.fsrs_dificultad, f.fsrs_estado,
          f.fsrs_pasos, f.fsrs_repasos, f.fsrs_fallos, f.fsrs_dias_programados, f.nivel_dominio,
          id, req.usuario.id],
      );

      res.json({
        ok: true,
        nivelDominio: f.nivel_dominio,
        proximoRepaso: f.proximo_repaso,
        proximoRepasoEnDias: Math.round((f.proximo_repaso - ahora) / DIA_MS),
      });
    } catch (error) {
      reportarError("Error en /vocabulario/responder", error);
      res.status(500).json({ error: "No se pudo actualizar la palabra" });
    }
  },
};

module.exports = VocabularioController;
