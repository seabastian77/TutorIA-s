// Talk to the AI: tutoría en video con Numi, que escucha por el micrófono, responde con la IA y habla con un avatar animado

let reconocimiento = null;
let escuchando = false;
let historialVoz = []; // [{ rol: "usuario"|"ia", texto: "..." }]
let avatar = null; // controles del avatar animado
let videoReal = null; // conexión con el proveedor de video, solo si el backend lo tiene configurado
let configAvatar = { modo: "demo", proveedor: null, maxSegundos: null };
let sesionActiva = false;
let turnoHabla = 0; // cada cosa nueva que dice o calla la tutora deja sin efecto la anterior
let turnoPregunta = 0; // una respuesta que llega tarde no se lee si ya se preguntó otra cosa
let inicioSesion = 0;
let reloj = null;
let textoOido = "";

const SoporteVoz = {
  reconocimientoDisponible: !!(
    window.SpeechRecognition || window.webkitSpeechRecognition
  ),
  sintesisDisponible: !!window.speechSynthesis,
};

const ESTADOS = {
  listo: ["Ready", "Lista"],
  escuchando: ["Listening", "Escuchando"],
  pensando: ["Thinking", "Pensando"],
  hablando: ["Speaking", "Hablando"],
};

/** Dice si el estudiante tiene encendidas las explicaciones en español. */
function enEspanol() {
  const casilla = document.getElementById("ayuda-espanol-check");
  return Boolean(casilla && casilla.checked);
}

/** Escoge el texto en inglés o en español según la ayuda que tenga encendida. */
function segunIdioma(ingles, espanol) {
  return enEspanol() ? espanol : ingles;
}

function mostrarEstadoMic(texto) {
  const estado = document.getElementById("voz-estado");
  if (estado) estado.textContent = texto;
}

/** Cambia el estado visible de la tutoría en el escenario, en el avatar y en la nota bajo el micrófono. */
function ponerEstado(estado, nota) {
  const escenario = document.getElementById("tutoria-escenario");
  if (escenario) escenario.dataset.estado = estado;
  const etiqueta = document.getElementById("tutoria-estado-texto");
  if (etiqueta) etiqueta.textContent = ESTADOS[estado][enEspanol() ? 1 : 0];
  if (avatar) avatar.estado(estado);
  if (nota) mostrarEstadoMic(nota);
  const mic = document.getElementById("btn-mic");
  if (mic) mic.classList.toggle("escuchando", estado === "escuchando");
}

/** Muestra un subtítulo sobre el video: lo que dice Numi o lo que el navegador va oyendo del estudiante. */
function mostrarSubtitulo(texto, deQuien = "ia") {
  const sub = document.getElementById("tutoria-subtitulo");
  if (!sub) return;
  sub.textContent = texto;
  sub.dataset.quien = deQuien;
  sub.classList.toggle("oculto", !texto);
}

function ponerModo(texto, real = false, detalle = "") {
  const modo = document.getElementById("tutoria-modo");
  if (!modo) return;
  modo.textContent = texto;
  modo.title = detalle;
  modo.classList.toggle("tutoria-modo-real", real);
}

function habilitarControles(activos) {
  ["btn-mic", "btn-terminar-tutoria", "tutoria-texto"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = !activos || (id === "btn-mic" && !SoporteVoz.reconocimientoDisponible);
  });
  document.querySelectorAll(".tutoria-enviar, .tutoria-chip").forEach((b) => { b.disabled = !activos; });
}

function iniciarVistaVoz() {
  document.getElementById("vista-principal").classList.add("oculto");
  document.getElementById("vista-voz").classList.remove("oculto");

  historialVoz = [];
  document.getElementById("voz-chat").innerHTML = "";
  document
    .getElementById("voz-aviso-navegador")
    .classList.toggle("oculto", SoporteVoz.reconocimientoDisponible);

  if (!avatar) avatar = AvatarTutor.montar(document.getElementById("tutoria-avatar"));
  mostrarPortada(true);
  habilitarControles(false);
  ponerEstado("listo", segunIdioma("Start the session to talk with Numi", "Empieza la sesión para hablar con Numi"));
  mostrarSubtitulo("");
  document.getElementById("tutoria-tiempo").textContent = "00:00";

  ponerModo("Demo avatar", false, "Animated avatar running in the browser");
  AvatarAPI.config()
    .then((conf) => {
      configAvatar = conf;
      if (conf.modo === "real") ponerModo("Live video ready", true, `Provider: ${conf.proveedor}`);
    })
    .catch(() => { configAvatar = { modo: "demo" }; });

  configurarReconocimiento();
}

