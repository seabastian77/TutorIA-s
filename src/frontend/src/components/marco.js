// El marco de la app: navegación lateral y móvil, Tuti en cada sección y sus celebraciones

const TUTI_RUTA = "assets/tuti/";

// Cada entrada abre un módulo usando el mismo botón del inicio, así no se duplica su lógica
const NAVEGACION = [
  { grupo: null, items: [{ id: "inicio", vista: "vista-principal", texto: "Home", icono: "fa-house" }] },
  {
    grupo: "Learn",
    items: [
      { id: "btn-practicar", vista: "vista-practica", texto: "Daily Practice", corto: "Practice", icono: "fa-bolt" },
      { id: "btn-hablar-ia", vista: "vista-voz", texto: "AI Tutor", corto: "Tutor", icono: "fa-comment-dots" },
      { id: "btn-roleplay", vista: "vista-roleplay", texto: "Real Situations", corto: "Situations", icono: "fa-comments" },
      { id: "btn-escena", vista: "vista-escena", texto: "Scene Mode", corto: "Scenes", icono: "fa-microphone" },
    ],
  },
  {
    grupo: "Listen & read",
    items: [
      { id: "btn-audio", vista: "vista-audio", texto: "Audio Lab", corto: "Audio", icono: "fa-headphones" },
      { id: "btn-biblioteca", vista: "vista-biblioteca", texto: "Library", icono: "fa-book" },
      { id: "btn-vocabulario", vista: "vista-vocabulario", texto: "Vocabulary", corto: "Words", icono: "fa-font" },
      { id: "btn-juegos", vista: "vista-juegos", texto: "Word Games", corto: "Games", icono: "fa-table-cells" },
    ],
  },
  {
    grupo: "You",
    items: [
      { id: "btn-mi-progreso", vista: "vista-historial", texto: "My progress", corto: "Progress", icono: "fa-chart-line" },
      { id: "btn-liga", vista: "vista-liga", texto: "League", icono: "fa-trophy" },
      { id: "btn-logros", vista: "vista-logros", texto: "Achievements", corto: "Badges", icono: "fa-medal" },
      { id: "btn-tienda", vista: "vista-tienda", texto: "Shop", icono: "fa-basket-shopping" },
    ],
  },
];

// En el celular caben cinco pestañas: lo que más se usa todos los días
const PESTANAS = [
  { id: "inicio", vista: "vista-principal", texto: "Home", icono: "fa-house" },
  { id: "btn-practicar", vista: "vista-practica", texto: "Practice", icono: "fa-bolt" },
  { id: "btn-hablar-ia", vista: "vista-voz", texto: "Tutor", icono: "fa-comment-dots" },
  { id: "btn-vocabulario", vista: "vista-vocabulario", texto: "Words", icono: "fa-font" },
  { id: "btn-mi-progreso", vista: "vista-historial", texto: "Progress", icono: "fa-chart-line" },
];

// Poses de Tuti que ya tienen imagen, con su texto alternativo
const POSES_TUTI = { saludo: "Tuti waving" };

// La pose de Tuti que acompaña la cabecera de cada módulo
const TUTI_POR_VISTA = {
  "vista-practica": "tutor",
  "vista-escena": "habla",
  "vista-roleplay": "habla",
  "vista-audio": "escucha",
  "vista-biblioteca": "lee",
  "vista-vocabulario": "lee",
  "vista-juegos": "saludo",
  "vista-liga": "celebra",
  "vista-logros": "celebra",
  "vista-tienda": "saludo",
  "vista-historial": "tutor",
  "vista-nivel": "piensa",
  "vista-visual": "piensa",
};

/** Ruta y texto de una pose; si todavía no hay imagen para ella, Tuti saluda. */
function poseTuti(pose, chico = false) {
  const nombre = POSES_TUTI[pose] ? pose : "saludo";
  return { nombre, alt: POSES_TUTI[nombre], src: `${TUTI_RUTA}tuti-${nombre}${chico ? "-chico" : ""}.webp` };
}

let ultimoProgreso = null;

/** Abre un módulo desde cualquier vista: primero vuelve al inicio con la salida de la vista abierta. */
function abrirDesdeNavegacion(id) {
  if (typeof irAlInicio === "function") irAlInicio();
  if (id === "inicio") return;
  const boton = document.getElementById(id);
  if (boton) boton.click();
}

