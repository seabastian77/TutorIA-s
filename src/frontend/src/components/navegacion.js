// La barra superior, las migas de cada módulo y la tarjeta "Your next step"

// Lo que muestra "Your next step" según el módulo que el mentor recomienda
const PASOS = {
  "btn-iniciar-nivel": ["Level Check", "An immersive AI diagnostic in 8 scenes, about 10 minutes. Everything else adapts to your result.", "8 scenes with the AI, about 10 minutes."],
  "btn-practicar": ["Daily Practice", "Questions that get harder the moment you stop missing them."],
  "btn-roleplay": ["Real Situations", "Order a coffee, pass immigration, nail an interview."],
  "btn-vocabulario": ["Vocabulary", "You have words waiting for review. A few minutes keeps them fresh."],
  "btn-juegos": ["Word Games", "Quick games built from the words you keep missing."],
  "btn-tienda": ["Shop", "You have coins saved up. A shield protects your streak on busy days."],
};

/** Vuelve al inicio usando la salida propia de la vista abierta, para que limpie lo suyo. */
function irAlInicio() {
  const abierta = [...document.querySelectorAll(".pantalla-principal")].find(
    (v) => v.id !== "vista-principal" && !v.classList.contains("oculto"),
  );
  if (!abierta) return;

  const salida =
    abierta.querySelector('[id^="btn-salir-"]') ||
    abierta.querySelector("#btn-continuar-resultado");
  if (salida) {
    salida.click();
    return;
  }
  abierta.classList.add("oculto");
  document.getElementById("vista-principal").classList.remove("oculto");
}

/** Pone "‹ Home / Sección" arriba de cada vista que lo declare. */
function montarMigas() {
  document.querySelectorAll(".pantalla-principal[data-seccion]").forEach((vista) => {
    if (vista.querySelector(":scope > .migas")) return;
    const migas = document.createElement("nav");
    migas.className = "migas";
    migas.setAttribute("aria-label", "Breadcrumb");
    migas.innerHTML = `
      <button type="button" class="migas-inicio">${Icono.svg("fa-chevron-left")}Home</button>
      <span class="migas-separador" aria-hidden="true">/</span>
      <span class="migas-actual" aria-current="page"></span>`;
    migas.querySelector(".migas-actual").textContent = vista.dataset.seccion;
    migas.querySelector(".migas-inicio").addEventListener("click", irAlInicio);
    vista.prepend(migas);
  });
}

/** La barra se ve solo con sesión abierta; el login tiene su propio panel de marca. */
function ajustarBarra() {
  const barra = document.getElementById("barra-app");
  const auth = document.getElementById("vista-auth");
  if (!barra || !auth) return;

  const conSesion = auth.classList.contains("oculto") && Sesion.estaAutenticado();
  barra.classList.toggle("oculto", !conSesion);
  document.body.classList.toggle("con-sesion", conSesion);
  if (!conSesion) return;

  const usuario = Sesion.obtenerUsuario() || {};
  const nombre = (usuario.nombre || "").trim();
  document.getElementById("cuenta-inicial").textContent = (nombre[0] || "?").toUpperCase();
  document.getElementById("cuenta-nombre").textContent = nombre || "Student";
  document.getElementById("cuenta-correo").textContent = usuario.correo || "";
}

/** Abre o cierra el menú de la cuenta, y lo cierra al tocar fuera o con Escape. */
function prepararMenuCuenta() {
  const boton = document.getElementById("btn-cuenta");
  const menu = document.getElementById("menu-cuenta");
  if (!boton || !menu) return;

  const cerrar = (devolverFoco) => {
    if (menu.classList.contains("oculto")) return;
    menu.classList.add("oculto");
    boton.setAttribute("aria-expanded", "false");
    if (devolverFoco) boton.focus();
  };

  boton.addEventListener("click", (e) => {
    e.stopPropagation();
    const abrir = menu.classList.contains("oculto");
    menu.classList.toggle("oculto", !abrir);
    boton.setAttribute("aria-expanded", String(abrir));
    if (abrir) menu.querySelector("button").focus();
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target)) cerrar(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cerrar(true);
  });

  document.getElementById("btn-menu-progreso").addEventListener("click", () => {
    cerrar(false);
    if (typeof abrirHistorial === "function") abrirHistorial();
  });
}

