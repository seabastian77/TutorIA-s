let palabrasRepaso = [];
let indicePalabra = 0;
let traduccionVisible = false;
let respondiendo = false; // evita que un doble clic o una tecla sostenida respondan dos veces la misma palabra
let temporizadorSiguiente = null;
let sesionVocab = 0; // cambia al volver a entrar, para ignorar respuestas de la sesión anterior

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

  // Se arranca limpio: nada de la sesión anterior puede responder ni pintarse
  clearTimeout(temporizadorSiguiente);
  const sesion = ++sesionVocab;
  respondiendo = false;
  palabrasRepaso = [];
  indicePalabra = 0;
  resetearTarjeta();
  document.getElementById("vocab-progreso").textContent = "";
  document.getElementById("vocab-tarjeta-texto").textContent = "Loading...";
  document.getElementById("vocab-contexto").classList.add("oculto");
  document.getElementById("vocab-ejemplo").classList.add("oculto");
  document.getElementById("vocab-nivel").classList.add("oculto");
  pintarCreditoFrase(document.getElementById("vocab-credito"), null);
  document.getElementById("vocab-btn-mostrar").classList.add("oculto");
  document.getElementById("vocab-controles").classList.add("oculto");

  try {
    const datos = await VocabularioAPI.obtenerRepaso();
    if (sesion !== sesionVocab) return;
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

  const nivelEl = document.getElementById("vocab-nivel");

  traduccionVisible = false;
  controles.classList.add("oculto");
  contextoEl.classList.add("oculto");
  document.getElementById("vocab-ejemplo").classList.add("oculto");
  pintarCreditoFrase(document.getElementById("vocab-credito"), null);
  nivelEl.classList.add("oculto");
  resetearTarjeta();

  if (indicePalabra >= palabrasRepaso.length) {
    progresoEl.textContent = "";
    textoEl.textContent = palabrasRepaso.length
      ? "You reviewed all your due words!"
      : "No words to review yet. Words you miss in your exercises will show up here.";
    btnMostrar.classList.add("oculto");
    if (tarjeta) tarjeta.classList.add("vocab-tarjeta-vacia");
    marcarPila(0);
    return;
  }

  if (tarjeta) tarjeta.classList.remove("vocab-tarjeta-vacia");
  progresoEl.textContent = `Word ${indicePalabra + 1} of ${palabrasRepaso.length}`;
  const actual = palabrasRepaso[indicePalabra];
  textoEl.textContent = actual.palabra;
  // El nivel sale de la lista CEFR-J; si la palabra no está en ella, no se muestra nada
  if (actual.nivel) {
    nivelEl.textContent = actual.nivel;
    nivelEl.classList.remove("oculto");
  }
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

  // Un ejemplo real de Tatoeba, con su traducción, para ver la palabra en uso
  const ejemploEl = document.getElementById("vocab-ejemplo");
  if (palabra.ejemplo) {
    document.getElementById("vocab-ejemplo-en").textContent = palabra.ejemplo.ingles;
    document.getElementById("vocab-ejemplo-es").textContent = palabra.ejemplo.espanol;
    ejemploEl.classList.remove("oculto");
  } else {
    ejemploEl.classList.add("oculto");
  }
  pintarCreditoFrase(document.getElementById("vocab-credito"), palabra.ejemplo && palabra.ejemplo.credito);

  document.getElementById("vocab-btn-mostrar").classList.add("oculto");
  document.getElementById("vocab-controles").classList.remove("oculto");
  traduccionVisible = true;
}

async function responderPalabra(sabia) {
  const palabra = palabrasRepaso[indicePalabra];
  if (!palabra || respondiendo) return;
  respondiendo = true;
  const sesion = sesionVocab;

  animarSalida(sabia);

  // La que no sabía vuelve al final de la sesión, como en Anki; máximo dos veces para no volverse eterna
  if (!sabia && (palabra.vueltas || 0) < 2) {
    palabrasRepaso.push({ ...palabra, vueltas: (palabra.vueltas || 0) + 1 });
  }

  try {
    await VocabularioAPI.responder({ id: palabra.id, sabia });
  } catch (err) {
    console.error("No se pudo actualizar la palabra:", err);
  }

  if (sesion !== sesionVocab) return;
  temporizadorSiguiente = setTimeout(() => {
    respondiendo = false;
    if (sesion !== sesionVocab) return;
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
    // Ni teclas sostenidas, ni atajos del navegador, ni lo que se escribe en otro campo
    if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
    if (e.key === " " && e.target.closest && e.target.closest("button, a")) return;

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
      clearTimeout(temporizadorSiguiente);
      sesionVocab += 1;
      respondiendo = false;
      document.getElementById("vista-vocabulario").classList.add("oculto");
      document.getElementById("vista-principal").classList.remove("oculto");
      if (typeof cargarProgreso === "function") cargarProgreso();
    });
  }
});
