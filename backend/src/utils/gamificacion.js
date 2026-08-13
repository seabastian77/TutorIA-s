const pool = require("../config/db");

async function registrarActividad(usuarioId, puntosGanados) {
  const { rows } = await pool.query(
    "SELECT puntos, racha_dias, ultima_actividad, actividades_hoy FROM usuarios WHERE id = $1",
    [usuarioId],
  );
  const usuario = rows[0] || {
    puntos: 0,
    racha_dias: 0,
    ultima_actividad: null,
    actividades_hoy: 0,
  };

  const hoy = new Date().toISOString().slice(0, 10);
  let nuevaRacha = usuario.racha_dias || 0;
  let nuevasActividadesHoy = usuario.actividades_hoy || 0;

  if (usuario.ultima_actividad) {
    const ultima = new Date(usuario.ultima_actividad)
      .toISOString()
      .slice(0, 10);
    const diffDias = Math.round(
      (new Date(hoy) - new Date(ultima)) / (1000 * 60 * 60 * 24),
    );

    if (diffDias === 0) {
      nuevasActividadesHoy += 1; // sigue siendo el mismo día, suma a la meta diaria
    } else if (diffDias === 1) {
      nuevaRacha += 1; // practicó ayer y hoy: sigue la racha
      nuevasActividadesHoy = 1; // día nuevo, la meta diaria arranca de nuevo
    } else {
      nuevaRacha = 1; // se le rompió la racha, arranca de nuevo
      nuevasActividadesHoy = 1;
    }
  } else {
    nuevaRacha = 1;
    nuevasActividadesHoy = 1;
  }

  const nuevosPuntos = (usuario.puntos || 0) + puntosGanados;

  await pool.query(
    `UPDATE usuarios
     SET puntos = $1, racha_dias = $2, ultima_actividad = $3, actividades_hoy = $4
     WHERE id = $5`,
    [nuevosPuntos, nuevaRacha, hoy, nuevasActividadesHoy, usuarioId],
  );

  return {
    puntos: nuevosPuntos,
    racha: nuevaRacha,
    actividadesHoy: nuevasActividadesHoy,
  };
}

module.exports = { registrarActividad };