/** Deja el texto completo para pantallas anchas y uno corto para el celular. */
function pintarTextoAdaptable(elemento, largo, corto) {
  elemento.innerHTML = '<span class="texto-largo"></span><span class="texto-corto"></span>';
  elemento.querySelector(".texto-largo").textContent = largo;
  elemento.querySelector(".texto-corto").textContent = corto;
}

/** Pinta "Your next step" con el módulo que el mentor recomienda en este momento. */
function pintarSiguientePaso(consejo) {
  const destino = consejo && PASOS[consejo.boton] ? consejo.boton : "btn-practicar";
  const [titulo, texto, corto] = PASOS[destino];
  document.getElementById("paso-titulo").textContent = titulo;
  pintarTextoAdaptable(document.getElementById("paso-texto"), texto, corto || texto);
  document.getElementById("btn-paso").dataset.destino = destino;
}

/** Llena las fichas de "Your progress" con la liga y los logros reales. */
async function cargarResumenProgreso() {
  try {
    const liga = await LigaAPI.obtenerClasificacion();
    document.getElementById("dato-liga").textContent = liga.tuPosicion
      ? `${liga.ligaNombre} · #${liga.tuPosicion} of ${liga.participantes}`
      : `${liga.ligaNombre} · practice to join`;
  } catch (e) {
    // Si la liga no responde, la ficha se queda con su texto de siempre
  }
  try {
    const { logros } = await LogrosAPI.obtenerLogros();
    const ganados = logros.filter((l) => l.desbloqueado).length;
    document.getElementById("dato-logros").textContent = `${ganados} of ${logros.length} badges`;
  } catch (e) {
    // Igual que la liga: sin datos, queda la descripción
  }
}

/** El botón de tema del menú (celular) hace lo mismo que el de la barra. */
function pintarOpcionTema() {
  const oscuro = document.documentElement.dataset.tema === "oscuro";
  document.getElementById("menu-tema-texto").textContent = oscuro ? "Light mode" : "Dark mode";
}

/** Cada vista nueva arranca desde arriba, no a media página de la anterior. */
function vigilarCambiosDeVista() {
  const observador = new MutationObserver((cambios) => {
    const seAbrio = cambios.some(
      (c) => c.target.classList.contains("pantalla-principal") && !c.target.classList.contains("oculto"),
    );
    if (seAbrio) window.scrollTo({ top: 0 });
  });
  document.querySelectorAll(".pantalla-principal").forEach((v) =>
    observador.observe(v, { attributes: true, attributeFilter: ["class"] }),
  );

  new MutationObserver(ajustarBarra).observe(document.getElementById("vista-auth"), {
    attributes: true,
    attributeFilter: ["class"],
  });
}

document.addEventListener("DOMContentLoaded", () => {
  montarMigas();
  prepararMenuCuenta();
  vigilarCambiosDeVista();
  ajustarBarra();
  pintarSiguientePaso(null);

  document.getElementById("btn-logo-inicio").addEventListener("click", irAlInicio);
  ["btn-mi-progreso", "btn-ver-progreso"].forEach((id) =>
    document.getElementById(id).addEventListener("click", () => {
      if (typeof abrirHistorial === "function") abrirHistorial();
    }),
  );

  document.getElementById("btn-repetir-nivel").addEventListener("click", () => {
    document.getElementById("vista-historial").classList.add("oculto");
    document.getElementById("btn-iniciar-nivel").click();
  });

  pintarOpcionTema();
  document.getElementById("btn-menu-tema").addEventListener("click", () => {
    document.getElementById("btn-tema").click();
    pintarOpcionTema();
  });

  const principal = document.getElementById("vista-principal");
  const alVolver = () => {
    if (!principal.classList.contains("oculto") && Sesion.estaAutenticado()) cargarResumenProgreso();
  };
  new MutationObserver(alVolver).observe(principal, { attributes: true, attributeFilter: ["class"] });
  alVolver();
  document.getElementById("btn-paso").addEventListener("click", (e) => {
    const destino = document.getElementById(e.currentTarget.dataset.destino);
    if (destino) destino.click();
  });
});
