let reconocimiento = null;
let escuchando = false;
let historialVoz = []; // [{ rol: "usuario"|"ia", texto: "..." }]
let vocesDisponibles = [];

const SoporteVoz = {
  reconocimientoDisponible: !!(
    window.SpeechRecognition || window.webkitSpeechRecognition
  ),
  sintesisDisponible: !!window.speechSynthesis,
};

function iniciarVistaVoz() {
  document.getElementById("vista-principal").classList.add("oculto");
  document.getElementById("vista-voz").classList.remove("oculto");

  historialVoz = [];
  document.getElementById("voz-chat").innerHTML = "";
  document
    .getElementById("voz-aviso-navegador")
    .classList.toggle("oculto", SoporteVoz.reconocimientoDisponible);

  agregarMensajeChat(
    "ia",
    "Hi! I'm your English speaking partner. Press the microphone and start talking to me!",
  );
  hablar(
    "Hi! I'm your English speaking partner. Press the microphone and start talking to me!",
  );

  configurarReconocimiento();
}

function configurarReconocimiento() {
  if (!SoporteVoz.reconocimientoDisponible) return;

  const SpeechRecognitionAPI =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  reconocimiento = new SpeechRecognitionAPI();
  reconocimiento.lang = "en-US";
  reconocimiento.interimResults = false;
  reconocimiento.maxAlternatives = 1;

  reconocimiento.onresult = (evento) => {
    const texto = evento.results[0][0].transcript;
    manejarMensajeUsuario(texto);
  };

  reconocimiento.onerror = () => {
    detenerEscucha();
    mostrarEstadoMic("Hubo un problema escuchando. Intenta de nuevo.");
  };

  reconocimiento.onend = () => {
    detenerEscucha();
  };
}

function alternarEscucha() {
  if (!SoporteVoz.reconocimientoDisponible) return;

  if (escuchando) {
    reconocimiento.stop();
    detenerEscucha();
  } else {
    window.speechSynthesis.cancel(); // no se pisan la voz de la IA y el micrófono
    reconocimiento.start();
    escuchando = true;
    document.getElementById("btn-mic").classList.add("escuchando");
    mostrarEstadoMic("Escuchando... habla en inglés");
  }
}

function detenerEscucha() {
  escuchando = false;
  const btn = document.getElementById("btn-mic");
  if (btn) btn.classList.remove("escuchando");
}

function mostrarEstadoMic(texto) {
  const estado = document.getElementById("voz-estado");
  if (estado) estado.textContent = texto;
}

async function manejarMensajeUsuario(texto) {
  agregarMensajeChat("usuario", texto);
  historialVoz.push({ rol: "usuario", texto });
  mostrarEstadoMic("Pensando...");

  try {
    const datos = await VozAPI.enviarMensaje({
      mensajeUsuario: texto,
      historial: historialVoz,
      nivel: null,
    });

    historialVoz.push({ rol: "ia", texto: datos.respuesta });
    agregarMensajeChat("ia", datos.respuesta);

    if (datos.correccion) {
      agregarMensajeChat("correccion", datos.correccion);
    }

    hablar(datos.respuesta);
    mostrarEstadoMic("Presiona el micrófono para responder");
  } catch (err) {
    mostrarEstadoMic("No se pudo procesar tu mensaje. Intenta de nuevo.");
  }
}

function agregarMensajeChat(tipo, texto) {
  const chat = document.getElementById("voz-chat");
  const burbuja = document.createElement("div");
  burbuja.className = `voz-burbuja voz-burbuja-${tipo}`;
  burbuja.textContent = texto;
  chat.appendChild(burbuja);
  chat.scrollTop = chat.scrollHeight;
}

function cargarVoces() {
  vocesDisponibles = window.speechSynthesis.getVoices();
}

function hablar(texto) {
  if (!SoporteVoz.sintesisDisponible) return;

  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = "en-US";

  const vozIngles = vocesDisponibles.find(
    (v) => v.lang && v.lang.startsWith("en"),
  );
  if (vozIngles) utterance.voice = vozIngles;

  window.speechSynthesis.speak(utterance);
}

document.addEventListener("DOMContentLoaded", () => {
  const btnHablar = document.getElementById("btn-hablar-ia");
  if (btnHablar) btnHablar.addEventListener("click", iniciarVistaVoz);

  const btnMic = document.getElementById("btn-mic");
  if (btnMic) btnMic.addEventListener("click", alternarEscucha);

  const btnSalirVoz = document.getElementById("btn-salir-voz");
  if (btnSalirVoz) {
    btnSalirVoz.addEventListener("click", () => {
      if (reconocimiento && escuchando) reconocimiento.stop();
      window.speechSynthesis.cancel();
      document.getElementById("vista-voz").classList.add("oculto");
      document.getElementById("vista-principal").classList.remove("oculto");
    });
  }

  if (SoporteVoz.sintesisDisponible) {
    cargarVoces();
    window.speechSynthesis.onvoiceschanged = cargarVoces;
  }
});
