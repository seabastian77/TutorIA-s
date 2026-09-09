/** Interruptor de ayuda en español; el valor real vive en el servidor. */

function pintarInterruptorEspanol(activo) {
  const contenedor = document.getElementById("ayuda-espanol");
  const casilla = document.getElementById("ayuda-espanol-check");
  if (!contenedor || !casilla) return;

  casilla.checked = !!activo;
  contenedor.classList.toggle("activo", !!activo);
  contenedor.classList.remove("oculto");

  const texto = document.getElementById("ayuda-espanol-texto");
  if (texto) {
    texto.textContent = activo
      ? "Explanations in Spanish: on"
      : "Explanations in Spanish: off";
  }
}

async function cambiarAyudaEspanol(activo) {
  const contenedor = document.getElementById("ayuda-espanol");
  const casilla = document.getElementById("ayuda-espanol-check");

  // Se pinta de una para que se sienta instantáneo, y se revierte si falla
  pintarInterruptorEspanol(activo);
  casilla.disabled = true;

  try {
    const datos = await PreferenciasAPI.guardarAyudaEspanol(activo);
    pintarInterruptorEspanol(datos.ayudaEspanol);
  } catch (err) {
    pintarInterruptorEspanol(!activo);
    const texto = document.getElementById("ayuda-espanol-texto");
    if (texto) texto.textContent = "Could not save that setting";
  } finally {
    casilla.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const casilla = document.getElementById("ayuda-espanol-check");
  if (casilla) {
    casilla.addEventListener("change", (e) =>
      cambiarAyudaEspanol(e.target.checked),
    );
  }
});
