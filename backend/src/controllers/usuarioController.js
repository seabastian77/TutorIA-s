const pool = require("../config/db");

const NIVELES = ["A1", "A2", "B1", "B2", "C1", "C2"];

const UsuarioController = {
  async progreso(req, res) {
    try {
      const { rows: urows } = await pool.query(
        "SELECT puntos, racha_dias, nivel_mcer FROM usuarios WHERE id = $1",
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
      });
    } catch (error) {
      console.error("Error en /usuario/progreso:", error);
      res.status(500).json({ error: "No se pudo obtener el progreso" });
    }
  },
};

module.exports = UsuarioController;
