// Convierte las filas del historial en series listas para graficar, sin tocar la base

const NIVELES = ["A1", "A2", "B1", "B2", "C1", "C2"];

const HABILIDADES = [
  { clave: "vocabulario", en: "Vocabulary", es: "Vocabulario" },
  { clave: "gramatica", en: "Grammar", es: "Gramática" },
  { clave: "comprension", en: "Comprehension", es: "Comprensión" },
  { clave: "fluidez", en: "Fluency", es: "Fluidez" },
];

/** Pasa un nivel MCER a su posición en la escala, para poder dibujarlo. */
function posicionDeNivel(nivel) {
  const i = NIVELES.indexOf(String(nivel || "").toUpperCase());
  return i === -1 ? null : i;
}

/** Deja los diagnósticos en orden y descarta los que no traen un nivel válido. */
function serieDeNiveles(filas) {
  return (filas || [])
    .map((f) => ({ fecha: f.fecha, nivel: f.nivel_mcer, posicion: posicionDeNivel(f.nivel_mcer) }))
    .filter((p) => p.posicion !== null)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

/**
 * Arma el porcentaje de acierto por semana. Las semanas sin actividad se rellenan
 * con null: dejar el hueco es más honesto que unir dos puntos lejanos con una recta.
 */
function aciertoPorSemana(filas, semanas = 8) {
  // El driver de Postgres devuelve las columnas date como objetos Date, no como
  // texto: convertirlas con String() daría "Mon Sep 14 2026" y nunca casaría
  const claveDeFecha = (valor) => {
    if (valor instanceof Date) return valor.toISOString().slice(0, 10);
    return String(valor == null ? "" : valor).slice(0, 10);
  };

  const porClave = new Map();
  (filas || []).forEach((f) => {
    const total = Number(f.total) || 0;
    if (!total) return;
    porClave.set(claveDeFecha(f.semana), {
      total,
      correctos: Number(f.correctos) || 0,
    });
  });

  const hoy = new Date();
  const lunesDeEstaSemana = new Date(
    Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()),
  );
  const desplazamiento = (lunesDeEstaSemana.getUTCDay() + 6) % 7;
  lunesDeEstaSemana.setUTCDate(lunesDeEstaSemana.getUTCDate() - desplazamiento);

  const serie = [];
  for (let atras = semanas - 1; atras >= 0; atras--) {
    const lunes = new Date(lunesDeEstaSemana);
    lunes.setUTCDate(lunes.getUTCDate() - atras * 7);
    const clave = lunes.toISOString().slice(0, 10);
    const dato = porClave.get(clave);

    serie.push({
      semana: clave,
      total: dato ? dato.total : 0,
      correctos: dato ? dato.correctos : 0,
      porcentaje: dato ? Math.round((dato.correctos / dato.total) * 100) : null,
    });
  }
  return serie;
}

/** Compara el primer diagnóstico contra el último, habilidad por habilidad. */
function compararHabilidades(filas, enEspanol = true) {
  const ordenadas = (filas || [])
    .slice()
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  if (ordenadas.length === 0) return [];

  const primero = ordenadas[0];
  const ultimo = ordenadas[ordenadas.length - 1];
  const idioma = enEspanol ? "es" : "en";

  // Number(null) da 0, así que una habilidad sin puntuar dibujaría un cero que
  // nadie sacó: se comprueba antes de convertir
  const puntaje = (fila, clave) => {
    const valor = fila[clave];
    if (valor === null || valor === undefined || valor === "") return NaN;
    return Number(valor);
  };

  return HABILIDADES.map((h) => {
    const antes = puntaje(primero, h.clave);
    const despues = puntaje(ultimo, h.clave);
    const validos = Number.isFinite(antes) && Number.isFinite(despues);
    return {
      clave: h.clave,
      nombre: h[idioma],
      antes: validos ? antes : null,
      despues: validos ? despues : null,
      delta: validos ? despues - antes : null,
    };
  }).filter((h) => h.antes !== null);
}

/** Resume el historial en los cuatro números que encabezan la pantalla. */
function resumenTotales({ ejercicios, conversaciones, palabras, usuario, diagnosticos }) {
  const total = Number(ejercicios && ejercicios.total) || 0;
  const correctos = Number(ejercicios && ejercicios.correctos) || 0;
  const serie = serieDeNiveles(diagnosticos);

  return {
    ejercicios: total,
    acierto: total > 0 ? Math.round((correctos / total) * 100) : null,
    conversaciones: Number(conversaciones) || 0,
    palabras: Number(palabras) || 0,
    rachaMaxima: Number(usuario && usuario.racha_maxima) || 0,
    nivelActual: serie.length ? serie[serie.length - 1].nivel : null,
    nivelInicial: serie.length ? serie[0].nivel : null,
    diagnosticos: serie.length,
  };
}

/** Dice si hay material suficiente para que la pantalla valga la pena. */
function hayHistorial(resumen) {
  return (
    resumen.ejercicios > 0 ||
    resumen.conversaciones > 0 ||
    resumen.palabras > 0 ||
    resumen.diagnosticos > 0
  );
}

module.exports = {
  NIVELES,
  HABILIDADES,
  posicionDeNivel,
  serieDeNiveles,
  aciertoPorSemana,
  compararHabilidades,
  resumenTotales,
  hayHistorial,
};
