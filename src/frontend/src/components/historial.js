// Pantalla de progreso: dibuja en SVG el historial que hasta ahora solo vivía en la base

const NIVELES_MCER = ["A1", "A2", "B1", "B2", "C1", "C2"];

// Un solo acento para todo el módulo: el color nunca carga identidad, solo realce
const TINTA_DATO = "#4338ca";
const TINTA_ANTES = "#94a3b8";
const SUPERFICIE = "#ffffff";

const TEXTOS = {
  es: {
    titulo: "Mi progreso",
    bajada: "Todo lo que has hecho en TutorIA's, reunido.",
    vacio: "Todavía no hay nada que mostrar",
    vacioNota: "Haz el Level Check y unos cuantos ejercicios; aquí vas a ver cómo avanzas.",
    ejercicios: "Ejercicios", acierto: "Acierto", conversaciones: "Conversaciones",
    palabras: "Palabras", racha: "Mejor racha", dias: "días",
    nivelTitulo: "Tu nivel a lo largo del tiempo",
    nivelNota: "Cada punto es un diagnóstico terminado.",
    nivelUno: "Con un solo diagnóstico todavía no hay línea. Repite el Level Check más adelante para verla.",
    semanaTitulo: "Acierto por semana",
    semanaNota: "Porcentaje de ejercicios correctos en las últimas 8 semanas.",
    semanaVacio: "Aún no has resuelto ejercicios.",
    habTitulo: "Tus cuatro habilidades",
    habNota: "Del primer diagnóstico al último.",
    habUno: "Con un solo diagnóstico se muestra el punto de partida.",
    antes: "Primero", despues: "Último",
    resumenTitulo: "Lo que dijo la IA en tu último diagnóstico",
    verDatos: "Ver los datos en tabla", ocultarDatos: "Ocultar la tabla",
    semana: "Semana", total: "Ejercicios", correctos: "Correctos", porcentaje: "Acierto",
    sinDatos: "sin actividad", volver: "Back to Home",
  },
  en: {
    titulo: "My progress",
    bajada: "Everything you've done on TutorIA's, in one place.",
    vacio: "Nothing to show yet",
    vacioNota: "Take the Level Check and a few exercises; this is where you'll watch yourself improve.",
    ejercicios: "Exercises", acierto: "Accuracy", conversaciones: "Conversations",
    palabras: "Words", racha: "Best streak", dias: "days",
    nivelTitulo: "Your level over time",
    nivelNota: "Each point is a completed diagnostic.",
    nivelUno: "One diagnostic isn't a line yet. Take the Level Check again later to see it.",
    semanaTitulo: "Accuracy by week",
    semanaNota: "Percentage of correct exercises over the last 8 weeks.",
    semanaVacio: "You haven't answered any exercises yet.",
    habTitulo: "Your four skills",
    habNota: "From your first diagnostic to your latest.",
    habUno: "With one diagnostic this shows your starting point.",
    antes: "First", despues: "Latest",
    resumenTitulo: "What the AI said in your last diagnostic",
    verDatos: "See the data as a table", ocultarDatos: "Hide the table",
    semana: "Week", total: "Exercises", correctos: "Correct", porcentaje: "Accuracy",
    sinDatos: "no activity", volver: "Back to Home",
  },
};

let datosHistorial = null;
let tablaVisible = false;

const esc = (t) =>
  String(t == null ? "" : t).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

/** Pasa una fecha a un texto corto tipo "5 mar". */
function fechaCorta(valor, enEspanol) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(enEspanol ? "es-CO" : "en-US", {
    day: "numeric", month: "short", timeZone: "UTC",
  });
}

