let palabrasRepaso = [];
let indicePalabra = 0;
let traduccionVisible = false;

const UMBRAL_ARRASTRE = 110;

const arrastre = {
  activo: false,
  x0: 0,
  y0: 0,
  dx: 0,
  dy: 0,
};

async function iniciarVocabulario() {
  document.getElementById("vista-principal").classList.add("oculto");
  document.getElementById("vista-vocabulario").classList.remove("oculto");

  indicePalabra = 0;
  document.getElementById("vocab-progreso").textContent = "";
  document.getElementById("vocab-tarjeta-texto").textContent = "Loading...";
  document.getElementById("vocab-contexto").classList.add("oculto");
  document.getElementById("vocab-btn-mostrar").classList.add("oculto");
  document.getElementById("vocab-controles").classList.add("oculto");

  try {
    const datos = await VocabularioAPI.obtenerRepaso();
    palabrasRepaso = datos.palabras;
    mostrarPalabraActual();
  } catch (err) {
    document.getElementById("vocab-tarjeta-texto").textContent =
      "Could not load your vocabulary.";
  }
}

function mostrarPalabraActual() {
  const progresoEl = document.getElementById("vocab-progreso");
  const textoEl = document.getElementById("vocab-tarjeta-texto");
  const contextoEl = document.getElementById("vocab-contexto");
  const btnMostrar = document.getElementById("vocab-btn-mostrar");
  const controles = document.getElementById("vocab-controles");
  const tarjeta = document.getElementById("vocab-tarjeta");

  traduccionVisible = false;
  controles.classList.add("oculto");
  contextoEl.classList.add("oculto");
  resetearTarjeta();

  if (indicePalabra >= palabrasRepaso.length) {
    progresoEl.textContent = "";
    textoEl.textContent = palabrasRepaso.length
      ? "You reviewed all your due words!"
      : "You're all caught up! No words to review right now.";
    btnMostrar.classList.add("oculto");
    if (tarjeta) tarjeta.classList.add("vocab-tarjeta-vacia");
    marcarPila(0);
    return;
  }

  if (tarjeta) tarjeta.classList.remove("vocab-tarjeta-vacia");
  progresoEl.textContent = `Word ${indicePalabra + 1} of ${palabrasRepaso.length}`;
  textoEl.textContent = palabrasRepaso[indicePalabra].palabra;
  btnMostrar.classList.remove("oculto");
  marcarPila(palabrasRepaso.length - indicePalabra);
}

/** Muestra cuántas tarjetas quedan detrás de la actual. */
function marcarPila(restantes) {
  const pila = document.getElementById("vocab-pila");
  if (!pila) return;
  pila.classList.toggle("oculto", restantes < 2);
}

function mostrarTraduccion() {
  const palabra = palabrasRepaso[indicePalabra];
  const contextoEl = document.getElementById("vocab-contexto");

  contextoEl.textContent = palabra.contexto
    ? `${palabra.traduccion} — "${palabra.contexto}"`
    : palabra.traduccion;
  contextoEl.classList.remove("oculto");
  document.getElementById("vocab-btn-mostrar").classList.add("oculto");
  document.getElementById("vocab-controles").classList.remove("oculto");
  traduccionVisible = true;
}

async function responderPalabra(sabia) {
  const palabra = palabrasRepaso[indicePalabra];
  if (!palabra) return;

  animarSalida(sabia);

  try {
    await VocabularioAPI.responder({ id: palabra.id, sabia });
  } catch (err) {
    console.error("No se pudo actualizar la palabra:", err);
  }

  setTimeout(() => {
    indicePalabra++;
    mostrarPalabraActual();
  }, 260);
}

/** Lanza la tarjeta fuera de la pantalla hacia el lado que corresponde. */
function animarSalida(sabia) {
  const tarjeta = document.getElementById("vocab-tarjeta");
  if (!tarjeta) return;

  const destino = sabia ? window.innerWidth : -window.innerWidth;
  tarjeta.style.transition = "transform 0.26s ease-in, opacity 0.26s ease-in";
  tarjeta.style.transform = `translate(${destino}px, -40px) rotate(${sabia ? 18 : -18}deg)`;
  tarjeta.style.opacity = "0";
}

function resetearTarjeta() {
  const tarjeta = document.getElementById("vocab-tarjeta");
  if (!tarjeta) return;

  tarjeta.style.transition = "none";
  tarjeta.style.transform = "";
  tarjeta.style.opacity = "1";
  tarjeta.classList.remove("vocab-arrastrando");
  pintarSenal(0);
}

