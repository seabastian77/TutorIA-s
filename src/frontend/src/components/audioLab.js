let dictadoActual = null;
let comprensionActual = null;
let respuestasAudio = [];

/** Lee un texto en voz alta con la voz inglesa del navegador. */
function hablarIngles(texto, velocidad = 1) {
  if (!("speechSynthesis" in window)) return false;

  window.speechSynthesis.cancel();
  const mensaje = new SpeechSynthesisUtterance(texto);
  mensaje.lang = "en-US";
  mensaje.rate = velocidad;

  const vozInglesa = window.speechSynthesis
    .getVoices()
    .find((v) => v.lang && v.lang.startsWith("en"));
  if (vozInglesa) mensaje.voice = vozInglesa;

  window.speechSynthesis.speak(mensaje);
  return true;
}

function navegadorLee() {
  return "speechSynthesis" in window;
}

async function iniciarAudioLab() {
  document.getElementById("vista-principal").classList.add("oculto");
  document.getElementById("vista-audio").classList.remove("oculto");

  document
    .getElementById("audio-aviso-navegador")
    .classList.toggle("oculto", navegadorLee());

  mostrarMenuAudio();
}

function mostrarMenuAudio() {
  window.speechSynthesis?.cancel();
  document.getElementById("audio-menu").classList.remove("oculto");
  document.getElementById("audio-dictado").classList.add("oculto");
  document.getElementById("audio-comprension").classList.add("oculto");
  document.getElementById("audio-estado").textContent = "";
}

// Dictado

async function nuevoDictado() {
  document.getElementById("audio-menu").classList.add("oculto");
  document.getElementById("audio-comprension").classList.add("oculto");
  document.getElementById("audio-dictado").classList.remove("oculto");

  const estado = document.getElementById("audio-estado");
  estado.textContent = "Preparing your dictation...";

  document.getElementById("dictado-entrada").value = "";
  document.getElementById("dictado-entrada").disabled = true;
  document.getElementById("dictado-resultado").classList.add("oculto");
  document.getElementById("dictado-frase-revelada").classList.add("oculto");
  document.getElementById("btn-comprobar-dictado").disabled = true;

  try {
    dictadoActual = await AudioAPI.dictado();
    estado.textContent = "";
    document.getElementById("dictado-pista").textContent =
      dictadoActual.pista || "";
    document.getElementById("dictado-entrada").disabled = false;
    document.getElementById("btn-comprobar-dictado").disabled = false;
    hablarIngles(dictadoActual.frase);
    document.getElementById("dictado-entrada").focus();
  } catch (err) {
    estado.textContent = "Could not prepare the dictation.";
  }
}

async function comprobarDictado() {
  if (!dictadoActual) return;

  const boton = document.getElementById("btn-comprobar-dictado");
  const texto = document.getElementById("dictado-entrada").value;
  boton.disabled = true;
  boton.textContent = "Checking...";

  try {
    const datos = await AudioAPI.responderDictado(
      dictadoActual.ejercicioId,
      texto,
    );

    // Pinta la frase original palabra por palabra en verde y rojo
    const zona = document.getElementById("dictado-palabras");
    zona.innerHTML = "";
    datos.detalle.forEach((d) => {
      const palabra = document.createElement("span");
      palabra.className = `palabra-marcada ${d.acerto ? "palabra-ok" : "palabra-mal"}`;
      palabra.textContent = d.palabra;
      zona.appendChild(palabra);
    });

    document.getElementById("dictado-frase-original").textContent = datos.frase;
    document.getElementById("dictado-frase-revelada").classList.remove("oculto");

    const resultado = document.getElementById("dictado-resultado");
    resultado.textContent = datos.perfecto
      ? `Perfect! ${datos.porcentaje}% — +${datos.xpGanado} XP`
      : `${datos.aciertos} of ${datos.total} words — ${datos.porcentaje}% — +${datos.xpGanado} XP`;
    resultado.className = "nivel-feedback";
    resultado.classList.remove("oculto");

    const chip = document.getElementById("progreso-monedas");
    if (chip && typeof datos.monedas === "number") chip.textContent = datos.monedas;
  } catch (err) {
    const resultado = document.getElementById("dictado-resultado");
    resultado.textContent = "Could not check your dictation.";
    resultado.className = "nivel-feedback";
    resultado.classList.remove("oculto");
  } finally {
    boton.disabled = false;
    boton.textContent = "Check";
  }
}

// Comprensión auditiva

async function nuevaComprension() {
  document.getElementById("audio-menu").classList.add("oculto");
  document.getElementById("audio-dictado").classList.add("oculto");
  document.getElementById("audio-comprension").classList.remove("oculto");

  const estado = document.getElementById("audio-estado");
  estado.textContent = "Preparing the audio...";
  document.getElementById("comprension-preguntas").innerHTML = "";
  document.getElementById("comprension-resultado").classList.add("oculto");
  document.getElementById("comprension-transcripcion").classList.add("oculto");

  try {
    comprensionActual = await AudioAPI.comprension();
    respuestasAudio = new Array(comprensionActual.preguntas.length).fill(null);
    estado.textContent = "";

    document.getElementById("comprension-titulo").textContent =
      comprensionActual.titulo;
    pintarPreguntasAudio(comprensionActual.preguntas);
    hablarIngles(comprensionActual.texto);
  } catch (err) {
    estado.textContent = "Could not prepare the audio.";
  }
}

