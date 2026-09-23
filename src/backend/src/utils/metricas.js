// Cálculos de las métricas del estudio: solo cifras agregadas, nunca datos de una persona

const NIVELES = ["A1", "A2", "B1", "B2", "C1", "C2"];
const HABILIDADES = ["vocabulario", "gramatica", "comprension", "fluidez"];
const SEMANAS_POR_DEFECTO = 8;

const NOMBRES_MODULO = {
  practica: "Daily Practice",
  voz: "Talk to the AI",
  roleplay: "Real Situations",
  escena: "Scene Mode",
  audio: "Audio Lab",
  biblioteca: "Library",
  juegos: "Word Games",
  visual: "Photo practice",
  nivel: "Level Check",
  otro: "Other",
};

/** Lista de correos con acceso a las métricas, tomada de ADMIN_CORREOS. */
function correosAdmin(env = process.env) {
  return (env.ADMIN_CORREOS || "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
}

/** Dice si ese correo puede ver las métricas del estudio. */
function esAdmin(correo, env = process.env) {
  if (!correo) return false;
  return correosAdmin(env).includes(String(correo).trim().toLowerCase());
}

/** Porcentaje redondeado a un decimal; sin base devuelve null en vez de inventar un cero. */
function porcentaje(parte, total) {
  if (!total) return null;
  return Math.round((parte / total) * 1000) / 10;
}

/** Lunes (UTC) de la semana de esa fecha, en formato AAAA-MM-DD. */
function lunesDe(fecha) {
  const d = new Date(fecha);
  const dia = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dia);
  return d.toISOString().slice(0, 10);
}

/** Las últimas n semanas, de la más vieja a la actual, como lunes. */
function semanasRecientes(hoy = new Date(), n = SEMANAS_POR_DEFECTO) {
  const actual = new Date(`${lunesDe(hoy)}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(actual);
    d.setUTCDate(d.getUTCDate() - 7 * (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

/** Rellena con ceros las semanas sin datos, para que la gráfica no salte semanas. */
function completarSemanas(filas, semanas, campos) {
  const porSemana = new Map(filas.map((f) => [lunesDe(f.semana), f]));
  return semanas.map((semana) => {
    const fila = porSemana.get(semana) || {};
    const salida = { semana };
    campos.forEach((c) => {
      salida[c] = Number(fila[c]) || 0;
    });
    return salida;
  });
}

/** Compara el primer y el último diagnóstico de cada estudiante que tenga al menos dos. */
function resumirCambioNivel(diagnosticos) {
  const porUsuario = new Map();
  diagnosticos.forEach((d) => {
    if (!porUsuario.has(d.usuario_id)) porUsuario.set(d.usuario_id, []);
    porUsuario.get(d.usuario_id).push(d);
  });

  let subieron = 0;
  let igual = 0;
  let bajaron = 0;
  const sumas = Object.fromEntries(HABILIDADES.map((h) => [h, { inicial: 0, actual: 0, n: 0 }]));

  porUsuario.forEach((lista) => {
    if (lista.length < 2) return;
    const orden = [...lista].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const primero = orden[0];
    const ultimo = orden[orden.length - 1];

    const cambio = NIVELES.indexOf(ultimo.nivel_mcer) - NIVELES.indexOf(primero.nivel_mcer);
    if (cambio > 0) subieron += 1;
    else if (cambio < 0) bajaron += 1;
    else igual += 1;

    HABILIDADES.forEach((h) => {
      if (primero[h] == null || ultimo[h] == null) return;
      sumas[h].inicial += Number(primero[h]);
      sumas[h].actual += Number(ultimo[h]);
      sumas[h].n += 1;
    });
  });

  const estudiantes = subieron + igual + bajaron;
  return {
    estudiantes,
    subieron,
    igual,
    bajaron,
    habilidades: HABILIDADES.map((h) => ({
      habilidad: h,
      estudiantes: sumas[h].n,
      inicial: sumas[h].n ? Math.round(sumas[h].inicial / sumas[h].n) : null,
      actual: sumas[h].n ? Math.round(sumas[h].actual / sumas[h].n) : null,
    })),
  };
}

/** Cuenta cuántos estudiantes medidos hay en cada nivel, en el orden del MCER. */
function distribuirNiveles(filas) {
  const conteo = new Map(filas.map((f) => [f.nivel, Number(f.estudiantes) || 0]));
  return NIVELES.map((nivel) => ({ nivel, estudiantes: conteo.get(nivel) || 0 }));
}

/** Pone nombre legible a cada módulo y los ordena del más usado al menos usado. */
function ordenarModulos(filas) {
  return filas
    .map((f) => ({
      modulo: f.modulo,
      nombre: NOMBRES_MODULO[f.modulo] || NOMBRES_MODULO.otro,
      actividades: Number(f.actividades) || 0,
      estudiantes: Number(f.estudiantes) || 0,
    }))
    .sort((a, b) => b.actividades - a.actividades);
}

module.exports = {
  NIVELES,
  HABILIDADES,
  NOMBRES_MODULO,
  SEMANAS_POR_DEFECTO,
  correosAdmin,
  esAdmin,
  porcentaje,
  lunesDe,
  semanasRecientes,
  completarSemanas,
  resumirCambioNivel,
  distribuirNiveles,
  ordenarModulos,
};
