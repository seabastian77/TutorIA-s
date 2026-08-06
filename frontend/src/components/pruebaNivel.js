const NIVELES = ["A1", "A2", "B1", "B2", "C1", "C2"];
const TOTAL_TURNOS = 8;

let indiceNivelActual = 2; // arranca en B1
let turnoActual = 0;
let historialNarrativo = [];
let historialResultados = []; // [{ habilidad, puntuacion }]
let escenaVigente = null;

function iniciarPruebaNivel() {
  indiceNivelActual = 2;
  turnoActual = 0;
  historialNarrativo = [];
  historialResultados = [];

  document.getElementById("vista-principal").classList.add("oculto");
  document.getElementById("vista-nivel").classList.remove("oculto");

  cargarSiguienteEscena();
}

async function cargarSiguienteEscena() {
  const narrativaEl = document.getElementById("nivel-narrativa");
  const textoPregunta = document.getElementById("nivel-pregunta-texto");
  const progreso = document.getElementById("nivel-progreso");
  const contenedorOpciones = document.getElementById("nivel-opciones");
  const contenedorAbierta = document.getElementById("nivel-respuesta-abierta");
  const feedbackEl = document.getElementById("nivel-feedback");
  const btnSiguiente = document.getElementById("btn-siguiente-turno");
  const textareaRespuesta = document.getElementById("nivel-texto-usuario");

  progreso.textContent = `Escena ${turnoActual + 1} de ${TOTAL_TURNOS}`;
  narrativaEl.textContent = "...";
  textoPregunta.textContent = "Cargando siguiente parte de la historia...";
  contenedorOpciones.innerHTML = "";
  contenedorAbierta.classList.add("oculto");
  feedbackEl.classList.add("oculto");
  feedbackEl.textContent = "";
  btnSiguiente.classList.add("oculto");
  if (textareaRespuesta) textareaRespuesta.value = "";

  try {
    const escena = await NivelAPI.obtenerEscena({
      nivel: NIVELES[indiceNivelActual],
      turno: turnoActual,
      historialNarrativo,
    });

    escenaVigente = escena;
    historialNarrativo.push(escena.narrativa);

    narrativaEl.textContent = escena.narrativa;
    textoPregunta.textContent = escena.pregunta;

    if (escena.tipo === "opcion_multiple") {
      escena.opciones.forEach((opcion, idx) => {
        const btn = document.createElement("button");
        btn.textContent = opcion;
        btn.addEventListener("click", () => responderOpcionMultiple(idx, btn));
        contenedorOpciones.appendChild(btn);
      });
    } else {
      contenedorAbierta.classList.remove("oculto");
      const btnEnviar = document.getElementById("btn-enviar-respuesta");
      btnEnviar.onclick = responderAbierta;
    }
  } catch (err) {
    textoPregunta.textContent =
      "Hubo un error generando la historia. Intenta de nuevo.";
  }
}

function ajustarNivelPorPuntuacion(puntuacion) {
  if (puntuacion >= 70) {
    indiceNivelActual = Math.min(indiceNivelActual + 1, NIVELES.length - 1);
  } else if (puntuacion < 40) {
    indiceNivelActual = Math.max(indiceNivelActual - 1, 0);
  }
  // entre 40 y 69 se queda igual (respuesta "aceptable" para su nivel actual)
}

function responderOpcionMultiple(indiceElegido, btnElegido) {
  const botones = document.querySelectorAll("#nivel-opciones button");
  botones.forEach((b) => (b.disabled = true));

  const esCorrecta = indiceElegido === escenaVigente.respuestaCorrecta;
  const puntuacion = esCorrecta ? 100 : 0;

  btnElegido.classList.add(esCorrecta ? "correcta" : "incorrecta");
  if (!esCorrecta && botones[escenaVigente.respuestaCorrecta]) {
    botones[escenaVigente.respuestaCorrecta].classList.add("correcta");
  }

  mostrarFeedback(
    esCorrecta
      ? "¡Correcto! Vas muy bien."
      : "Casi, no era esa — mira la opción marcada en verde.",
  );

  historialResultados.push({ habilidad: escenaVigente.habilidad, puntuacion });
  ajustarNivelPorPuntuacion(puntuacion);
}

