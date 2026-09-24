// Tablero de métricas del estudio: cifras agregadas y anónimas para el trabajo de grado

const SVG_NS = "http://www.w3.org/2000/svg";
const HABILIDADES_ES = {
  vocabulario: "Vocabulario",
  gramatica: "Gramática",
  comprension: "Comprensión",
  fluidez: "Fluidez",
};

let metricasDatos = null;
let metricasObservador = null;

const formatoEntero = new Intl.NumberFormat("es-CO");

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Escribe una semana (lunes) como "21 sep". */
function fechaCorta(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}

/** Porcentaje con coma decimal, como se escribe en Colombia. */
function textoPorcentaje(valor) {
  return valor == null ? "—" : `${String(valor).replace(".", ",")} %`;
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
    formato: (v) => `${v} %`,
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
      svg.append(textoSvg(fechaCorta(d.semana), { x, y: alto - 10, "text-anchor": "middle", class: "grafica-eje" }));
    }
    const golpe = nodoSvg("rect", { x: x - paso / 2, y: m.arriba, width: paso, height: altoUtil, class: "grafica-golpe" });
    const texto = d.porcentaje == null ? "Sin intentos" : textoPorcentaje(d.porcentaje);
    conTooltip(golpe, tarjeta, texto, `Semana del ${fechaCorta(d.semana)} · ${formatoEntero.format(d.intentos)} intentos`);
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
    const personas = d.estudiantes === 1 ? "1 estudiante" : `${d.estudiantes} estudiantes`;
    conTooltip(golpe, tarjeta, `${formatoEntero.format(d.actividades)} actividades`, `${d.nombre} · ${personas}`);
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
    svg.append(textoSvg(HABILIDADES_ES[h.habilidad] || h.habilidad, { x: 0, y: y + 4, class: "grafica-categoria" }));
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
    conTooltip(golpe, tarjeta, `${h.inicial} → ${h.actual} (${diferencia >= 0 ? "+" : ""}${diferencia})`, `${HABILIDADES_ES[h.habilidad]} · ${h.estudiantes} estudiantes`);
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
    ["Estudiantes", formatoEntero.format(d.estudiantes.total), `+${d.estudiantes.nuevos7} en los últimos 7 días`],
    ["Activos esta semana", formatoEntero.format(d.estudiantes.activos7), `${d.estudiantes.activos30} en los últimos 30 días`],
    ["Actividades terminadas", formatoEntero.format(d.uso.actividades), `${formatoEntero.format(d.uso.actividades30)} en los últimos 30 días`],
    ["Volvieron otro día", textoPorcentaje(d.constancia.volvieronPct), `${d.constancia.volvieron} de ${d.constancia.conActividad} estudiantes`],
    ["Días de práctica", String(d.constancia.diasPromedio).replace(".", ","), "promedio por estudiante"],
    ["Racha máxima", String(d.constancia.rachaPromedio).replace(".", ","), `días en promedio · la más larga, ${d.constancia.rachaMayor}`],
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
    ["subieron", "Subieron de nivel", cambio.subieron, "fa-arrow-trend-up"],
    ["igual", "Se mantuvieron", cambio.igual, "fa-minus"],
    ["bajaron", "Bajaron de nivel", cambio.bajaron, "fa-arrow-trend-down"],
  ];
  caja.replaceChildren(
    ...piezas.map(([clase, titulo, n, icono]) => {
      const div = document.createElement("div");
      div.className = `cambio cambio-${clase}`;
      div.innerHTML = Icono.svg(icono);
      const v = document.createElement("strong");
      v.textContent = total ? `${Math.round((n / total) * 100)} %` : "—";
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
      etiqueta: (s) => fechaCorta(s.semana),
      valor: (s) => s.actividades,
      textoValor: (s) => `${formatoEntero.format(s.actividades)} actividades`,
      textoEtiqueta: (s) => `Semana del ${fechaCorta(s.semana)} · ${s.estudiantes} estudiantes activos`,
      etiquetar: true,
    });
  } else {
    sinDatos(semanas, "Todavía no hay actividades en estas semanas.");
  }

  const aciertos = document.getElementById("grafica-aciertos");
  if (d.aprendizaje.aciertos.some((s) => s.intentos > 0)) dibujarLinea(aciertos, d.aprendizaje.aciertos);
  else sinDatos(aciertos, "Todavía no hay ejercicios calificados en estas semanas.");

  const modulos = document.getElementById("grafica-modulos");
  if (d.uso.modulos.length) dibujarBarras(modulos, d.uso.modulos);
  else sinDatos(modulos, "Todavía no hay actividades registradas.");

  const niveles = document.getElementById("grafica-niveles");
  if (d.estudiantes.conDiagnostico) {
    dibujarColumnas(niveles, d.aprendizaje.niveles, {
      etiqueta: (n) => n.nivel,
      valor: (n) => n.estudiantes,
      textoValor: (n) => `${n.estudiantes} estudiantes`,
      textoEtiqueta: (n) => `Nivel ${n.nivel}`,
      etiquetar: false,
    });
  } else {
    sinDatos(niveles, "Nadie ha hecho el Level Check todavía.");
  }

  const pesas = document.getElementById("grafica-habilidades");
  if (d.aprendizaje.cambioNivel.estudiantes) dibujarPesas(pesas, d.aprendizaje.cambioNivel.habilidades);
  else sinDatos(pesas, "Aparece cuando algún estudiante haga el Level Check por segunda vez.");
}

