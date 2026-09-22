// La barra superior, las migas de cada módulo y la tarjeta "Your next step"

const PASO_POR_DEFECTO = {
  titulo: "Daily Practice",
  texto: "Questions that get harder the moment you stop missing them.",
  accion: "Start practicing",
  boton: "btn-practicar",
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

/** Pone "‹ Home / Nombre del módulo" arriba de cada vista que lo declare. */
function montarMigas() {
  document.querySelectorAll(".pantalla-principal[data-modulo]").forEach((vista) => {
    if (vista.querySelector(":scope > .migas")) return;
    const migas = document.createElement("nav");
    migas.className = "migas";
    migas.setAttribute("aria-label", "Breadcrumb");
    migas.innerHTML = `
      <button type="button" class="migas-inicio">${Icono.svg("fa-chevron-left")}Home</button>
      <span class="migas-separador" aria-hidden="true">/</span>
      <span class="migas-actual" aria-current="page"></span>`;
    migas.querySelector(".migas-actual").textContent = vista.dataset.modulo;
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

/** Pinta la tarjeta principal del inicio con el consejo que calcula el mentor. */
function pintarSiguientePaso(consejo) {
  const paso = consejo && consejo.boton ? consejo : PASO_POR_DEFECTO;
  document.getElementById("paso-titulo").textContent = paso.titulo;
  document.getElementById("paso-texto").textContent = paso.texto;
  document.getElementById("paso-accion").textContent = paso.accion;
  document.getElementById("btn-paso").dataset.destino = paso.boton;
  document.getElementById("siguiente-paso").dataset.animo = paso.animo || "feliz";
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
  document.getElementById("btn-mi-progreso").addEventListener("click", () => {
    if (typeof abrirHistorial === "function") abrirHistorial();
  });
  document.getElementById("btn-paso").addEventListener("click", (e) => {
    const destino = document.getElementById(e.currentTarget.dataset.destino);
    if (destino) destino.click();
  });
});