function mostrarPortada(visible) {
  const portada = document.getElementById("tutoria-portada");
  if (portada) portada.classList.toggle("oculto", !visible);
}

/** Arranca la sesión dentro del toque del estudiante: así el navegador deja sonar el audio. */
async function empezarSesion() {
  if (sesionActiva) return;
  await AvatarTutor.activarAudio();
  sesionActiva = true;
  mostrarPortada(false);
  habilitarControles(true);
  inicioSesion = Date.now();
  clearInterval(reloj);
  reloj = setInterval(actualizarReloj, 1000);

  if (configAvatar.modo === "real") await conectarVideoReal();

  const usuario = (typeof Sesion !== "undefined" && Sesion.obtenerUsuario()) || {};
  const nombre = String(usuario.nombre || "").trim().split(/\s+/)[0];
  const saludo = `Hi${nombre ? ` ${nombre}` : ""}! I'm Numi, your English tutor. Ask me anything about English, or tell me what you want to practise today.`;
  agregarMensajeChat("ia", saludo);
  historialVoz.push({ rol: "ia", texto: saludo });
  const mio = turnoPregunta;
  await decir(saludo);
  if (mio === turnoPregunta) escucharSiAutomatico();
}

/** Intenta el avatar en video del proveedor; si no se puede, la sesión sigue con el de demostración. */
async function conectarVideoReal() {
  ponerModo("Connecting video...", false);
  try {
    const sesion = await AvatarAPI.crearSesion();
    const video = document.getElementById("tutoria-video");
    videoReal = await AvatarSimli.conectar({
      sessionToken: sesion.sessionToken,
      video,
      audio: document.getElementById("tutoria-audio"),
      alCortarse: () => {
        if (!videoReal) return;
        videoReal = null;
        alternarVideo(false);
        ponerModo("Demo avatar", false, "The live video ended");
      },
    });
    alternarVideo(true);
    ponerModo("Live video avatar", true, `Provider: ${sesion.proveedor}`);
  } catch (error) {
    videoReal = null;
    alternarVideo(false);
    ponerModo("Demo avatar", false, "Live video unavailable");
    agregarMensajeChat("aviso", segunIdioma(
      "The live video avatar couldn't connect, so Numi is using her demo avatar.",
      "El avatar en video no se pudo conectar, así que Numi sigue con su avatar de demostración.",
    ));
  }
}

function alternarVideo(conVideo) {
  document.getElementById("tutoria-video").classList.toggle("oculto", !conVideo);
  document.getElementById("tutoria-avatar").classList.toggle("oculto", conVideo);
}

function actualizarReloj() {
  const segundos = Math.floor((Date.now() - inicioSesion) / 1000);
  const mm = String(Math.floor(segundos / 60)).padStart(2, "0");
  const ss = String(segundos % 60).padStart(2, "0");
  document.getElementById("tutoria-tiempo").textContent = `${mm}:${ss}`;
  // El video real se paga por minuto: al llegar al tope la sesión se cierra sola
  if (videoReal && configAvatar.maxSegundos && segundos >= configAvatar.maxSegundos) terminarSesion();
}

function terminarSesion() {
  sesionActiva = false;
  turnoPregunta += 1;
  detenerReconocimiento();
  callarTutor();
  clearInterval(reloj);
  if (videoReal) {
    videoReal.cerrar();
    videoReal = null;
  }
  alternarVideo(false);
  habilitarControles(false);
  mostrarPortada(true);
  const boton = document.getElementById("btn-iniciar-tutoria");
  if (boton) boton.textContent = "Start a new session";
  ponerEstado("listo", segunIdioma("Session finished. Start a new one whenever you want.", "Sesión terminada. Empieza otra cuando quieras."));
  if (configAvatar.modo === "real") ponerModo("Live video ready", true);
}

/** Pide la voz del servidor y la deja decodificada; null si no hay voz propia o falla. */
async function obtenerAudio(texto) {
  if (!VozIngles.servidorLee("en")) return null;
  try {
    const { audio } = await VozAPI.hablar({ texto, idioma: "en", velocidad: VozIngles.RITMO_INGLES });
    if (!audio) return null;
    const binario = atob(audio);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
    return await AvatarTutor.decodificar(bytes.buffer);
  } catch (e) {
    return null;
  }
}

