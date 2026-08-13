const pool = require("../config/db");

// Repetición espaciada clásica: entre más dominas la palabra, más tarda en volver a aparecer
const INTERVALOS_DIAS = [1, 2, 4, 7, 14, 30];

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
      res.json({ palabras: rows });
    } catch (error) {
      console.error("Error en /vocabulario/repaso:", error);
      res.status(500).json({ error: "No se pudo cargar tu vocabulario" });
    }
  },

  async responder(req, res) {
    try {
      const { id, sabia } = req.body;

      const { rows } = await pool.query(
        "SELECT nivel_dominio FROM vocabulario_usuario WHERE id = $1 AND usuario_id = $2",
        [id, req.usuario.id],
      );

      if (!rows[0]) {
        return res.status(404).json({ error: "Palabra no encontrada" });
      }

      const nuevoNivel = sabia
        ? Math.min(rows[0].nivel_dominio + 1, INTERVALOS_DIAS.length - 1)
        : 0;

      const diasSiguiente = INTERVALOS_DIAS[nuevoNivel];

      await pool.query(
        `UPDATE vocabulario_usuario
         SET nivel_dominio = $1, proximo_repaso = NOW() + ($2 || ' days')::interval
         WHERE id = $3`,
        [nuevoNivel, diasSiguiente, id],
      );

      res.json({
        ok: true,
        nivelDominio: nuevoNivel,
        proximoRepasoEnDias: diasSiguiente,
      });
    } catch (error) {
      console.error("Error en /vocabulario/responder:", error);
      res.status(500).json({ error: "No se pudo actualizar la palabra" });
    }
  },
};

module.exports = VocabularioController;