function botonNavegacion(item, clase) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = clase;
  b.dataset.abre = item.id;
  b.dataset.vista = item.vista;
  b.innerHTML = `${Icono.svg(item.icono)}<span class="nav-largo"></span><span class="nav-corto" aria-hidden="true"></span>`;
  b.querySelector(".nav-largo").textContent = item.texto;
  b.querySelector(".nav-corto").textContent = item.corto || item.texto;
  b.addEventListener("click", () => abrirDesdeNavegacion(item.id));
  return b;
}

/** Barra lateral para computador y tablet. */
function montarNavLateral() {
  const nav = document.createElement("nav");
  nav.id = "nav-lateral";
  nav.className = "nav-lateral";
  nav.setAttribute("aria-label", "Main");

  const marca = document.createElement("button");
  marca.type = "button";
  marca.className = "nav-marca";
  marca.setAttribute("aria-label", "TutorIA’s, go to Home");
  marca.innerHTML = `<img src="${TUTI_RUTA}tuti-cara-chico.webp" alt="" width="44" height="44"><span class="nav-marca-texto"><strong>Tutor<em>IA</em>’s</strong><small>Learn English with AI</small></span>`;
  marca.addEventListener("click", () => abrirDesdeNavegacion("inicio"));
  nav.appendChild(marca);

  const lista = document.createElement("div");
  lista.className = "nav-grupos";
  NAVEGACION.forEach((g) => {
    const grupo = document.createElement("div");
    grupo.className = "nav-grupo";
    if (g.grupo) {
      const t = document.createElement("p");
      t.className = "nav-grupo-titulo";
      t.textContent = g.grupo;
      grupo.appendChild(t);
    }
    g.items.forEach((item) => grupo.appendChild(botonNavegacion(item, "nav-item")));
    lista.appendChild(grupo);
  });
  nav.appendChild(lista);

  const tarjeta = document.createElement("div");
  tarjeta.className = "nav-tarjeta";
  tarjeta.innerHTML = `
    <img src="${poseTuti("tutor", true).src}" alt="" width="64" height="64">
    <p class="nav-tarjeta-titulo">Keep your streak alive</p>
    <p class="nav-tarjeta-texto">One activity a day is all it takes.</p>`;
  const ir = document.createElement("button");
  ir.type = "button";
  ir.className = "nav-tarjeta-boton";
  ir.textContent = "Practice now";
  ir.addEventListener("click", () => abrirDesdeNavegacion("btn-practicar"));
  tarjeta.appendChild(ir);
  nav.appendChild(tarjeta);

  document.body.appendChild(nav);
}

/** Pestañas fijas abajo, como en una app del celular. */
function montarNavInferior() {
  const nav = document.createElement("nav");
  nav.id = "nav-inferior";
  nav.className = "nav-inferior";
  nav.setAttribute("aria-label", "Main");
  PESTANAS.forEach((p) => nav.appendChild(botonNavegacion(p, "nav-pestana")));
  document.body.appendChild(nav);
}