/** Línea escalonada con la evolución del nivel; una sola serie, sin leyenda. */
function graficaNiveles(niveles, t, enEspanol) {
  if (!niveles.length) return "";
  if (niveles.length === 1) {
    return `<p class="grafica-aviso">${esc(t.nivelUno)} <b>${esc(niveles[0].nivel)}</b></p>`;
  }

  const ancho = 640, alto = 210, izq = 40, der = 22, arriba = 18, abajo = 30;
  const util = ancho - izq - der;
  const utilAlto = alto - arriba - abajo;
  const paso = niveles.length > 1 ? util / (niveles.length - 1) : 0;
  const x = (i) => izq + paso * i;
  const y = (pos) => arriba + utilAlto - (pos / (NIVELES_MCER.length - 1)) * utilAlto;

  const rejilla = NIVELES_MCER.map(
    (n, i) =>
      `<line x1="${izq}" y1="${y(i)}" x2="${ancho - der}" y2="${y(i)}" class="rejilla"/>
       <text x="${izq - 9}" y="${y(i) + 4}" class="eje-txt" text-anchor="end">${n}</text>`,
  ).join("");

  const linea = niveles.map((p, i) => `${i ? "L" : "M"}${x(i)} ${y(p.posicion)}`).join(" ");

  const puntos = niveles
    .map((p, i) => {
      const ultimo = i === niveles.length - 1;
      return `<g class="punto" tabindex="0" role="img"
          aria-label="${esc(fechaCorta(p.fecha, enEspanol))}: ${esc(p.nivel)}">
        <title>${esc(fechaCorta(p.fecha, enEspanol))} — ${esc(p.nivel)}</title>
        <circle cx="${x(i)}" cy="${y(p.posicion)}" r="6" class="punto-aro"/>
        <circle cx="${x(i)}" cy="${y(p.posicion)}" r="4" class="punto-dato"/>
        ${ultimo ? `<text x="${x(i)}" y="${y(p.posicion) - 14}" class="dato-etq" text-anchor="middle">${esc(p.nivel)}</text>` : ""}
      </g>`;
    })
    .join("");

  const fechas = niveles
    .map((p, i) =>
      i === 0 || i === niveles.length - 1
        ? `<text x="${x(i)}" y="${alto - 8}" class="eje-txt" text-anchor="${i ? "end" : "start"}">${esc(fechaCorta(p.fecha, enEspanol))}</text>`
        : "",
    )
    .join("");

  return `<svg viewBox="0 0 ${ancho} ${alto}" class="grafica" role="img"
      aria-label="${esc(t.nivelTitulo)}">${rejilla}
      <path d="${linea}" class="linea-dato"/>${puntos}${fechas}</svg>`;
}

