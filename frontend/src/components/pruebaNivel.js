const NIVELES = ["A1", "A2", "B1", "B2", "C1", "C2"];
const TOTAL_PREGUNTAS = 6;

let indiceNivelActual = 2; // arranca en B1
let preguntaActual = 0;
let temasVistos = [];
let respuestaCorrectaActual = null;

function iniciarPruebaNivel() {
  indiceNivelActual = 2;
  preguntaActual = 0;
  temasVistos = [];

  document.getElementById("vista-principal").classList.add("oculto");
  document.getElementById("vista-nivel").classList.remove("oculto");

  cargarSiguientePregunta();
}

async function cargarSiguientePregunta() {
  const contenedorOpciones = document.getElementById("nivel-opciones");
  const textoPregunta = document.getElementById("nivel-pregunta-texto");
  const progreso = document.getElementById("nivel-progreso");

  progreso.textContent = `Pregunta ${preguntaActual + 1} de ${TOTAL_PREGUNTAS}`;
  textoPregunta.textContent = "Cargando pregunta...";
  contenedorOpciones.innerHTML = "";

  try {
    const data = await NivelAPI.obtenerPregunta({
      nivel: NIVELES[indiceNivelActual],
      excluir: temasVistos,
    });

    respuestaCorrectaActual = data.respuestaCorrecta;
    temasVistos.push(data.tema);

    textoPregunta.textContent = data.pregunta;
    contenedorOpciones.innerHTML = "";

    data.opciones.forEach((opcion, idx) => {
      const btn = document.createElement("button");
      btn.className = "opcion-nivel";
      btn.textContent = opcion;
      btn.addEventListener("click", () => seleccionarRespuesta(idx));
      contenedorOpciones.appendChild(btn);
    });
  } catch (err) {
    textoPregunta.textContent =
      "Hubo un error generando la pregunta. Intenta de nuevo.";
  }
}

function seleccionarRespuesta(indiceElegido) {
  const esCorrecta = indiceElegido === respuestaCorrectaActual;

  if (esCorrecta) {
    indiceNivelActual = Math.min(indiceNivelActual + 1, NIVELES.length - 1);
  } else {
    indiceNivelActual = Math.max(indiceNivelActual - 1, 0);
  }

  preguntaActual++;

  if (preguntaActual >= TOTAL_PREGUNTAS) {
    finalizarPrueba();
  } else {
    cargarSiguientePregunta();
  }
}

async function finalizarPrueba() {
  const nivelFinal = NIVELES[indiceNivelActual];

  document.getElementById("vista-nivel").classList.add("oculto");
  document.getElementById("vista-resultado-nivel").classList.remove("oculto");
  document.getElementById("resultado-nivel-valor").textContent = nivelFinal;

  try {
    await NivelAPI.guardarNivelFinal(nivelFinal);
  } catch (err) {
    console.error("No se pudo guardar el nivel:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btnIniciar = document.getElementById("btn-iniciar-nivel");
  if (btnIniciar) btnIniciar.addEventListener("click", iniciarPruebaNivel);

  const btnContinuar = document.getElementById("btn-continuar-resultado");
  if (btnContinuar) {
    btnContinuar.addEventListener("click", () => {
      document.getElementById("vista-resultado-nivel").classList.add("oculto");
      document.getElementById("vista-principal").classList.remove("oculto");
    });
  }
});