/** Resalta el borde y el sello según hacia dónde se está arrastrando. */
function pintarSenal(dx) {
  const tarjeta = document.getElementById("vocab-tarjeta");
  const sello = document.getElementById("vocab-sello");
  if (!tarjeta || !sello) return;

  const fuerza = Math.min(Math.abs(dx) / UMBRAL_ARRASTRE, 1);

  tarjeta.classList.toggle("hacia-si", dx > 20);
  tarjeta.classList.toggle("hacia-no", dx < -20);

  if (Math.abs(dx) < 20) {
    sello.classList.add("oculto");
    return;
  }

  sello.textContent = dx > 0 ? "I knew it" : "Didn't know it";
  sello.className = `vocab-sello ${dx > 0 ? "sello-si" : "sello-no"}`;
  sello.style.opacity = String(fuerza);
}

function iniciarArrastre(e) {
  if (indicePalabra >= palabrasRepaso.length) return;

  const tarjeta = document.getElementById("vocab-tarjeta");
  arrastre.activo = true;
  arrastre.x0 = e.clientX;
  arrastre.y0 = e.clientY;
  arrastre.dx = 0;
  arrastre.dy = 0;

  tarjeta.style.transition = "none";
  tarjeta.classList.add("vocab-arrastrando");
  tarjeta.setPointerCapture?.(e.pointerId);
}

function moverArrastre(e) {
  if (!arrastre.activo) return;

  arrastre.dx = e.clientX - arrastre.x0;
  arrastre.dy = e.clientY - arrastre.y0;

  const tarjeta = document.getElementById("vocab-tarjeta");
  const giro = arrastre.dx / 18;
  tarjeta.style.transform = `translate(${arrastre.dx}px, ${arrastre.dy * 0.35}px) rotate(${giro}deg)`;
  pintarSenal(arrastre.dx);
}

function soltarArrastre() {
  if (!arrastre.activo) return;
  arrastre.activo = false;

  const tarjeta = document.getElementById("vocab-tarjeta");
  tarjeta.classList.remove("vocab-arrastrando");

  if (Math.abs(arrastre.dx) >= UMBRAL_ARRASTRE) {
    // Arrastrar cuenta como respuesta aunque no haya visto la traducción
    if (!traduccionVisible) mostrarTraduccion();
    responderPalabra(arrastre.dx > 0);
    return;
  }

  tarjeta.style.transition = "transform 0.2s ease-out";
  tarjeta.style.transform = "";
  pintarSenal(0);
}

document.addEventListener("DOMContentLoaded", () => {
  const btnVocab = document.getElementById("btn-vocabulario");
  if (btnVocab) btnVocab.addEventListener("click", iniciarVocabulario);

  const btnMostrar = document.getElementById("vocab-btn-mostrar");
  if (btnMostrar) btnMostrar.addEventListener("click", mostrarTraduccion);

  const btnSabia = document.getElementById("btn-vocab-sabia");
  if (btnSabia)
    btnSabia.addEventListener("click", () => responderPalabra(true));

  const btnNoSabia = document.getElementById("btn-vocab-no-sabia");
  if (btnNoSabia)
    btnNoSabia.addEventListener("click", () => responderPalabra(false));

  const tarjeta = document.getElementById("vocab-tarjeta");
  if (tarjeta) {
    tarjeta.addEventListener("pointerdown", iniciarArrastre);
    tarjeta.addEventListener("pointermove", moverArrastre);
    tarjeta.addEventListener("pointerup", soltarArrastre);
    tarjeta.addEventListener("pointercancel", soltarArrastre);
    tarjeta.addEventListener("dragstart", (e) => e.preventDefault());
  }

  // Las flechas hacen lo mismo que arrastrar, para quien use teclado
  document.addEventListener("keydown", (e) => {
    const vista = document.getElementById("vista-vocabulario");
    if (!vista || vista.classList.contains("oculto")) return;
    if (indicePalabra >= palabrasRepaso.length) return;

    if (e.key === "ArrowRight") responderPalabra(true);
    else if (e.key === "ArrowLeft") responderPalabra(false);
    else if (e.key === " " && !traduccionVisible) {
      e.preventDefault();
      mostrarTraduccion();
    }
  });

  const btnSalirVocab = document.getElementById("btn-salir-vocabulario");
  if (btnSalirVocab) {
    btnSalirVocab.addEventListener("click", () => {
      document.getElementById("vista-vocabulario").classList.add("oculto");
      document.getElementById("vista-principal").classList.remove("oculto");
      if (typeof cargarProgreso === "function") cargarProgreso();
    });
  }
});
