// Valida lo que llega cuando un estudiante reporta un ejercicio y deja el contenido en un tamaño seguro

const MODULOS = ["practica", "lectura", "dictado", "comprension", "visual", "escena", "roleplay"];
const MOTIVOS = ["respuesta_incorrecta", "pregunta_confusa", "error_ingles", "traduccion", "otro"];
const LARGO_COMENTARIO = 500;
const LARGO_TEXTO = 400;
const LARGO_CONTENIDO = 4000;
const REPORTES_POR_DIA = 30;

/** Copia el contenido del ejercicio con límites: pocos niveles, listas cortas y textos recortados. */
function limpiarContenido(valor, nivel = 0) {
  if (valor == null) return null;
  if (typeof valor === "string") return valor.slice(0, LARGO_TEXTO);
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor === "boolean") return valor;
  if (nivel >= 3) return null;
  if (Array.isArray(valor)) return valor.slice(0, 10).map((v) => limpiarContenido(v, nivel + 1));
  if (typeof valor === "object") {
    const copia = {};
    Object.keys(valor).slice(0, 20).forEach((k) => {
      copia[String(k).slice(0, 40)] = limpiarContenido(valor[k], nivel + 1);
    });
    return copia;
  }
  return null;
}

/** Revisa el reporte; devuelve el error para el estudiante o los datos listos para guardar. */
function normalizarReporte(cuerpo) {
  const { modulo, motivo, comentario, contenido } = cuerpo || {};
  if (!MODULOS.includes(modulo)) return { error: "That exercise can't be reported" };
  if (!MOTIVOS.includes(motivo)) return { error: "Choose what's wrong with the exercise" };
  if (comentario != null && typeof comentario !== "string") return { error: "The comment must be text" };

  const texto = (comentario || "").replace(/\s+/g, " ").trim().slice(0, LARGO_COMENTARIO);
  let limpio = limpiarContenido(contenido && typeof contenido === "object" ? contenido : {});
  if (JSON.stringify(limpio).length > LARGO_CONTENIDO) limpio = { recortado: true };

  return { modulo, motivo, comentario: texto || null, contenido: limpio || {} };
}

module.exports = {
  MODULOS,
  MOTIVOS,
  REPORTES_POR_DIA,
  limpiarContenido,
  normalizarReporte,
};
