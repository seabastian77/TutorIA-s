let ejercicioActual = null;
let temaElegido = null;

// Catálogo de temas: es solo una pista que se le pasa a la IA
const TEMAS_PRACTICA = [
  {
    grupo: "Grammar",
    icono: "fa-diagram-project",
    color: "azul",
    temas: [
      "Verb to be",
      "Present simple",
      "Past simple",
      "Future forms",
      "Modal verbs",
      "Comparatives",
    ],
  },
  {
    grupo: "Vocabulary",
    icono: "fa-book",
    color: "verde",
    temas: [
      "Days and months",
      "Food and drinks",
      "Travel",
      "Work and office",
      "Home and family",
      "Clothes",
    ],
  },
  {
    grupo: "Real-life situations",
    icono: "fa-comments",
    color: "lila",
    temas: [
      "At a restaurant",
      "At the airport",
      "Shopping",
      "At the doctor",
      "Job interview",
      "Small talk",
    ],
  },
];

function iniciarPractica() {
  document.getElementById("vista-principal").classList.add("oculto");
  document.getElementById("vista-practica").classList.remove("oculto");
  mostrarSelectorTema();
}

/** Pantalla previa: qué quiere estudiar hoy. */
function mostrarSelectorTema() {
  document.getElementById("practica-temas").classList.remove("oculto");
  document.getElementById("practica-contenedor").classList.add("oculto");
  document.getElementById("btn-cambiar-tema").classList.add("oculto");

  const zona = document.getElementById("practica-grupos");
  zona.innerHTML = "";

  TEMAS_PRACTICA.forEach((grupo) => {
    const bloque = document.createElement("div");
    bloque.className = "grupo-tema";

    const cabecera = document.createElement("div");
    cabecera.className = `grupo-cabecera grupo-${grupo.color}`;
    cabecera.innerHTML = `<i class="fa-solid ${grupo.icono}"></i>`;

    const nombre = document.createElement("span");
    nombre.textContent = grupo.grupo;
    cabecera.appendChild(nombre);
    bloque.appendChild(cabecera);

    const chips = document.createElement("div");
    chips.className = "grupo-chips";

    grupo.temas.forEach((tema) => {
      const chip = document.createElement("button");
      chip.className = "chip-tema";
      chip.textContent = tema;
      chip.addEventListener("click", () => empezarConTema(tema));
      chips.appendChild(chip);
    });

    bloque.appendChild(chips);
    zona.appendChild(bloque);
  });
}

function empezarConTema(tema) {
  temaElegido = tema;
  document.getElementById("practica-temas").classList.add("oculto");
  document.getElementById("practica-contenedor").classList.remove("oculto");
  document.getElementById("btn-cambiar-tema").classList.remove("oculto");
  cargarSiguienteEjercicio();
}

async function cargarSiguienteEjercicio() {
  const cuerpo = document.getElementById("practica-cuerpo");
  const tag = document.getElementById("practica-nivel-tag");
  cuerpo.innerHTML = "<p>Loading your exercise...</p>";

  try {
    const data = await PracticaAPI.obtenerPregunta(temaElegido);
    ejercicioActual = data;
    tag.textContent = temaElegido
      ? `${data.nivel} · ${temaElegido}`
      : `Level ${data.nivel}`;

    if (data.tipo === "opcion_multiple") {
      renderizarOpcionMultiple(data.contenido);
    } else {
      renderizarEscrita(data.contenido);
    }
  } catch (err) {
    cuerpo.innerHTML = "";

    const aviso = document.createElement("p");
    aviso.textContent = "Something went wrong generating the exercise.";
    cuerpo.appendChild(aviso);

    const boton = document.createElement("button");
    boton.id = "btn-reintentar-practica";
    boton.className = "btn-principal";
    boton.style.marginTop = "16px";
    boton.textContent = "Try again";
    boton.addEventListener("click", cargarSiguienteEjercicio);
    cuerpo.appendChild(boton);
  }
}