/** Llena textos, cifras y tablas; las gráficas se dibujan aparte porque dependen del ancho. */
function pintarMetricas(d) {
  metricasDatos = d;
  pintarCifras(d);
  pintarCambioNivel(d.aprendizaje.cambioNivel);

  const hora = new Date(d.generado).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
  const desde = d.registroDesde
    ? ` Desde el ${new Date(d.registroDesde).toLocaleDateString("es-CO", { dateStyle: "long" })} cada actividad queda registrada con su módulo; lo anterior se reconstruyó del historial de práctica, audio, fotos, situaciones, lecturas y diagnósticos.`
    : " Lo anterior al registro por módulo se reconstruyó del historial de práctica, audio, fotos, situaciones, lecturas y diagnósticos.";
  const excluidas = d.cuentasExcluidas
    ? ` No incluye ${d.cuentasExcluidas === 1 ? "la cuenta del equipo" : `las ${d.cuentasExcluidas} cuentas del equipo`}.`
    : "";
  document.getElementById("metricas-estado").textContent = `Actualizado el ${hora.replace(/\.$/, "")}.${excluidas}${desde}`;

  document.getElementById("nota-niveles").textContent = `Último diagnóstico de cada estudiante · n = ${d.estudiantes.conDiagnostico}`;
  document.getElementById("nota-habilidades").textContent = `Promedio sobre 100 · estudiantes con dos o más diagnósticos · n = ${d.aprendizaje.cambioNivel.estudiantes}`;
  document.getElementById("nota-aciertos").textContent = `Práctica, dictados, comprensión y fotos · ${formatoEntero.format(d.aprendizaje.aciertos.reduce((s, a) => s + a.intentos, 0))} intentos en 8 semanas`;

  llenarTabla(document.getElementById("grafica-semanas"), ["Semana", "Actividades", "Estudiantes activos"],
    d.uso.semanas.map((s) => [fechaCorta(s.semana), s.actividades, s.estudiantes]));
  llenarTabla(document.getElementById("grafica-aciertos"), ["Semana", "Intentos", "Aciertos", "% de aciertos"],
    d.aprendizaje.aciertos.map((s) => [fechaCorta(s.semana), s.intentos, s.aciertos, textoPorcentaje(s.porcentaje)]));
  llenarTabla(document.getElementById("grafica-modulos"), ["Módulo", "Actividades", "Estudiantes"],
    d.uso.modulos.map((m) => [m.nombre, m.actividades, m.estudiantes]));
  llenarTabla(document.getElementById("grafica-niveles"), ["Nivel", "Estudiantes"],
    d.aprendizaje.niveles.map((n) => [n.nivel, n.estudiantes]));
  llenarTabla(document.getElementById("grafica-habilidades"), ["Habilidad", "Primer diagnóstico", "Último diagnóstico", "Estudiantes"],
    d.aprendizaje.cambioNivel.habilidades.map((h) => [HABILIDADES_ES[h.habilidad], h.inicial ?? "—", h.actual ?? "—", h.estudiantes]));
  document.querySelectorAll("#vista-metricas .grafica-tabla").forEach((t) => {
    t.hidden = false;
  });

  dibujarGraficas();
}

/** Arma el CSV con todas las cifras, listo para abrir en Excel en español. */
function descargarCsv() {
  const d = metricasDatos;
  if (!d) return;
  const filas = [["Sección", "Indicador", "Valor"]];
  const agregar = (seccion, indicador, valor) => filas.push([seccion, indicador, valor ?? ""]);

  agregar("Estudiantes", "Registrados", d.estudiantes.total);
  agregar("Estudiantes", "Nuevos en 7 días", d.estudiantes.nuevos7);
  agregar("Estudiantes", "Activos en 7 días", d.estudiantes.activos7);
  agregar("Estudiantes", "Activos en 30 días", d.estudiantes.activos30);
  agregar("Estudiantes", "Con diagnóstico", d.estudiantes.conDiagnostico);
  agregar("Constancia", "Volvieron otro día (%)", d.constancia.volvieronPct);
  agregar("Constancia", "Días de práctica promedio", d.constancia.diasPromedio);
  agregar("Constancia", "Racha máxima promedio", d.constancia.rachaPromedio);
  agregar("Constancia", "Racha más larga", d.constancia.rachaMayor);
  agregar("Uso", "Actividades totales", d.uso.actividades);
  d.uso.semanas.forEach((s) => agregar("Actividades por semana", s.semana, s.actividades));
  d.uso.modulos.forEach((m) => agregar("Actividades por módulo", m.nombre, m.actividades));
  d.aprendizaje.aciertos.forEach((s) => agregar("Aciertos por semana (%)", s.semana, s.porcentaje));
  d.aprendizaje.niveles.forEach((n) => agregar("Nivel actual", n.nivel, n.estudiantes));
  const c = d.aprendizaje.cambioNivel;
  agregar("Cambio de nivel", "Estudiantes con 2+ diagnósticos", c.estudiantes);
  agregar("Cambio de nivel", "Subieron", c.subieron);
  agregar("Cambio de nivel", "Se mantuvieron", c.igual);
  agregar("Cambio de nivel", "Bajaron", c.bajaron);
  c.habilidades.forEach((h) => {
    agregar("Habilidades (primer diagnóstico)", HABILIDADES_ES[h.habilidad], h.inicial);
    agregar("Habilidades (último diagnóstico)", HABILIDADES_ES[h.habilidad], h.actual);
  });

  const csv = filas
    // Excel en español usa coma decimal: 12.5 se escribe 12,5 para que lo lea como número
    .map((f) => f.map((c) => `"${(typeof c === "number" ? String(c).replace(".", ",") : String(c ?? "")).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
  const archivo = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = `metricas-tutorias-${d.generado.slice(0, 10)}.csv`;
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
  if (!metricasDatos) estado.textContent = "Calculando las métricas…";
  try {
    pintarMetricas(await MetricasAPI.resumen());
  } catch (err) {
    estado.textContent = err.message || "No se pudieron cargar las métricas.";
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
