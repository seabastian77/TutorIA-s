const pool = require("../config/db");
const { reportarError } = require("../utils/errores");
const {
  NOMBRES_LIGA,
  TAMANO_GRUPO,
  SUBEN,
  BAJAN,
  asegurarFilaSemana,
} = require("../utils/ligas");

/** Cuántos días faltan para que cierre la semana (cierra el lunes). */
function diasParaElCierre(semanaISO) {
  const inicio = new Date(`${semanaISO}T00:00:00Z`);
  const cierre = new Date(inicio);
  cierre.setUTCDate(cierre.getUTCDate() + 7);

  const ahora = new Date();
  const hoy = new Date(
    Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()),
  );

  return Math.max(0, Math.round((cierre - hoy) / (1000 * 60 * 60 * 24)));
}

const LigaController = {
  async clasificacion(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const fila = await asegurarFilaSemana(usuarioId);

      const { rows: tabla } = await pool.query(
        `SELECT u.id, u.nombre, ls.xp
           FROM liga_semanal ls
           JOIN usuarios u ON u.id = ls.usuario_id
          WHERE ls.semana = $1 AND ls.liga = $2 AND ls.grupo = $3
          ORDER BY ls.xp DESC, u.nombre ASC
          LIMIT $4`,
        [fila.semana, fila.liga, fila.grupo, TAMANO_GRUPO],
      );

      const clasificacion = tabla.map((f, indice) => ({
        posicion: indice + 1,
        nombre: f.nombre,
        xp: f.xp,
        esTu: f.id === usuarioId,
        zona:
          indice < SUBEN
            ? "ascenso"
            : tabla.length >= SUBEN + BAJAN && indice >= tabla.length - BAJAN
              ? "descenso"
              : "neutra",
      }));

      const mia = clasificacion.find((f) => f.esTu);

      res.json({
        liga: fila.liga,
        ligaNombre: NOMBRES_LIGA[fila.liga] || fila.liga,
        grupo: fila.grupo,
        semana: fila.semana,
        diasRestantes: diasParaElCierre(fila.semana),
        tuPosicion: mia ? mia.posicion : null,
        tuXp: mia ? mia.xp : 0,
        participantes: clasificacion.length,
        suben: SUBEN,
        bajan: BAJAN,
        movimiento: fila.movimiento || null,
        posicionAnterior: fila.posicionAnterior || null,
        clasificacion,
      });
    } catch (error) {
      reportarError("Error en /liga/clasificacion", error);
      res.status(500).json({ error: "No se pudo cargar la clasificación" });
    }
  },
};

module.exports = LigaController;