/** Lee con la voz del navegador moviendo los labios al ritmo de las palabras; resuelve al terminar. */
function hablarConNavegador(texto) {
  return new Promise((resolver) => {
    let terminado = false;
    const fin = () => {
      if (terminado) return;
      terminado = true;
      avatar.terminarHablaSintetica();
      resolver();
    };
    const estimado = Labios.duracionEstimada(texto, VozIngles.RITMO_INGLES);
    VozIngles.callar();
    avatar.empezarHablaSintetica();
    VozIngles.leerConElNavegador(texto, "en", VozIngles.RITMO_INGLES, undefined, {
      alPalabra: () => avatar.pulsoPalabra(),
      alTerminar: fin,
    }).then((sono) => {
      // Sin ninguna voz disponible se ven los subtítulos y la boca durante el tiempo estimado
      if (!sono) setTimeout(fin, estimado);
    });
    setTimeout(fin, estimado * 2 + 3000); // por si el navegador nunca avisa que terminó
  });
}

/** Numi dice un texto: con video real se lo envía al proveedor; si no, lo habla el avatar animado. */
async function decir(texto) {
  const mio = ++turnoHabla;
  ponerEstado("hablando", segunIdioma("Numi is speaking. Tap the mic to interrupt.", "Numi está hablando. Toca el micrófono para interrumpir."));
  mostrarSubtitulo(texto, "ia");

  const buffer = await obtenerAudio(texto);
  if (mio !== turnoHabla) return;

  if (videoReal && buffer) {
    videoReal.enviarVoz(Labios.aPcm16(buffer.getChannelData(0), buffer.sampleRate));
    await new Promise((listo) => setTimeout(listo, buffer.duration * 1000 + 700));
  } else if (buffer) {
    await avatar.reproducir(buffer);
  } else {
    await hablarConNavegador(texto);
  }

  if (mio !== turnoHabla) return;
  mostrarSubtitulo("");
  ponerEstado("listo", segunIdioma("Tap the mic to answer, or type below", "Toca el micrófono para responder o escribe abajo"));
}

/** Corta lo que Numi esté diciendo, venga del avatar, del navegador o del video real. */
function callarTutor() {
  turnoHabla += 1;
  if (avatar) avatar.callar();
  VozIngles.callar();
  if (videoReal) videoReal.callar();
  mostrarSubtitulo("");
}

function configurarReconocimiento() {
  if (!SoporteVoz.reconocimientoDisponible || reconocimiento) return;

  const SpeechRecognitionAPI =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  reconocimiento = new SpeechRecognitionAPI();
  reconocimiento.lang = "en-US";
  reconocimiento.interimResults = true;
  reconocimiento.maxAlternatives = 1;

  reconocimiento.onresult = (evento) => {
    let parcial = "";
    let final = "";
    for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
      const trozo = evento.results[i][0].transcript;
      if (evento.results[i].isFinal) final += trozo;
      else parcial += trozo;
    }
    if (final) textoOido = `${textoOido} ${final}`.trim();
    mostrarSubtitulo(`${textoOido} ${parcial}`.trim(), "estudiante");
  };

  reconocimiento.onerror = (evento) => {
    escuchando = false;
    if (evento.error === "not-allowed" || evento.error === "service-not-allowed") {
      ponerEstado("listo", segunIdioma("The microphone is blocked. Allow it in your browser, or type your question.", "El micrófono está bloqueado. Permítelo en el navegador o escribe tu pregunta."));
      document.getElementById("tutoria-auto").checked = false;
    } else if (evento.error === "no-speech") {
      ponerEstado("listo", segunIdioma("I didn't hear anything. Tap the mic and try again.", "No te escuché. Toca el micrófono e inténtalo otra vez."));
    } else if (evento.error !== "aborted") {
      ponerEstado("listo", segunIdioma("There was a problem listening. Try again.", "Hubo un problema escuchando. Intenta de nuevo."));
    }
  };

  reconocimiento.onend = () => {
    const estabaEscuchando = escuchando;
    escuchando = false;
    const dicho = textoOido.trim();
    textoOido = "";
    if (!sesionActiva) return;
    if (dicho) {
      manejarMensajeUsuario(dicho);
    } else if (estabaEscuchando) {
      mostrarSubtitulo("");
      ponerEstado("listo", segunIdioma("Tap the mic to talk, or type below", "Toca el micrófono para hablar o escribe abajo"));
    }
  };
}

/** Empieza a escuchar: si Numi estaba hablando, se calla para no pisarse con el micrófono. */
function escuchar() {
  if (!sesionActiva || !SoporteVoz.reconocimientoDisponible || escuchando) return;
  callarTutor();
  textoOido = "";
  try {
    reconocimiento.start();
  } catch (e) {
    return; // ya estaba arrancando
  }
  escuchando = true;
  ponerEstado("escuchando", segunIdioma("Listening... speak in English", "Escuchando... habla en inglés"));
}

