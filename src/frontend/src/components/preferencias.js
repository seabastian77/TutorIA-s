// Ayuda en español: un botón en la barra superior; el valor real vive en el servidor

/** Pinta el botón y prende o apaga en toda la app las explicaciones y la traducción con un toque. */
function pintarInterruptorEspanol(activo) {
  const boton = document.getElementById("btn-espanol");
  if (boton) {
    boton.classList.remove("oculto");
    boton.setAttribute("aria-pressed", String(!!activo));
    boton.title = activo
      ? "Spanish help is on: explanations in Spanish and tap any word to translate it"
      : "Turn on Spanish help: explanations in Spanish and tap any word to translate it";
  }

  document.body.classList.toggle("ayuda-es", !!activo);
  if (!activo && typeof Traductor !== "undefined") Traductor.cerrar();
}

/** Dice si la ayuda en español está prendida ahora mismo. */
function ayudaEspanolActiva() {
  return document.body.classList.contains("ayuda-es");
}

/** Guarda el cambio; se pinta de una para que se sienta instantáneo y se revierte si falla. */
async function cambiarAyudaEspanol(activo) {
  const boton = document.getElementById("btn-espanol");
  pintarInterruptorEspanol(activo);
  if (boton) boton.disabled = true;

  try {
    const datos = await PreferenciasAPI.guardarAyudaEspanol(activo);
    pintarInterruptorEspanol(datos.ayudaEspanol);
    if (typeof avisoConTuti === "function") {
      avisoConTuti(
        datos.ayudaEspanol ? "Spanish help is on" : "Spanish help is off",
        datos.ayudaEspanol
          ? "Explanations come in Spanish, and you can tap any English word to translate it."
          : "Explanations stay in English. Turn it back on whenever you need it.",
        { pose: "lee", confeti: false },
      );
    }
    // El mentor habla en el mismo idioma: que cambie sin esperar a la próxima vuelta
    if (typeof refrescarMentor === "function") refrescarMentor();
  } catch (err) {
    pintarInterruptorEspanol(!activo);
    if (typeof avisoConTuti === "function") {
      avisoConTuti("Could not save that setting", "Check your connection and try again.", { pose: "piensa", confeti: false });
    }
  } finally {
    if (boton) boton.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const boton = document.getElementById("btn-espanol");
  if (boton) {
    boton.addEventListener("click", () => cambiarAyudaEspanol(!ayudaEspanolActiva()));
  }
});
