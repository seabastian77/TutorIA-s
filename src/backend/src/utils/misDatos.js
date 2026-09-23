// Qué datos tiene la app de cada estudiante: la misma lista sirve para entregarlos y para borrarlos

const { escaparHtml } = require("./recuperacion");

// Cada tabla con datos de una persona, las columnas que se le entregan y su orden
const TABLAS_DEL_USUARIO = [
  { tabla: "diagnosticos_nivel", clave: "diagnosticos", columnas: "nivel_mcer, vocabulario, gramatica, comprension, fluidez, resumen, fecha", orden: "fecha" },
  { tabla: "ejercicios", clave: "ejercicios", columnas: "tipo, nivel_dificultad, contenido, correcto, fecha", orden: "fecha" },
  { tabla: "conversaciones", clave: "conversaciones", columnas: "mensaje_usuario, respuesta_ia, correcciones, fecha", orden: "fecha" },
  { tabla: "roleplays", clave: "situaciones", columnas: "escenario, turnos, fecha", orden: "fecha" },
  { tabla: "lecturas_completadas", clave: "lecturas", columnas: "lectura_id, aciertos, total, fecha", orden: "fecha" },
  { tabla: "vocabulario_usuario", clave: "vocabulario", columnas: "palabra, traduccion, contexto, nivel_dominio, proximo_repaso, fecha_creacion", orden: "fecha_creacion" },
  { tabla: "liga_semanal", clave: "liga", columnas: "semana, liga, grupo, xp", orden: "semana" },
  { tabla: "compras_tienda", clave: "compras", columnas: "articulo_id, precio, fecha", orden: "fecha" },
  { tabla: "actividades", clave: "actividades", columnas: "modulo, xp, perfecto, fecha", orden: "fecha" },
  { tabla: "recuperaciones_contrasena", clave: null, columnas: null }, // solo se borra: guarda hashes, no datos útiles
];

/** Dice si el correo escrito es el de la cuenta, sin importar mayúsculas ni espacios. */
function correoCoincide(escrito, real) {
  if (!escrito || !real) return false;
  return String(escrito).trim().toLowerCase() === String(real).trim().toLowerCase();
}

/** Arma la parte de la cuenta que se entrega, sin la clave ni el identificador de Google. */
function cuentaParaEntregar(u) {
  return {
    nombre: u.nombre,
    correo: u.correo,
    registradoEl: u.fecha_registro,
    ultimoAcceso: u.ultimo_acceso,
    entraConGoogle: Boolean(u.google_id),
    tieneContrasena: Boolean(u.contrasena_hash),
    nivelMcer: u.nivel_mcer,
    puntos: u.puntos,
    racha: u.racha_dias,
    rachaMaxima: u.racha_maxima,
    monedas: u.monedas,
    escudos: u.escudos,
    pistas: u.pistas,
    vidas: u.vidas,
    liga: u.liga,
    explicacionesEnEspanol: u.ayuda_es !== false,
    politicaAceptadaEl: u.politica_aceptada_en,
    politicaVersion: u.politica_version,
  };
}

/** El correo que confirma el borrado, en texto y en HTML. */
function correoDeDespedida(nombre) {
  const saludo = nombre ? `Hola ${nombre},` : "Hola,";
  const texto = [
    saludo,
    "",
    "Tu cuenta de TutorIA's y todos tus datos quedaron borrados, como lo pediste.",
    "Si no fuiste tú, respóndenos a sebastiangonzalez304@gmail.com.",
    "",
    "Gracias por practicar con nosotros.",
    "TutorIA's",
  ].join("\n");

  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.55;color:#0b1b36">
  <p>${escaparHtml(saludo)}</p>
  <p>Tu cuenta de TutorIA's y todos tus datos quedaron borrados, como lo pediste.</p>
  <p style="color:#5a6478;font-size:13px">Si no fuiste tú, escríbenos a sebastiangonzalez304@gmail.com.</p>
  <p>Gracias por practicar con nosotros.<br>TutorIA's</p>
</div>`;

  return { asunto: "Tu cuenta de TutorIA's fue borrada", texto, html };
}

module.exports = {
  TABLAS_DEL_USUARIO,
  correoCoincide,
  cuentaParaEntregar,
  correoDeDespedida,
};