function pintarPreguntasAudio(preguntas) {
  const zona = document.getElementById("comprension-preguntas");
  zona.innerHTML = "";

  preguntas.forEach((p, indice) => {
    const bloque = document.createElement("div");
    bloque.className = "pregunta-bloque";

    const enunciado = document.createElement("p");
    enunciado.className = "pregunta-enunciado";
    enunciado.textContent = `${indice + 1}. ${p.pregunta}`;
    bloque.appendChild(enunciado);

    const opciones = document.createElement("div");
    opciones.className = "nivel-opciones";

    p.opciones.forEach((textoOpcion, i) => {
      const boton = document.createElement("button");
      boton.className = "opcion-nivel";
      boton.textContent = textoOpcion;
      boton.addEventListener("click", () => {
        respuestasAudio[indice] = i;
        opciones
          .querySelectorAll("button")
          .forEach((b) => b.classList.remove("elegida"));
        boton.classList.add("elegida");
      });
      opciones.appendChild(boton);
    });

    bloque.appendChild(opciones);
    zona.appendChild(bloque);
  });
}

async function enviarRespuestasAudio() {
  if (!comprensionActual) return;

  const boton = document.getElementById("btn-enviar-comprension");
  const resultado = document.getElementById("comprension-resultado");

  if (respuestasAudio.some((r) => r === null)) {
    resultado.textContent = "Answer all the questions first.";
    resultado.className = "nivel-feedback";
    resultado.classList.remove("oculto");
    return;
  }

  boton.disabled = true;
  boton.textContent = "Checking...";

  try {
    const datos = await AudioAPI.responderComprension(
      comprensionActual.ejercicioId,
      respuestasAudio,
    );

    const bloques = document.querySelectorAll(
      "#comprension-preguntas .pregunta-bloque",
    );
    datos.correccion.forEach((c, i) => {
      const botones = bloques[i].querySelectorAll("button");
      botones.forEach((b, j) => {
        if (j === c.correcta) b.classList.add("correcta");
        else if (j === respuestasAudio[i] && !c.acerto)
          b.classList.add("incorrecta");
        b.disabled = true;
      });
    });

    // Ahora sí se puede leer lo que se dijo
    document.getElementById("comprension-texto").textContent = datos.texto;
    document.getElementById("comprension-transcripcion").classList.remove("oculto");

    resultado.textContent = datos.perfecto
      ? `Perfect! ${datos.aciertos}/${datos.total} — +${datos.xpGanado} XP`
      : `${datos.aciertos} of ${datos.total} correct — +${datos.xpGanado} XP`;
    resultado.className = "nivel-feedback";
    resultado.classList.remove("oculto");

    const chip = document.getElementById("progreso-monedas");
    if (chip && typeof datos.monedas === "number") chip.textContent = datos.monedas;
  } catch (err) {
    resultado.textContent = "Could not check your answers.";
    resultado.className = "nivel-feedback";
    resultado.classList.remove("oculto");
  } finally {
    boton.disabled = false;
    boton.textContent = "Check answers";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn-audio");
  if (btn) btn.addEventListener("click", iniciarAudioLab);

  const btnDictado = document.getElementById("btn-modo-dictado");
  if (btnDictado) btnDictado.addEventListener("click", nuevoDictado);

  const btnComprension = document.getElementById("btn-modo-comprension");
  if (btnComprension) btnComprension.addEventListener("click", nuevaComprension);

  const btnRepetir = document.getElementById("btn-repetir-dictado");
  if (btnRepetir)
    btnRepetir.addEventListener("click", () => {
      if (dictadoActual) hablarIngles(dictadoActual.frase);
    });

  const btnLento = document.getElementById("btn-lento-dictado");
  if (btnLento)
    btnLento.addEventListener("click", () => {
      if (dictadoActual) hablarIngles(dictadoActual.frase, 0.6);
    });

  const btnRepetirAudio = document.getElementById("btn-repetir-comprension");
  if (btnRepetirAudio)
    btnRepetirAudio.addEventListener("click", () => {
      if (comprensionActual) hablarIngles(comprensionActual.texto);
    });

  const btnComprobar = document.getElementById("btn-comprobar-dictado");
  if (btnComprobar) btnComprobar.addEventListener("click", comprobarDictado);

  const btnOtro = document.getElementById("btn-otro-dictado");
  if (btnOtro) btnOtro.addEventListener("click", nuevoDictado);

  const btnEnviarComp = document.getElementById("btn-enviar-comprension");
  if (btnEnviarComp)
    btnEnviarComp.addEventListener("click", enviarRespuestasAudio);

  const btnOtroAudio = document.getElementById("btn-otro-comprension");
  if (btnOtroAudio) btnOtroAudio.addEventListener("click", nuevaComprension);

  const btnMenu = document.getElementById("btn-menu-audio");
  if (btnMenu) btnMenu.addEventListener("click", mostrarMenuAudio);

  const btnMenu2 = document.getElementById("btn-menu-audio-2");
  if (btnMenu2) btnMenu2.addEventListener("click", mostrarMenuAudio);

  const btnSalir = document.getElementById("btn-salir-audio");
  if (btnSalir) {
    btnSalir.addEventListener("click", () => {
      window.speechSynthesis?.cancel();
      document.getElementById("vista-audio").classList.add("oculto");
      document.getElementById("vista-principal").classList.remove("oculto");
      if (typeof cargarProgreso === "function") cargarProgreso();
    });
  }
});