/** Columnas del acierto semanal; las semanas sin actividad quedan en blanco. */
function graficaSemanas(semanas, t, enEspanol) {
  const conDatos = semanas.filter((s) => s.porcentaje !== null);
  if (!conDatos.length) return `<p class="grafica-aviso">${esc(t.semanaVacio)}</p>`;

  const ancho = 640, alto = 210, izq = 40, der = 16, arriba = 22, abajo = 30;
  const util = ancho - izq - der;
  const utilAlto = alto - arriba - abajo;
  const banda = util / semanas.length;
  const grosor = Math.min(24, banda - 10);

  const rejilla = [0, 25, 50, 75, 100]
    .map((v) => {
      const y = arriba + utilAlto - (v / 100) * utilAlto;
      return `<line x1="${izq}" y1="${y}" x2="${ancho - der}" y2="${y}" class="rejilla"/>
        <text x="${izq - 9}" y="${y + 4}" class="eje-txt" text-anchor="end">${v}%</text>`;
    })
    .join("");

  const mejor = Math.max(...conDatos.map((s) => s.porcentaje));

  const columnas = semanas
    .map((s, i) => {
      const cx = izq + banda * i + banda / 2;
      const etq = fechaCorta(s.semana, enEspanol);
      if (s.porcentaje === null) {
        return `<text x="${cx}" y="${alto - 8}" class="eje-txt tenue ${i % 2 ? "alterna" : ""}" text-anchor="middle">${esc(etq)}</text>`;
      }
      const altura = Math.max(3, (s.porcentaje / 100) * utilAlto);
      const y = arriba + utilAlto - altura;
      const destacada = s.porcentaje === mejor;
      return `<g class="columna" tabindex="0" role="img"
          aria-label="${esc(etq)}: ${s.porcentaje}% (${s.correctos}/${s.total})">
        <title>${esc(etq)} — ${s.porcentaje}% · ${s.correctos}/${s.total}</title>
        <rect x="${cx - grosor / 2}" y="${y}" width="${grosor}" height="${altura}"
              rx="4" class="barra-dato"/>
        ${destacada ? `<text x="${cx}" y="${y - 7}" class="dato-etq" text-anchor="middle">${s.porcentaje}%</text>` : ""}
        <text x="${cx}" y="${alto - 8}" class="eje-txt ${i % 2 ? "alterna" : ""}" text-anchor="middle">${esc(etq)}</text>
      </g>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${ancho} ${alto}" class="grafica" role="img"
      aria-label="${esc(t.semanaTitulo)}">${rejilla}${columnas}</svg>`;
}

/** Mancuerna por habilidad: el punto gris es el arranque y el de color, hoy. */
function graficaHabilidades(habilidades, t) {
  if (!habilidades.length) return "";

  const ancho = 640, izq = 152, der = 46, alto = 40 * habilidades.length + 44;
  const util = ancho - izq - der;
  const x = (v) => izq + (Math.max(0, Math.min(100, v)) / 100) * util;

  const filas = habilidades
    .map((h, i) => {
      const y = 42 + i * 40;
      const igual = h.antes === h.despues;
      const signo = h.delta > 0 ? "+" : "";
      return `<g class="mancuerna" tabindex="0" role="img"
          aria-label="${esc(h.nombre)}: ${h.antes} → ${h.despues}">
        <title>${esc(h.nombre)}: ${esc(t.antes)} ${h.antes} · ${esc(t.despues)} ${h.despues}</title>
        <text x="${izq - 12}" y="${y + 4}" class="eje-txt" text-anchor="end">${esc(h.nombre)}</text>
        <line x1="${izq}" y1="${y}" x2="${ancho - der}" y2="${y}" class="rejilla"/>
        ${igual ? "" : `<line x1="${x(h.antes)}" y1="${y}" x2="${x(h.despues)}" y2="${y}" class="union"/>`}
        ${igual ? "" : `<circle cx="${x(h.antes)}" cy="${y}" r="6" class="punto-aro"/>
        <circle cx="${x(h.antes)}" cy="${y}" r="4" class="punto-antes"/>`}
        <circle cx="${x(h.despues)}" cy="${y}" r="7" class="punto-aro"/>
        <circle cx="${x(h.despues)}" cy="${y}" r="5" class="punto-dato"/>
        <text x="${ancho - der + 8}" y="${y + 4}" class="dato-etq ${h.delta > 0 ? "sube" : h.delta < 0 ? "baja" : ""}"
              text-anchor="start">${igual ? h.despues : signo + h.delta}</text>
      </g>`;
    })
    .join("");

  const leyenda = `<g class="leyenda">
      <circle cx="${izq}" cy="14" r="5" class="punto-antes"/>
      <text x="${izq + 14}" y="19" class="eje-txt">${esc(t.antes)}</text>
      <circle cx="${izq + 150}" cy="14" r="6" class="punto-dato"/>
      <text x="${izq + 164}" y="19" class="eje-txt">${esc(t.despues)}</text>
    </g>`;

  return `<svg viewBox="0 0 ${ancho} ${alto}" class="grafica" role="img"
      aria-label="${esc(t.habTitulo)}">${leyenda}${filas}</svg>`;
}

/** La misma información en tabla, para quien no puede leer la gráfica. */
function tablaSemanas(semanas, t) {
  const filas = semanas
    .map(
      (s) => `<tr><td>${esc(s.semana)}</td><td>${s.total || "—"}</td><td>${s.total ? s.correctos : "—"}</td>
        <td>${s.porcentaje === null ? esc(t.sinDatos) : s.porcentaje + "%"}</td></tr>`,
    )
    .join("");
  return `<table class="tabla-datos">
    <caption>${esc(t.semanaTitulo)}</caption>
    <thead><tr><th>${esc(t.semana)}</th><th>${esc(t.total)}</th><th>${esc(t.correctos)}</th><th>${esc(t.porcentaje)}</th></tr></thead>
    <tbody>${filas}</tbody></table>`;
}

function tarjeta(valor, etiqueta, sufijo = "") {
  return `<div class="cifra">
    <p class="cifra-valor">${esc(valor)}${sufijo ? `<span class="cifra-sufijo">${esc(sufijo)}</span>` : ""}</p>
    <p class="cifra-etq">${esc(etiqueta)}</p>
  </div>`;
}

function pintarHistorial(datos) {
  datosHistorial = datos;
  const t = TEXTOS[datos.enEspanol ? "es" : "en"];
  const caja = document.getElementById("historial-contenido");
  const r = datos.resumen;

  document.getElementById("historial-titulo").textContent = t.titulo;
  document.getElementById("btn-salir-historial").textContent = t.volver;

  if (!datos.hayHistorial) {
    caja.innerHTML = `<div class="tarjeta-tip" style="margin-top:0">
      <div><p class="tarjeta-tip-titulo">${esc(t.vacio)}</p>
      <p class="tarjeta-tip-texto">${esc(t.vacioNota)}</p></div></div>`;
    return;
  }

  const cifras = [
    tarjeta(r.ejercicios, t.ejercicios),
    r.acierto === null ? "" : tarjeta(r.acierto, t.acierto, "%"),
    tarjeta(r.conversaciones, t.conversaciones),
    tarjeta(r.palabras, t.palabras),
    tarjeta(r.rachaMaxima, t.racha, " " + t.dias),
  ].join("");

  const bloque = (titulo, nota, cuerpo) =>
    !cuerpo ? "" : `<section class="bloque-grafica">
      <h3 class="bloque-titulo">${esc(titulo)}</h3>
      <p class="bloque-nota">${esc(nota)}</p>${cuerpo}</section>`;

  caja.innerHTML = `
    <div class="cifras">${cifras}</div>
    ${bloque(t.nivelTitulo, t.nivelNota, graficaNiveles(datos.niveles, t, datos.enEspanol))}
    ${bloque(t.semanaTitulo, t.semanaNota, graficaSemanas(datos.semanas, t, datos.enEspanol))}
    ${bloque(t.habTitulo, datos.habilidades.length && r.diagnosticos === 1 ? t.habUno : t.habNota,
      graficaHabilidades(datos.habilidades, t))}
    ${!datos.ultimoResumen ? "" : `<section class="bloque-grafica">
      <h3 class="bloque-titulo">${esc(t.resumenTitulo)}</h3>
      <p class="resumen-ia">${esc(datos.ultimoResumen)}</p></section>`}
    <button id="btn-tabla-datos" class="btn-secundario" type="button"
            aria-expanded="false">${esc(t.verDatos)}</button>
    <div id="caja-tabla" class="oculto">${tablaSemanas(datos.semanas, t)}</div>`;

  tablaVisible = false;
  document.getElementById("btn-tabla-datos").addEventListener("click", alternarTabla);
}

function alternarTabla() {
  const t = TEXTOS[datosHistorial && datosHistorial.enEspanol ? "es" : "en"];
  tablaVisible = !tablaVisible;
  const boton = document.getElementById("btn-tabla-datos");
  document.getElementById("caja-tabla").classList.toggle("oculto", !tablaVisible);
  boton.setAttribute("aria-expanded", String(tablaVisible));
  boton.textContent = tablaVisible ? t.ocultarDatos : t.verDatos;
}

async function abrirHistorial() {
  const vista = document.getElementById("vista-historial");
  const caja = document.getElementById("historial-contenido");
  document.querySelectorAll(".pantalla-principal").forEach((v) => v.classList.add("oculto"));
  vista.classList.remove("oculto");
  caja.innerHTML = '<p class="bloque-nota">…</p>';

  try {
    pintarHistorial(await HistorialAPI.obtenerProgreso());
  } catch (err) {
    caja.innerHTML = `<p class="bloque-nota">${esc(err.message || "Error")}</p>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const abridor = document.getElementById("progreso-usuario");
  if (abridor) {
    abridor.addEventListener("click", abrirHistorial);
    abridor.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      abrirHistorial();
    });
  }

  const salir = document.getElementById("btn-salir-historial");
  if (salir) {
    salir.addEventListener("click", () => {
      document.getElementById("vista-historial").classList.add("oculto");
      document.getElementById("vista-principal").classList.remove("oculto");
    });
  }
});

window.abrirHistorial = abrirHistorial;
