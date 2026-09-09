let escenaActual = null;
let indiceLinea = 0;
let reconocimientoEscena = null;
let escuchandoEscena = false;
let vocesDisponiblesEscena = [];

function soporteVozDisponibleEscena() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

async function iniciarEscena() {
  document.getElementById("vista-principal").classList.add("oculto");
  document.getElementById("vista-escena").classList.remove("oculto");

  indiceLinea = 0;
  document.getElementById("escena-situacion").textContent = "Loading scene...";
  document.getElementById("escena-linea-texto").textContent = "";
  document.getElementById("escena-feedback").classList.add("oculto");
  document.getElementById("btn-siguiente-linea").classList.add("oculto");

  configurarReconocimientoEscena();

  try {
    escenaActual = await EscenaAPI.obtenerEscena();
    mostrarLineaActual();
  } catch (err) {
    document.getElementById("escena-situacion").textContent =
      "Could not load the scene. Try again.";
  }
}

function mostrarLineaActual() {
  document.getElementById("escena-situacion").textContent =
    `🎬 ${escenaActual.titulo} — ${escenaActual.situacion}`;
  document.getElementById("escena-linea-texto").textContent =
    `Line ${indiceLinea + 1} of ${escenaActual.lineas.length}: "${escenaActual.lineas[indiceLinea]}"`;
  document.getElementById("escena-feedback").classList.add("oculto");
  document.getElementById("btn-siguiente-linea").classList.add("oculto");
  document.getElementById("escena-estado").textContent =
    "Press play to hear it, then the mic to repeat";
}

function reproducirLineaActual() {
  if (!window.speechSynthesis || !escenaActual) return;

  const utterance = new SpeechSynthesisUtterance(
    escenaActual.lineas[indiceLinea],
  );
  utterance.lang = "en-US";

  const vozIngles = vocesDisponiblesEscena.find(
    (v) => v.lang && v.lang.startsWith("en"),
  );
  if (vozIngles) utterance.voice = vozIngles;

  window.speechSynthesis.speak(utterance);
}

function configurarReconocimientoEscena() {
  if (!soporteVozDisponibleEscena()) {
    document.getElementById("escena-estado").textContent =
      "Your browser doesn't support voice recognition. Try Chrome or Edge on desktop.";
    return;
  }

  const SpeechRecognitionAPI =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  reconocimientoEscena = new SpeechRecognitionAPI();
  reconocimientoEscena.lang = "en-US";
  reconocimientoEscena.interimResults = false;
  reconocimientoEscena.maxAlternatives = 1;

  reconocimientoEscena.onresult = (evento) => {
    const texto = evento.results[0][0].transcript;
    evaluarLineaDicha(texto);
  };

  reconocimientoEscena.onerror = () => {
    detenerEscuchaEscena();
    document.getElementById("escena-estado").textContent =
      "There was a problem listening. Try again.";
  };

  reconocimientoEscena.onend = () => detenerEscuchaEscena();
}

function alternarEscuchaEscena() {
  if (!reconocimientoEscena) return;

  if (escuchandoEscena) {
    reconocimientoEscena.stop();
    detenerEscuchaEscena();
  } else {
    window.speechSynthesis.cancel();
    reconocimientoEscena.start();
    escuchandoEscena = true;
    document.getElementById("btn-mic-escena").classList.add("escuchando");
    document.getElementById("escena-estado").textContent =
      "Listening... say the line";
  }
}

function detenerEscuchaEscena() {
  escuchandoEscena = false;
  const btn = document.getElementById("btn-mic-escena");
  if (btn) btn.classList.remove("escuchando");
}

async function evaluarLineaDicha(transcripcion) {
  document.getElementById("escena-estado").textContent = "Checking...";

  try {
    const resultado = await EscenaAPI.evaluarLinea({
      lineaObjetivo: escenaActual.lineas[indiceLinea],
      transcripcion,
    });

    const feedbackEl = document.getElementById("escena-feedback");
    feedbackEl.textContent = `${resultado.puntuacion}/100 — ${resultado.feedback}`;
    feedbackEl.classList.remove("oculto");

    document.getElementById("btn-siguiente-linea").classList.remove("oculto");
    document.getElementById("escena-estado").textContent =
      "Check your feedback below";
  } catch (err) {
    document.getElementById("escena-estado").textContent =
      "Could not check your line. Try again.";
  }
}

function siguienteLineaEscena() {
  indiceLinea++;

  if (indiceLinea >= escenaActual.lineas.length) {
    document.getElementById("escena-situacion").textContent =
      "🎉 Scene complete! Great job.";
    document.getElementById("escena-linea-texto").textContent = "";
    document.getElementById("escena-feedback").classList.add("oculto");
    document.getElementById("btn-siguiente-linea").classList.add("oculto");
    document.getElementById("escena-estado").textContent =
      'Press "Back to Home" or press the scene button again for a new one';
  } else {
    mostrarLineaActual();
  }
}

function cargarVocesEscena() {
  vocesDisponiblesEscena = window.speechSynthesis.getVoices();
}

document.addEventListener("DOMContentLoaded", () => {
  const btnEscena = document.getElementById("btn-escena");
  if (btnEscena) btnEscena.addEventListener("click", iniciarEscena);

  const btnEscuchar = document.getElementById("btn-escuchar-linea");
  if (btnEscuchar) btnEscuchar.addEventListener("click", reproducirLineaActual);

  const btnMicEscena = document.getElementById("btn-mic-escena");
  if (btnMicEscena)
    btnMicEscena.addEventListener("click", alternarEscuchaEscena);

  const btnSiguiente = document.getElementById("btn-siguiente-linea");
  if (btnSiguiente)
    btnSiguiente.addEventListener("click", siguienteLineaEscena);

  const btnSalirEscena = document.getElementById("btn-salir-escena");
  if (btnSalirEscena) {
    btnSalirEscena.addEventListener("click", () => {
      if (reconocimientoEscena && escuchandoEscena) reconocimientoEscena.stop();
      window.speechSynthesis.cancel();
      document.getElementById("vista-escena").classList.add("oculto");
      document.getElementById("vista-principal").classList.remove("oculto");
    });
  }

  if (window.speechSynthesis) {
    cargarVocesEscena();
    window.speechSynthesis.onvoiceschanged = cargarVocesEscena;
  }
});
