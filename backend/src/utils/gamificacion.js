const pool = require("../config/db");

async function registrarActividad(usuarioId, puntosGanados) {
  const { rows } = await pool.query(
    "SELECT puntos, racha_dias, ultima_actividad FROM usuarios WHERE id = $1",
    [usuarioId],
  );
  const usuario = rows[0] || {
    puntos: 0,
    racha_dias: 0,
    ultima_actividad: null,
  };

  const hoy = new Date().toISOString().slice(0, 10);
  let nuevaRacha = usuario.racha_dias || 0;

  if (usuario.ultima_actividad) {
    const ultima = new Date(usuario.ultima_actividad)
      .toISOString()
      .slice(0, 10);
    const diffDias = Math.round(
      (new Date(hoy) - new Date(ultima)) / (1000 * 60 * 60 * 24),
    );

    if (diffDias === 0) {
      // ya había practicado hoy, la racha no cambia
    } else if (diffDias === 1) {
      nuevaRacha += 1; // practicó ayer y hoy: sigue la racha
    } else {
      nuevaRacha = 1; // se le rompió la racha, arranca de nuevo
    }
  } else {
    nuevaRacha = 1; // primera actividad registrada
  }

  const nuevosPuntos = (usuario.puntos || 0) + puntosGanados;

  await pool.query(
    "UPDATE usuarios SET puntos = $1, racha_dias = $2, ultima_actividad = $3 WHERE id = $4",
    [nuevosPuntos, nuevaRacha, hoy, usuarioId],
  );

  return { puntos: nuevosPuntos, racha: nuevaRacha };
}

module.exports = { registrarActividad };
