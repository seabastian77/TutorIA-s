let palabrasRepaso = [];
let indicePalabra = 0;

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

  controles.classList.add("oculto");
  contextoEl.classList.add("oculto");

  if (indicePalabra >= palabrasRepaso.length) {
    progresoEl.textContent = "";
    textoEl.textContent = palabrasRepaso.length
      ? "🎉 You reviewed all your due words!"
      : "You're all caught up! No words to review right now.";
    btnMostrar.classList.add("oculto");
    return;
  }

  progresoEl.textContent = `Word ${indicePalabra + 1} of ${palabrasRepaso.length}`;
  textoEl.textContent = palabrasRepaso[indicePalabra].palabra;
  btnMostrar.classList.remove("oculto");
}

function mostrarTraduccion() {
  const palabra = palabrasRepaso[indicePalabra];
  const contextoEl = document.getElementById("vocab-contexto");

  contextoEl.textContent = `${palabra.traduccion} — "${palabra.contexto}"`;
  contextoEl.classList.remove("oculto");
  document.getElementById("vocab-btn-mostrar").classList.add("oculto");
  document.getElementById("vocab-controles").classList.remove("oculto");
}

async function responderPalabra(sabia) {
  const palabra = palabrasRepaso[indicePalabra];

  try {
    await VocabularioAPI.responder({ id: palabra.id, sabia });
  } catch (err) {
    console.error("No se pudo actualizar la palabra:", err);
  }

  indicePalabra++;
  mostrarPalabraActual();
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

  const btnSalirVocab = document.getElementById("btn-salir-vocabulario");
  if (btnSalirVocab) {
    btnSalirVocab.addEventListener("click", () => {
      document.getElementById("vista-vocabulario").classList.add("oculto");
      document.getElementById("vista-principal").classList.remove("oculto");
    });
  }
});