function renderizarOpcionMultiple(contenido) {
  const cuerpo = document.getElementById("practica-cuerpo");
  cuerpo.innerHTML = "";

  const enunciado = document.createElement("h3");
  enunciado.style.marginBottom = "20px";
  enunciado.textContent = contenido.pregunta;
  cuerpo.appendChild(enunciado);

  const contenedor = document.createElement("div");
  contenedor.className = "nivel-opciones";
  contenedor.id = "practica-opciones";

  contenido.opciones.forEach((opcion, idx) => {
    const btn = document.createElement("button");
    btn.className = "opcion-nivel";
    btn.textContent = opcion;
    btn.addEventListener("click", () => enviarRespuesta(idx));
    contenedor.appendChild(btn);
  });

  cuerpo.appendChild(contenedor);
}

function renderizarEscrita(contenido) {
  const cuerpo = document.getElementById("practica-cuerpo");
  cuerpo.innerHTML = "";

  const enunciado = document.createElement("h3");
  enunciado.style.marginBottom = "20px";
  enunciado.textContent = contenido.frase;
  cuerpo.appendChild(enunciado);

  const entrada = document.createElement("input");
  entrada.type = "text";
  entrada.id = "practica-respuesta-input";
  entrada.placeholder = "Type your answer";
  entrada.style.marginBottom = "14px";
  cuerpo.appendChild(entrada);

  const boton = document.createElement("button");
  boton.id = "btn-enviar-escrita";
  boton.className = "btn-principal";
  boton.textContent = "Send answer";

  const enviar = () => {
    const valor = entrada.value.trim();
    if (valor) enviarRespuesta(valor);
  };

  boton.addEventListener("click", enviar);
  entrada.addEventListener("keydown", (e) => {
    if (e.key === "Enter") enviar();
  });

  cuerpo.appendChild(boton);
  entrada.focus();
}

async function enviarRespuesta(respuestaUsuario) {
  const cuerpo = document.getElementById("practica-cuerpo");
  cuerpo.innerHTML = "<p>Checking...</p>";

  try {
    const resultado = await PracticaAPI.enviarRespuesta({
      tipo: ejercicioActual.tipo,
      nivel: ejercicioActual.nivel,
      contenido: ejercicioActual.contenido,
      respuestaUsuario,
    });

    cuerpo.innerHTML = "";

    const titulo = document.createElement("h3");
    titulo.textContent = resultado.correcto ? "Correct!" : "Not quite";
    titulo.style.color = resultado.correcto
      ? "var(--verde)"
      : "var(--rojo)";
    cuerpo.appendChild(titulo);

    if (resultado.perfecto && resultado.bonusPerfecto) {
      const racha = document.createElement("p");
      racha.className = "bonus-perfecto";
      racha.textContent = `5 in a row — +${resultado.bonusPerfecto} bonus XP`;
      cuerpo.appendChild(racha);
    }

    if (resultado.explicacion) {
      const explicacion = document.createElement("p");
      explicacion.className = "practica-explicacion";
      explicacion.textContent = resultado.explicacion;
      cuerpo.appendChild(explicacion);
    }

    const xp = document.createElement("p");
    xp.className = "practica-xp";
    xp.textContent = `+${resultado.xpGanado || 0} XP`;
    cuerpo.appendChild(xp);

    const chip = document.getElementById("progreso-monedas");
    if (chip && typeof resultado.monedas === "number") {
      chip.textContent = resultado.monedas;
    }

    const siguiente = document.createElement("button");
    siguiente.id = "btn-siguiente-ejercicio";
    siguiente.className = "btn-principal";
    siguiente.style.marginTop = "20px";
    siguiente.textContent = "Next exercise";
    siguiente.addEventListener("click", cargarSiguienteEjercicio);
    cuerpo.appendChild(siguiente);
  } catch (err) {
    cuerpo.innerHTML = "<p>Something went wrong checking your answer.</p>";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btnPracticar = document.getElementById("btn-practicar");
  if (btnPracticar) btnPracticar.addEventListener("click", iniciarPractica);

  const btnCambiarTema = document.getElementById("btn-cambiar-tema");
  if (btnCambiarTema)
    btnCambiarTema.addEventListener("click", mostrarSelectorTema);

  const btnSalir = document.getElementById("btn-salir-practica");
  if (btnSalir) {
    btnSalir.addEventListener("click", () => {
      document.getElementById("vista-practica").classList.add("oculto");
      document.getElementById("vista-principal").classList.remove("oculto");
      if (typeof cargarProgreso === "function") cargarProgreso();
    });
  }
});