async function responderAbierta() {
  const textarea = document.getElementById("nivel-texto-usuario");
  const btnEnviar = document.getElementById("btn-enviar-respuesta");
  const texto = textarea.value.trim();

  if (!texto) return;

  btnEnviar.disabled = true;
  btnEnviar.textContent = "Evaluando...";

  try {
    const evaluacion = await NivelAPI.evaluarRespuestaAbierta({
      pregunta: escenaVigente.pregunta,
      respuestaUsuario: texto,
      nivel: NIVELES[indiceNivelActual],
    });

    let mensaje = evaluacion.feedback;
    if (evaluacion.correccionSugerida) {
      mensaje += ` (Versión corregida: "${evaluacion.correccionSugerida}")`;
    }
    mostrarFeedback(mensaje);

    historialResultados.push({
      habilidad: escenaVigente.habilidad,
      puntuacion: evaluacion.puntuacion,
    });
    ajustarNivelPorPuntuacion(evaluacion.puntuacion);
  } catch (err) {
    mostrarFeedback("No pudimos evaluar tu respuesta, pero seguimos.");
    historialResultados.push({
      habilidad: escenaVigente.habilidad,
      puntuacion: 50,
    });
  } finally {
    btnEnviar.disabled = false;
    btnEnviar.textContent = "Enviar respuesta";
  }
}

function mostrarFeedback(mensaje) {
  const feedbackEl = document.getElementById("nivel-feedback");
  const btnSiguiente = document.getElementById("btn-siguiente-turno");

  feedbackEl.textContent = mensaje;
  feedbackEl.classList.remove("oculto");
  btnSiguiente.classList.remove("oculto");
  btnSiguiente.onclick = avanzarTurno;
}

function avanzarTurno() {
  turnoActual++;
  if (turnoActual >= TOTAL_TURNOS) {
    finalizarDiagnostico();
  } else {
    cargarSiguienteEscena();
  }
}

async function finalizarDiagnostico() {
  document.getElementById("vista-nivel").classList.add("oculto");
  document.getElementById("vista-resultado-nivel").classList.remove("oculto");
  document.getElementById("resultado-nivel-valor").textContent = "...";
  document.getElementById("resultado-resumen").textContent =
    "Generando tu diagnóstico...";
  document.getElementById("resultado-habilidades").innerHTML = "";

  try {
    const resultado =
      await NivelAPI.guardarDiagnosticoFinal(historialResultados);

    document.getElementById("resultado-nivel-valor").textContent =
      resultado.nivel;
    document.getElementById("resultado-resumen").textContent =
      resultado.resumen;

    const nombresHabilidad = {
      vocabulario: "Vocabulario",
      gramatica: "Gramática",
      comprension: "Comprensión",
      fluidez: "Fluidez escrita",
    };

    const contenedor = document.getElementById("resultado-habilidades");
    Object.keys(nombresHabilidad).forEach((clave) => {
      const valor = resultado.promedios[clave] ?? 0;
      const fila = document.createElement("div");
      fila.className = "barra-habilidad";
      fila.innerHTML = `
        <div class="barra-habilidad-header">
          <span>${nombresHabilidad[clave]}</span>
          <span>${valor}%</span>
        </div>
        <div class="barra-habilidad-fondo">
          <div class="barra-habilidad-relleno" style="width:${valor}%"></div>
        </div>
      `;
      contenedor.appendChild(fila);
    });
  } catch (err) {
    document.getElementById("resultado-nivel-valor").textContent =
      NIVELES[indiceNivelActual];
    document.getElementById("resultado-resumen").textContent =
      "No pudimos generar el resumen completo, pero tu nivel quedó guardado.";
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
