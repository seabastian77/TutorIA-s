// Tablero de métricas del estudio: cifras agregadas y anónimas para el trabajo de grado

const SVG_NS = "http://www.w3.org/2000/svg";
const NOMBRE_HABILIDAD = {
  vocabulario: "Vocabulary",
  gramatica: "Grammar",
  comprension: "Comprehension",
  fluidez: "Fluency",
};

let metricasDatos = null;
let metricasObservador = null;

const formatoEntero = new Intl.NumberFormat("en-US");

const MESES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Escribe una semana (lunes) como "Sep 21". */
function semanaCorta(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${MESES[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Porcentaje con punto decimal, como lo muestra la interfaz en inglés. */
function textoPorcentaje(valor) {
  return valor == null ? "—" : `${valor}%`;
}

/** Crea un nodo SVG con sus atributos. */
function nodoSvg(tipo, atributos = {}) {
  const nodo = document.createElementNS(SVG_NS, tipo);
  Object.entries(atributos).forEach(([k, v]) => nodo.setAttribute(k, v));
  return nodo;
}

/** Texto dentro del SVG, siempre con textContent para no interpretar nada como HTML. */
function textoSvg(contenido, atributos) {
  const t = nodoSvg("text", atributos);
  t.textContent = contenido;
  return t;
}

/** Un máximo redondo para el eje, con cuatro divisiones limpias. */
function maximoRedondo(valor) {
  if (valor <= 4) return 4;
  const bruto = valor / 4;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].find((p) => p * potencia >= bruto) * potencia;
  return paso * 4;
}

/** Barra con el extremo de datos redondeado y la base recta. */
function trazoColumna(x, y, ancho, alto) {
  const r = Math.min(4, ancho / 2, alto);
  return `M${x},${y + alto} V${y + r} Q${x},${y} ${x + r},${y} H${x + ancho - r} Q${x + ancho},${y} ${x + ancho},${y + r} V${y + alto} Z`;
}

/** Barra horizontal con el extremo derecho redondeado. */
function trazoBarra(x, y, largo, grosor) {
  const r = Math.min(4, grosor / 2, largo);
  return `M${x},${y} H${x + largo - r} Q${x + largo},${y} ${x + largo},${y + r} V${y + grosor - r} Q${x + largo},${y + grosor} ${x + largo - r},${y + grosor} H${x} Z`;
}

/** Hace que una marca muestre su dato al pasar el puntero o al recibir el foco. */
function conTooltip(marca, tarjeta, valor, etiqueta) {
  const tip = tarjeta.querySelector(".grafica-tip");
  marca.setAttribute("tabindex", "0");
  marca.setAttribute("role", "img");
  marca.setAttribute("aria-label", `${etiqueta}: ${valor}`);
  marca.classList.add("grafica-marca");

  const mostrar = () => {
    tip.replaceChildren();
    const fuerte = document.createElement("strong");
    fuerte.textContent = valor;
    const suave = document.createElement("span");
    suave.textContent = etiqueta;
    tip.append(fuerte, suave);
    tip.hidden = false;

    const caja = tarjeta.getBoundingClientRect();
    const m = marca.getBoundingClientRect();
    const izquierda = Math.min(
      Math.max(m.left - caja.left + m.width / 2 - tip.offsetWidth / 2, 8),
      caja.width - tip.offsetWidth - 8,
    );
    tip.style.left = `${izquierda}px`;
    tip.style.top = `${m.top - caja.top - tip.offsetHeight - 8}px`;
  };
  const ocultar = () => {
    tip.hidden = true;
  };

  marca.addEventListener("pointerenter", mostrar);
  marca.addEventListener("focus", mostrar);
  marca.addEventListener("pointerleave", ocultar);
  marca.addEventListener("blur", ocultar);
}

/** Líneas guía y números del eje vertical. */
function ejeVertical(svg, { izquierda, derecha, arriba, abajo, maximo, formato }) {
  const alto = abajo - arriba;
  for (let i = 0; i <= 4; i += 1) {
    const valor = (maximo / 4) * i;
    const y = abajo - (alto * i) / 4;
    svg.append(nodoSvg("line", { x1: izquierda, x2: derecha, y1: y, y2: y, class: "grafica-rejilla" }));
    svg.append(textoSvg(formato(valor), { x: izquierda - 8, y: y + 4, "text-anchor": "end", class: "grafica-eje" }));
  }
}

/** Columnas por semana o por categoría: una sola serie, un solo color. */
function dibujarColumnas(tarjeta, datos, { etiqueta, valor, textoValor, textoEtiqueta, etiquetar }) {
  const zona = tarjeta.querySelector(".grafica-zona");
  const ancho = Math.max(zona.clientWidth, 280);
  const alto = 220;
  const m = { arriba: 22, derecha: 8, abajo: 30, izquierda: 38 };
  const svg = nodoSvg("svg", { width: ancho, height: alto, viewBox: `0 0 ${ancho} ${alto}`, "aria-hidden": "false" });

  const maximo = maximoRedondo(Math.max(...datos.map(valor), 0));
  ejeVertical(svg, {
    izquierda: m.izquierda,
    derecha: ancho - m.derecha,
    arriba: m.arriba,
    abajo: alto - m.abajo,
    maximo,
    formato: (v) => formatoEntero.format(v),
  });

  const franja = (ancho - m.izquierda - m.derecha) / datos.length;
  const grosor = Math.min(24, franja - 6);
  const altoUtil = alto - m.arriba - m.abajo;
  const mayor = Math.max(...datos.map(valor));
  const paso = Math.ceil(datos.length / Math.floor((ancho - m.izquierda) / 64));

  datos.forEach((d, i) => {
    const v = valor(d);
    const x = m.izquierda + franja * i + (franja - grosor) / 2;
    const h = maximo ? (altoUtil * v) / maximo : 0;
    const y = alto - m.abajo - h;
    const centro = x + grosor / 2;

    if (h > 0) {
      const barra = nodoSvg("path", { d: trazoColumna(x, y, grosor, h), class: "grafica-serie-1" });
      svg.append(barra);
    }
    // El área que responde al puntero es la franja entera, no solo la barra pintada
    const golpe = nodoSvg("rect", { x: m.izquierda + franja * i, y: m.arriba, width: franja, height: altoUtil, class: "grafica-golpe" });
    conTooltip(golpe, tarjeta, textoValor(d), textoEtiqueta(d));
    svg.append(golpe);

    if ((datos.length - 1 - i) % paso === 0) {
      svg.append(textoSvg(etiqueta(d), { x: centro, y: alto - 10, "text-anchor": "middle", class: "grafica-eje" }));
    }
    if (etiquetar && v > 0 && (i === datos.length - 1 || v === mayor)) {
      svg.append(textoSvg(formatoEntero.format(v), { x: centro, y: y - 6, "text-anchor": "middle", class: "grafica-valor" }));
    }
  });

  zona.replaceChildren(svg);
}

/** Línea de porcentajes por semana; las semanas sin intentos quedan como hueco. */
function dibujarLinea(tarjeta, datos) {
  const zona = tarjeta.querySelector(".grafica-zona");
  const ancho = Math.max(zona.clientWidth, 280);
  const alto = 220;
  const m = { arriba: 22, derecha: 16, abajo: 30, izquierda: 44 };
  const svg = nodoSvg("svg", { width: ancho, height: alto, viewBox: `0 0 ${ancho} ${alto}` });

  ejeVertical(svg, {
    izquierda: m.izquierda,
    derecha: ancho - m.derecha,
    arriba: m.arriba,
    abajo: alto - m.abajo,
    maximo: 100,
    formato: (v) => `${v}%`,
  });

  const paso = (ancho - m.izquierda - m.derecha) / Math.max(datos.length - 1, 1);
  const altoUtil = alto - m.arriba - m.abajo;
  const punto = (d, i) => [m.izquierda + paso * i, alto - m.abajo - (altoUtil * d.porcentaje) / 100];
  const saltoEtiquetas = Math.ceil(datos.length / Math.floor((ancho - m.izquierda) / 64));

  let trazo = "";
  datos.forEach((d, i) => {
    if (d.porcentaje == null) return;
    const [x, y] = punto(d, i);
    const anterior = datos[i - 1];
    trazo += `${anterior && anterior.porcentaje != null ? "L" : "M"}${x},${y} `;
  });
  if (trazo) svg.append(nodoSvg("path", { d: trazo, class: "grafica-linea" }));

  let ultimo = null;
  datos.forEach((d, i) => {
    const x = m.izquierda + paso * i;
    if ((datos.length - 1 - i) % saltoEtiquetas === 0) {
      svg.append(textoSvg(semanaCorta(d.semana), { x, y: alto - 10, "text-anchor": "middle", class: "grafica-eje" }));
    }
    const golpe = nodoSvg("rect", { x: x - paso / 2, y: m.arriba, width: paso, height: altoUtil, class: "grafica-golpe" });
    const texto = d.porcentaje == null ? "No attempts" : textoPorcentaje(d.porcentaje);
    conTooltip(golpe, tarjeta, texto, `Week of ${semanaCorta(d.semana)} · ${formatoEntero.format(d.intentos)} attempts`);
    svg.append(golpe);
    if (d.porcentaje == null) return;
    const [px, py] = punto(d, i);
    svg.append(nodoSvg("circle", { cx: px, cy: py, r: 4, class: "grafica-punto" }));
    ultimo = [px, py, d.porcentaje];
  });

  if (ultimo) {
    svg.append(textoSvg(textoPorcentaje(ultimo[2]), { x: ultimo[0], y: ultimo[1] - 10, "text-anchor": "end", class: "grafica-valor" }));
  }
  zona.replaceChildren(svg);
}

/** Barras horizontales por módulo, con el valor al final de cada barra. */
function dibujarBarras(tarjeta, datos) {
  const zona = tarjeta.querySelector(".grafica-zona");
  const ancho = Math.max(zona.clientWidth, 280);
  const fila = 34;
  const grosor = 18;
  const etiquetaAncho = Math.min(132, ancho * 0.38);
  const alto = datos.length * fila + 8;
  const svg = nodoSvg("svg", { width: ancho, height: alto, viewBox: `0 0 ${ancho} ${alto}` });
  const maximo = Math.max(...datos.map((d) => d.actividades), 1);
  const largoUtil = ancho - etiquetaAncho - 56;

  datos.forEach((d, i) => {
    const y = i * fila + 8;
    svg.append(textoSvg(d.nombre, { x: 0, y: y + grosor / 2 + 4, class: "grafica-categoria" }));
    const largo = Math.max((largoUtil * d.actividades) / maximo, 2);
    svg.append(nodoSvg("path", { d: trazoBarra(etiquetaAncho, y, largo, grosor), class: "grafica-serie-1" }));
    svg.append(textoSvg(formatoEntero.format(d.actividades), { x: etiquetaAncho + largo + 8, y: y + grosor / 2 + 4, class: "grafica-valor" }));
    const golpe = nodoSvg("rect", { x: 0, y: y - 6, width: ancho, height: fila, class: "grafica-golpe" });
    const personas = d.estudiantes === 1 ? "1 student" : `${d.estudiantes} students`;
    conTooltip(golpe, tarjeta, `${formatoEntero.format(d.actividades)} activities`, `${d.nombre} · ${personas}`);
    svg.append(golpe);
  });

  zona.replaceChildren(svg);
}

/** Pesas: promedio de cada habilidad en el primer y en el último diagnóstico. */
function dibujarPesas(tarjeta, habilidades) {
  const zona = tarjeta.querySelector(".grafica-zona");
  const ancho = Math.max(zona.clientWidth, 280);
  const fila = 44;
  const etiquetaAncho = 104;
  const derecha = 24;
  const alto = habilidades.length * fila + 34;
  const svg = nodoSvg("svg", { width: ancho, height: alto, viewBox: `0 0 ${ancho} ${alto}` });
  const util = ancho - etiquetaAncho - derecha;
  const x = (v) => etiquetaAncho + (util * v) / 100;

  [0, 25, 50, 75, 100].forEach((v) => {
    svg.append(nodoSvg("line", { x1: x(v), x2: x(v), y1: 6, y2: alto - 24, class: "grafica-rejilla" }));
    svg.append(textoSvg(String(v), { x: x(v), y: alto - 6, "text-anchor": "middle", class: "grafica-eje" }));
  });

  habilidades.forEach((h, i) => {
    const y = i * fila + 26;
    svg.append(textoSvg(NOMBRE_HABILIDAD[h.habilidad] || h.habilidad, { x: 0, y: y + 4, class: "grafica-categoria" }));
    if (h.inicial == null) return;
    const [a, b] = [x(h.inicial), x(h.actual)];
    svg.append(nodoSvg("line", { x1: a, x2: b, y1: y, y2: y, class: "grafica-pesa" }));
    svg.append(nodoSvg("circle", { cx: a, cy: y, r: 6, class: "grafica-punto-2" }));
    svg.append(nodoSvg("circle", { cx: b, cy: y, r: 6, class: "grafica-punto" }));
    const subio = h.actual >= h.inicial;
    svg.append(textoSvg(String(h.inicial), { x: a + (subio ? -11 : 11), y: y + 4, "text-anchor": subio ? "end" : "start", class: "grafica-valor-suave" }));
    svg.append(textoSvg(String(h.actual), { x: b + (subio ? 11 : -11), y: y + 4, "text-anchor": subio ? "start" : "end", class: "grafica-valor" }));
    const golpe = nodoSvg("rect", { x: etiquetaAncho - 8, y: y - fila / 2, width: util + 16, height: fila, class: "grafica-golpe" });
    const diferencia = h.actual - h.inicial;
    conTooltip(golpe, tarjeta, `${h.inicial} → ${h.actual} (${diferencia >= 0 ? "+" : ""}${diferencia})`, `${NOMBRE_HABILIDAD[h.habilidad]} · ${h.estudiantes} students`);
    svg.append(golpe);
  });

  zona.replaceChildren(svg);
}

/** Tabla con los mismos datos de la gráfica, para leerlos sin el puntero. */
function llenarTabla(tarjeta, encabezados, filas) {
  const tabla = tarjeta.querySelector("table");
  const cabeza = document.createElement("tr");
  encabezados.forEach((e) => {
    const th = document.createElement("th");
    th.textContent = e;
    th.scope = "col";
    cabeza.append(th);
  });
  const cuerpo = document.createElement("tbody");
  filas.forEach((f) => {
    const tr = document.createElement("tr");
    f.forEach((c) => {
      const td = document.createElement("td");
      td.textContent = c;
      tr.append(td);
    });
    cuerpo.append(tr);
  });
  const thead = document.createElement("thead");
  thead.append(cabeza);
  tabla.replaceChildren(thead, cuerpo);
}

/** Muestra un aviso en lugar de una gráfica vacía. */
function sinDatos(tarjeta, mensaje) {
  const p = document.createElement("p");
  p.className = "grafica-vacia";
  p.textContent = mensaje;
  tarjeta.querySelector(".grafica-zona").replaceChildren(p);
  tarjeta.querySelector(".grafica-tabla").hidden = true;
}

/** Las cifras de arriba: una por tarjeta, con su contexto debajo. */
function pintarCifras(d) {
  const cifras = [
    ["Students", formatoEntero.format(d.estudiantes.total), `+${d.estudiantes.nuevos7} in the last 7 days`],
    ["Active this week", formatoEntero.format(d.estudiantes.activos7), `${d.estudiantes.activos30} in the last 30 days`],
    ["Activities completed", formatoEntero.format(d.uso.actividades), `${formatoEntero.format(d.uso.actividades30)} in the last 30 days`],
    ["Came back another day", textoPorcentaje(d.constancia.volvieronPct), `${d.constancia.volvieron} of ${d.constancia.conActividad} students`],
    ["Practice days", String(d.constancia.diasPromedio), "average per student"],
    ["Best streak", String(d.constancia.rachaPromedio), `days on average · longest, ${d.constancia.rachaMayor}`],
  ];
  const caja = document.getElementById("metricas-cifras");
  caja.replaceChildren(
    ...cifras.map(([titulo, valor, nota]) => {
      const tarjeta = document.createElement("div");
      tarjeta.className = "cifra";
      const t = document.createElement("p");
      t.className = "cifra-titulo";
      t.textContent = titulo;
      const v = document.createElement("p");
      v.className = "cifra-valor";
      v.textContent = valor;
      const n = document.createElement("p");
      n.className = "cifra-nota";
      n.textContent = nota;
      tarjeta.append(t, v, n);
      return tarjeta;
    }),
  );
}

/** Subieron, se mantuvieron o bajaron de nivel entre el primer y el último diagnóstico. */
function pintarCambioNivel(cambio) {
  const caja = document.getElementById("metricas-cambio");
  const total = cambio.estudiantes;
  const piezas = [
    ["subieron", "Moved up a level", cambio.subieron, "fa-arrow-trend-up"],
    ["igual", "Stayed the same", cambio.igual, "fa-minus"],
    ["bajaron", "Moved down a level", cambio.bajaron, "fa-arrow-trend-down"],
  ];
  caja.replaceChildren(
    ...piezas.map(([clase, titulo, n, icono]) => {
      const div = document.createElement("div");
      div.className = `cambio cambio-${clase}`;
      div.innerHTML = Icono.svg(icono);
      const v = document.createElement("strong");
      v.textContent = total ? `${Math.round((n / total) * 100)}%` : "—";
      const t = document.createElement("span");
      t.textContent = `${titulo} · ${n}`;
      div.append(v, t);
      return div;
    }),
  );
}

/** Dibuja todas las gráficas con el ancho que tengan en este momento. */
function dibujarGraficas() {
  const d = metricasDatos;
  if (!d) return;

  const semanas = document.getElementById("grafica-semanas");
  if (d.uso.semanas.some((s) => s.actividades > 0)) {
    dibujarColumnas(semanas, d.uso.semanas, {
      etiqueta: (s) => semanaCorta(s.semana),
      valor: (s) => s.actividades,
      textoValor: (s) => `${formatoEntero.format(s.actividades)} activities`,
      textoEtiqueta: (s) => `Week of ${semanaCorta(s.semana)} · ${s.estudiantes} active students`,
      etiquetar: true,
    });
  } else {
    sinDatos(semanas, "No activity in these weeks yet.");
  }

  const aciertos = document.getElementById("grafica-aciertos");
  if (d.aprendizaje.aciertos.some((s) => s.intentos > 0)) dibujarLinea(aciertos, d.aprendizaje.aciertos);
  else sinDatos(aciertos, "No graded exercises in these weeks yet.");

  const modulos = document.getElementById("grafica-modulos");
  if (d.uso.modulos.length) dibujarBarras(modulos, d.uso.modulos);
  else sinDatos(modulos, "No activity recorded yet.");

  const niveles = document.getElementById("grafica-niveles");
  if (d.estudiantes.conDiagnostico) {
    dibujarColumnas(niveles, d.aprendizaje.niveles, {
      etiqueta: (n) => n.nivel,
      valor: (n) => n.estudiantes,
      textoValor: (n) => `${n.estudiantes} students`,
      textoEtiqueta: (n) => `Level ${n.nivel}`,
      etiquetar: false,
    });
  } else {
    sinDatos(niveles, "Nobody has taken the Level Check yet.");
  }

  const pesas = document.getElementById("grafica-habilidades");
  if (d.aprendizaje.cambioNivel.estudiantes) dibujarPesas(pesas, d.aprendizaje.cambioNivel.habilidades);
  else sinDatos(pesas, "Shows up once a student takes the Level Check a second time.");
}

/** Llena textos, cifras y tablas; las gráficas se dibujan aparte porque dependen del ancho. */
function pintarMetricas(d) {
  metricasDatos = d;
  pintarCifras(d);
  pintarCambioNivel(d.aprendizaje.cambioNivel);

  const hora = new Date(d.generado).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  const desde = d.registroDesde
    ? ` Since ${new Date(d.registroDesde).toLocaleDateString("en-US", { dateStyle: "long" })} every activity is logged with its module; earlier data was rebuilt from practice, audio, photo, situation, reading and diagnostic history.`
    : " Data from before per-module logging was rebuilt from practice, audio, photo, situation, reading and diagnostic history.";
  const excluidas = d.cuentasExcluidas
    ? ` Excludes ${d.cuentasExcluidas === 1 ? "the team account" : `the ${d.cuentasExcluidas} team accounts`}.`
    : "";
  document.getElementById("metricas-estado").textContent = `Updated ${hora}.${excluidas}${desde}`;

  document.getElementById("nota-niveles").textContent = `Latest diagnostic of each student · n = ${d.estudiantes.conDiagnostico}`;
  document.getElementById("nota-habilidades").textContent = `Average out of 100 · students with two or more diagnostics · n = ${d.aprendizaje.cambioNivel.estudiantes}`;
  document.getElementById("nota-aciertos").textContent = `Practice, dictation, comprehension and photos · ${formatoEntero.format(d.aprendizaje.aciertos.reduce((s, a) => s + a.intentos, 0))} attempts in 8 weeks`;

  llenarTabla(document.getElementById("grafica-semanas"), ["Week", "Activities", "Active students"],
    d.uso.semanas.map((s) => [semanaCorta(s.semana), s.actividades, s.estudiantes]));
  llenarTabla(document.getElementById("grafica-aciertos"), ["Week", "Attempts", "Correct", "Accuracy"],
    d.aprendizaje.aciertos.map((s) => [semanaCorta(s.semana), s.intentos, s.aciertos, textoPorcentaje(s.porcentaje)]));
  llenarTabla(document.getElementById("grafica-modulos"), ["Module", "Activities", "Students"],
    d.uso.modulos.map((m) => [m.nombre, m.actividades, m.estudiantes]));
  llenarTabla(document.getElementById("grafica-niveles"), ["Level", "Students"],
    d.aprendizaje.niveles.map((n) => [n.nivel, n.estudiantes]));
  llenarTabla(document.getElementById("grafica-habilidades"), ["Skill", "First diagnostic", "Latest diagnostic", "Students"],
    d.aprendizaje.cambioNivel.habilidades.map((h) => [NOMBRE_HABILIDAD[h.habilidad], h.inicial ?? "—", h.actual ?? "—", h.estudiantes]));
  document.querySelectorAll("#vista-metricas .grafica-tabla").forEach((t) => {
    t.hidden = false;
  });

  dibujarGraficas();
}

/** Arma el CSV con todas las cifras, listo para abrir en Excel en español. */
function descargarCsv() {
  const d = metricasDatos;
  if (!d) return;
  const filas = [["Section", "Indicator", "Value"]];
  const agregar = (seccion, indicador, valor) => filas.push([seccion, indicador, valor ?? ""]);

  agregar("Students", "Registered", d.estudiantes.total);
  agregar("Students", "New in 7 days", d.estudiantes.nuevos7);
  agregar("Students", "Active in 7 days", d.estudiantes.activos7);
  agregar("Students", "Active in 30 days", d.estudiantes.activos30);
  agregar("Students", "With a diagnostic", d.estudiantes.conDiagnostico);
  agregar("Consistency", "Came back another day (%)", d.constancia.volvieronPct);
  agregar("Consistency", "Average practice days", d.constancia.diasPromedio);
  agregar("Consistency", "Average best streak", d.constancia.rachaPromedio);
  agregar("Consistency", "Longest streak", d.constancia.rachaMayor);
  agregar("Usage", "Total activities", d.uso.actividades);
  d.uso.semanas.forEach((s) => agregar("Activities per week", s.semana, s.actividades));
  d.uso.modulos.forEach((m) => agregar("Activities per module", m.nombre, m.actividades));
  d.aprendizaje.aciertos.forEach((s) => agregar("Accuracy per week (%)", s.semana, s.porcentaje));
  d.aprendizaje.niveles.forEach((n) => agregar("Current level", n.nivel, n.estudiantes));
  const c = d.aprendizaje.cambioNivel;
  agregar("Level change", "Students with 2+ diagnostics", c.estudiantes);
  agregar("Level change", "Moved up", c.subieron);
  agregar("Level change", "Stayed the same", c.igual);
  agregar("Level change", "Moved down", c.bajaron);
  c.habilidades.forEach((h) => {
    agregar("Skills (first diagnostic)", NOMBRE_HABILIDAD[h.habilidad], h.inicial);
    agregar("Skills (latest diagnostic)", NOMBRE_HABILIDAD[h.habilidad], h.actual);
  });

  const csv = filas
    // Excel en español usa coma decimal: 12.5 se escribe 12,5 para que lo lea como número
    .map((f) => f.map((c) => `"${(typeof c === "number" ? String(c).replace(".", ",") : String(c ?? "")).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
  const archivo = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = `tutorias-metrics-${d.generado.slice(0, 10)}.csv`;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
}

/** Pide las cifras al servidor; mientras llegan, lo anterior se queda a media opacidad. */
async function cargarMetricas() {
  const vista = document.getElementById("vista-metricas");
  const estado = document.getElementById("metricas-estado");
  vista.classList.add("cargando-metricas");
  if (!metricasDatos) estado.textContent = "Calculating the metrics…";
  try {
    pintarMetricas(await MetricasAPI.resumen());
  } catch (err) {
    estado.textContent = err.message || "Could not load the metrics.";
  } finally {
    vista.classList.remove("cargando-metricas");
  }
}

/** Abre el tablero desde el menú de la cuenta. */
function abrirMetricas() {
  // Primero se cierra el módulo abierto con su propia salida: apaga micrófono, voz y relojes
  if (typeof irAlInicio === "function") irAlInicio();
  // Si el módulo pidió confirmar la salida y la persona dijo que no, se queda donde estaba
  if ([...document.querySelectorAll(".pantalla-principal")].some((v) => v.id !== "vista-principal" && !v.classList.contains("oculto"))) return;
  document.querySelectorAll(".pantalla-principal").forEach((v) => v.classList.add("oculto"));
  document.getElementById("vista-metricas").classList.remove("oculto");
  cargarMetricas();

  if (!metricasObservador) {
    let espera = null;
    metricasObservador = new ResizeObserver(() => {
      clearTimeout(espera);
      espera = setTimeout(dibujarGraficas, 120);
    });
    metricasObservador.observe(document.getElementById("metricas-graficas"));
  }
}

/** Muestra la opción del menú solo a las cuentas del equipo. */
async function revisarAccesoMetricas() {
  const opcion = document.getElementById("btn-menu-metricas");
  if (!opcion || !Sesion.estaAutenticado()) return;
  try {
    opcion.classList.toggle("oculto", !(await MetricasAPI.acceso()));
  } catch (e) {
    opcion.classList.add("oculto");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const opcion = document.getElementById("btn-menu-metricas");
  if (!opcion) return;

  opcion.addEventListener("click", () => {
    document.getElementById("menu-cuenta").classList.add("oculto");
    document.getElementById("btn-cuenta").setAttribute("aria-expanded", "false");
    abrirMetricas();
  });
  document.getElementById("btn-metricas-actualizar").addEventListener("click", cargarMetricas);
  document.getElementById("btn-metricas-csv").addEventListener("click", descargarCsv);
  document.getElementById("btn-salir-metricas").addEventListener("click", () => {
    document.getElementById("vista-metricas").classList.add("oculto");
    document.getElementById("vista-principal").classList.remove("oculto");
  });

  // Se revisa al entrar y cada vez que cambia la sesión (entrar, salir, otra cuenta)
  revisarAccesoMetricas();
  new MutationObserver(revisarAccesoMetricas).observe(document.getElementById("vista-auth"), {
    attributes: true,
    attributeFilter: ["class"],
  });
});

window.abrirMetricas = abrirMetricas;
