const { generarPreguntaNivel } = require("../services/iaService");
const pool = require("../config/db");

const NIVELES_VALIDOS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const NivelController = {
  async pregunta(req, res) {
    try {
      const { nivel, excluir } = req.body;
      const nivelValido = NIVELES_VALIDOS.includes(nivel) ? nivel : "B1";

      const pregunta = await generarPreguntaNivel(nivelValido, excluir || []);
      res.json(pregunta);
    } catch (error) {
      console.error("Error en /nivel/pregunta:", error);
      res
        .status(500)
        .json({ error: "No se pudo generar la pregunta. Intenta de nuevo." });
    }
  },

  async finalizar(req, res) {
    try {
      const { nivel } = req.body;

      if (!NIVELES_VALIDOS.includes(nivel)) {
        return res.status(400).json({ error: "Nivel inválido" });
      }

      await pool.query("UPDATE usuarios SET nivel_mcer = $1 WHERE id = $2", [
        nivel,
        req.usuario.id,
      ]);
      res.json({ ok: true, nivel });
    } catch (error) {
      console.error("Error en /nivel/finalizar:", error);
      res.status(500).json({ error: "No se pudo guardar el nivel" });
    }
  },
};

module.exports = NivelController;