/** Marca como activo el botón de la vista que se está viendo. */
function marcarVistaActiva() {
  const visible = [...document.querySelectorAll(".pantalla-principal")].find((v) => !v.classList.contains("oculto"));
  const id = visible ? visible.id : "";
  document.querySelectorAll("[data-vista]").forEach((b) => {
    const activo = b.dataset.vista === id;
    b.classList.toggle("activo", activo);
    if (activo) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  document.body.dataset.vista = id;
}

/** Pone a Tuti, con la pose de la actividad, en la cabecera de cada módulo. */
function montarTutiCabeceras() {
  Object.entries(TUTI_POR_VISTA).forEach(([vista, pose]) => {
    const cabecera = document.querySelector(`#${vista} .cabecera-modulo`);
    if (!cabecera || cabecera.querySelector(".tuti-cabecera")) return;
    const { nombre, alt, src } = poseTuti(pose);
    const img = document.createElement("img");
    img.className = "tuti-cabecera";
    img.src = src;
    img.alt = alt;
    img.width = 120;
    img.height = 120;
    img.loading = "lazy";
    img.decoding = "async";
    cabecera.classList.add("con-tuti");
    cabecera.appendChild(img);
    if (nombre === "saludo" && typeof TutiVivo !== "undefined") TutiVivo.montar(img);
  });
}

/** Tuti del inicio reacciona: saluda o celebra con todo el cuerpo, o salta si las capas no cargaron. */
function animarTutiInicio(gesto) {
  const inicio = document.getElementById("vista-principal");
  if (!inicio || inicio.classList.contains("oculto")) return;
  if (typeof TutiVivo !== "undefined" && TutiVivo.gesto("#heroe-tuti", gesto)) return;
  const img = document.querySelector("#heroe-tuti img.heroe-tuti-img");
  if (!img) return;
  clearTimeout(img.temporizador);
  img.classList.remove("tuti-salta", "tuti-saluda");
  void img.offsetWidth;
  if (gesto === "celebrar") img.src = poseTuti("celebra").src;
  img.classList.add(gesto === "celebrar" ? "tuti-salta" : "tuti-saluda");
  img.temporizador = setTimeout(() => {
    img.classList.remove("tuti-salta", "tuti-saluda");
    img.src = `${TUTI_RUTA}tuti-saludo.webp`;
  }, 2400);
}

/** Una tarjeta corta de Tuti que se va sola; las celebraciones traen confeti. */
function avisoConTuti(titulo, texto, { pose = "celebra", confeti = true } = {}) {
  let aviso = document.getElementById("tuti-celebra");
  if (!aviso) {
    aviso = document.createElement("div");
    aviso.id = "tuti-celebra";
    aviso.className = "tuti-celebra";
    aviso.setAttribute("role", "status");
    aviso.innerHTML = `
      <span class="tuti-confeti" aria-hidden="true">${"<i></i>".repeat(12)}</span>
      <img src="${poseTuti("celebra", true).src}" alt="" width="72" height="72">
      <span class="tuti-celebra-texto"><strong></strong><span></span></span>`;
    document.body.appendChild(aviso);
  }
  aviso.classList.toggle("sin-confeti", !confeti);
  aviso.querySelector("img").src = poseTuti(pose, true).src;
  aviso.querySelector("strong").textContent = titulo;
  aviso.querySelector(".tuti-celebra-texto span").textContent = texto || "";
  aviso.classList.remove("visible");
  void aviso.offsetWidth;
  aviso.classList.add("visible");
  clearTimeout(aviso.temporizador);
  aviso.temporizador = setTimeout(() => aviso.classList.remove("visible"), 4200);
}

/** Celebra un logro con confeti y con el salto de Tuti en el inicio. */
function celebrarConTuti(titulo, texto) {
  avisoConTuti(titulo, texto);
  animarTutiInicio("celebrar");
}

/** Al volver al inicio, Tuti reacciona a lo que el estudiante acaba de lograr. */
function reaccionarAlProgreso(e) {
  const d = e.detail || {};
  const antes = ultimoProgreso;
  ultimoProgreso = { puntos: d.puntos, hoy: d.actividadesHoy, meta: d.metaDiaria };
  if (!antes) {
    animarTutiInicio("saludar");
    return;
  }
  if (d.actividadesHoy >= d.metaDiaria && antes.hoy < antes.meta) {
    celebrarConTuti("Daily goal completed!", "Tuti is proud of you. See you tomorrow?");
  } else if (d.puntos > antes.puntos) {
    celebrarConTuti(`+${d.puntos - antes.puntos} XP`, "Nice work! Keep the momentum going.");
  } else {
    animarTutiInicio("saludar");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  montarNavLateral();
  montarNavInferior();
  montarTutiCabeceras();
  marcarVistaActiva();

  const observador = new MutationObserver(marcarVistaActiva);
  document.querySelectorAll(".pantalla-principal").forEach((v) =>
    observador.observe(v, { attributes: true, attributeFilter: ["class"] }),
  );

  document.addEventListener("tutorias:progreso", reaccionarAlProgreso);

  // Tuti cobra vida cuando el navegador ya no tiene trabajo pendiente
  const darVida = () => {
    if (typeof TutiVivo === "undefined") return;
    TutiVivo.montar(document.querySelector("#heroe-tuti .heroe-tuti-img"));
    TutiVivo.montar(document.querySelector(".auth-tuti"));
  };
  if ("requestIdleCallback" in window) requestIdleCallback(darVida, { timeout: 2500 });
  else setTimeout(darVida, 1200);
});
