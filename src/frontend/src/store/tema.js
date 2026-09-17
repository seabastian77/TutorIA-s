// Interruptor de tema claro/oscuro; la elección se guarda en el navegador

const TEMA_MEMORIA = "tutorias_tema";

/** Aplica el tema al documento; sin argumento usa lo guardado o lo que pida el sistema. */
function aplicarTema(tema) {
  const elegido = tema || leerTemaGuardado() || temaDelSistema();
  document.documentElement.dataset.tema = elegido;

  const boton = document.getElementById("btn-tema");
  if (boton) {
    const aOscuro = elegido === "claro";
    boton.setAttribute("aria-pressed", String(elegido === "oscuro"));
    boton.setAttribute(
      "aria-label",
      aOscuro ? "Switch to dark mode" : "Switch to light mode",
    );
    boton.title = boton.getAttribute("aria-label");
  }
  return elegido;
}

function leerTemaGuardado() {
  try {
    const t = localStorage.getItem(TEMA_MEMORIA);
    return t === "claro" || t === "oscuro" ? t : null;
  } catch (e) {
    return null;
  }
}

/** Si el usuario nunca eligió, se respeta lo que tenga configurado su sistema. */
function temaDelSistema() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "oscuro"
    : "claro";
}

function alternarTema() {
  const nuevo = document.documentElement.dataset.tema === "oscuro" ? "claro" : "oscuro";
  aplicarTema(nuevo);
  try {
    localStorage.setItem(TEMA_MEMORIA, nuevo);
  } catch (e) {
    // Sin almacenamiento el tema dura lo que dure la pestaña
  }
}

document.addEventListener("DOMContentLoaded", () => {
  aplicarTema();
  const boton = document.getElementById("btn-tema");
  if (boton) boton.addEventListener("click", alternarTema);

  // Mientras el usuario no elija, la app sigue al sistema si este cambia
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (!leerTemaGuardado()) aplicarTema();
    });
  }
});

window.aplicarTema = aplicarTema;