function escucharSiAutomatico() {
  if (sesionActiva && document.getElementById("tutoria-auto").checked) escuchar();
}

function detenerReconocimiento() {
  if (reconocimiento && escuchando) {
    try { reconocimiento.abort(); } catch (e) { /* ya estaba detenido */ }
  }
  escuchando = false;
  textoOido = "";
}

function alternarEscucha() {
  if (!sesionActiva || !SoporteVoz.reconocimientoDisponible) return;
  if (escuchando) {
    reconocimiento.stop(); // al cerrar entrega lo que oyó y se envía
  } else {
    escuchar();
  }
}

async function manejarMensajeUsuario(texto) {
  const limpio = String(texto || "").trim().slice(0, 500);
  if (!limpio || !sesionActiva) return;
  detenerReconocimiento();
  callarTutor();

  agregarMensajeChat("usuario", limpio);
  historialVoz.push({ rol: "usuario", texto: limpio });
  const mio = ++turnoPregunta;
  ponerEstado("pensando", segunIdioma("Numi is thinking...", "Numi está pensando..."));

  try {
    const datos = await VozAPI.enviarMensaje({
      mensajeUsuario: limpio,
      // El mensaje nuevo va aparte; el historial solo lleva lo anterior
      historial: historialVoz.slice(0, -1),
      nivel: null,
      modo: "tutor",
    });
    if (mio !== turnoPregunta || !sesionActiva) return;

    historialVoz.push({ rol: "ia", texto: datos.respuesta });
    agregarMensajeChat("ia", datos.respuesta);
    if (datos.correccion) agregarMensajeChat("correccion", datos.correccion);

    await decir(datos.respuesta);
    if (mio === turnoPregunta) escucharSiAutomatico();
  } catch (err) {
    if (mio !== turnoPregunta) return;
    // Lo que no llegó no queda en la conversación que ve la IA
    if (historialVoz[historialVoz.length - 1]?.texto === limpio) historialVoz.pop();
    ponerEstado("listo", segunIdioma("Numi couldn't answer that. Try again.", "Numi no pudo responder. Intenta de nuevo."));
  }
}

function agregarMensajeChat(tipo, texto) {
  const chat = document.getElementById("voz-chat");
  const burbuja = document.createElement("div");
  burbuja.className = `voz-burbuja voz-burbuja-${tipo}`;
  if (tipo === "correccion") {
    const etiqueta = document.createElement("strong");
    etiqueta.textContent = "Tip: ";
    burbuja.append(etiqueta, texto);
  } else {
    burbuja.textContent = texto;
  }
  chat.appendChild(burbuja);
  chat.scrollTop = chat.scrollHeight;
}

function salirDeVoz() {
  if (sesionActiva) terminarSesion();
  detenerReconocimiento();
  callarTutor();
  if (avatar) {
    avatar.destruir();
    avatar = null;
  }
  const boton = document.getElementById("btn-iniciar-tutoria");
  if (boton) boton.textContent = "Start session";
  document.getElementById("vista-voz").classList.add("oculto");
  document.getElementById("vista-principal").classList.remove("oculto");
}

document.addEventListener("DOMContentLoaded", () => {
  const btnHablar = document.getElementById("btn-hablar-ia");
  if (btnHablar) btnHablar.addEventListener("click", iniciarVistaVoz);

  const btnMic = document.getElementById("btn-mic");
  if (btnMic) btnMic.addEventListener("click", alternarEscucha);

  const btnIniciar = document.getElementById("btn-iniciar-tutoria");
  if (btnIniciar) btnIniciar.addEventListener("click", empezarSesion);

  const btnTerminar = document.getElementById("btn-terminar-tutoria");
  if (btnTerminar) btnTerminar.addEventListener("click", terminarSesion);

  const formulario = document.getElementById("tutoria-form");
  if (formulario) {
    formulario.addEventListener("submit", (e) => {
      e.preventDefault();
      const entrada = document.getElementById("tutoria-texto");
      const texto = entrada.value;
      entrada.value = "";
      manejarMensajeUsuario(texto);
    });
  }

  document.querySelectorAll(".tutoria-chip").forEach((chip) => {
    chip.addEventListener("click", () => manejarMensajeUsuario(chip.textContent));
  });

  const btnSalirVoz = document.getElementById("btn-salir-voz");
  if (btnSalirVoz) btnSalirVoz.addEventListener("click", salirDeVoz);
});
