let lecturaActual = null;
let respuestasLectura = [];

async function iniciarBiblioteca() {
  document.getElementById("vista-principal").classList.add("oculto");
  document.getElementById("vista-biblioteca").classList.remove("oculto");
  mostrarCatalogoBiblioteca();
}

async function mostrarCatalogoBiblioteca() {
  lecturaActual = null;

  document.getElementById("biblioteca-catalogo").classList.remove("oculto");
  document.getElementById("biblioteca-lectura").classList.add("oculto");
  cerrarPopoverPalabra();

  const lista = document.getElementById("biblioteca-lista");
  const estado = document.getElementById("biblioteca-estado");
  lista.innerHTML = "";
  estado.textContent = "Loading the library...";

  try {
    const datos = await BibliotecaAPI.catalogo();
    estado.textContent = "";
    document.getElementById("biblioteca-nivel").textContent =
      `Level ${datos.nivel}`;

    datos.temas.forEach((tema) => {
      const tarjeta = document.createElement("button");
      tarjeta.className = "lectura-item";
      if (tema.completada) tarjeta.classList.add("lectura-completada");

      const icono = document.createElement("span");
      icono.className = "lectura-icono";
      icono.innerHTML = Icono.svg(tema.icono);

      const texto = document.createElement("span");
      texto.className = "lectura-texto";

      const titulo = document.createElement("span");
      titulo.className = "lectura-titulo";
      titulo.textContent = tema.titulo;

      const resumen = document.createElement("span");
      resumen.className = "lectura-resumen";
      resumen.textContent = tema.completada
        ? `Read — ${tema.resultado.aciertos}/${tema.resultado.total} correct`
        : tema.resumen;

      texto.appendChild(titulo);
      texto.appendChild(resumen);
      tarjeta.appendChild(icono);
      tarjeta.appendChild(texto);

      tarjeta.addEventListener("click", () => abrirLectura(tema.slug));
      lista.appendChild(tarjeta);
    });
  } catch (err) {
    estado.textContent = "Could not load the library.";
  }
}

async function abrirLectura(slug) {
  const estado = document.getElementById("biblioteca-estado");
  estado.textContent = "Opening the story... (the first time takes a moment)";

  try {
    const datos = await BibliotecaAPI.lectura(slug);
    lecturaActual = datos;
    const zonaReporte = document.getElementById("lectura-reporte");
    if (zonaReporte) zonaReporte.innerHTML = "";
    respuestasLectura = new Array(datos.preguntas.length).fill(null);

    document.getElementById("biblioteca-catalogo").classList.add("oculto");
    document.getElementById("biblioteca-lectura").classList.remove("oculto");
    document.getElementById("lectura-titulo-texto").textContent = datos.titulo;
    document.getElementById("lectura-resultado").classList.add("oculto");
    estado.textContent = "";

    pintarTextoConPalabras(datos.texto);
    pintarPreguntasLectura(datos.preguntas);
  } catch (err) {
    estado.textContent = "Could not open that story.";
  }
}

/** Pinta el texto con cada palabra en su propio elemento, para poder tocarla. */
function pintarTextoConPalabras(texto) {
  const cuerpo = document.getElementById("lectura-cuerpo");
  cuerpo.innerHTML = "";

  texto.split(/\n\s*\n/).forEach((parrafoTexto) => {
    if (!parrafoTexto.trim()) return;

    const parrafo = document.createElement("p");
    parrafo.className = "lectura-parrafo";

    // Separa manteniendo la puntuación como texto suelto
    const piezas = parrafoTexto.split(/([A-Za-zÀ-ÿ']+)/);

    piezas.forEach((pieza) => {
      if (!pieza) return;

      if (/^[A-Za-zÀ-ÿ']+$/.test(pieza)) {
        const palabra = document.createElement("span");
        palabra.className = "palabra";
        palabra.textContent = pieza;
        palabra.addEventListener("click", (e) =>
          pedirTraduccion(pieza, parrafoTexto, e.target),
        );
        parrafo.appendChild(palabra);
      } else {
        parrafo.appendChild(document.createTextNode(pieza));
      }
    });

    cuerpo.appendChild(parrafo);
  });
}

/** Las palabras de la lectura se traducen y entran solas al vocabulario de repaso. */
function pedirTraduccion(palabra, contexto, elemento) {
  Traductor.mostrar({ palabra, contexto, anclaje: elemento, guardar: true });
}

function cerrarPopoverPalabra() {
  Traductor.cerrar();
}

function pintarPreguntasLectura(preguntas) {
  const zona = document.getElementById("lectura-preguntas");
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
        respuestasLectura[indice] = i;
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

async function enviarRespuestasLectura() {
  if (!lecturaActual) return;

  const boton = document.getElementById("btn-enviar-lectura");
  const resultado = document.getElementById("lectura-resultado");

  if (respuestasLectura.some((r) => r === null)) {
    resultado.textContent = "Answer all the questions first.";
    resultado.className = "nivel-feedback";
    resultado.classList.remove("oculto");
    return;
  }

  boton.disabled = true;
  boton.textContent = "Checking...";

  try {
    const datos = await BibliotecaAPI.responder(
      lecturaActual.id,
      respuestasLectura,
    );

    // Marca cada pregunta en verde o rojo
    const bloques = document.querySelectorAll(
      "#lectura-preguntas .pregunta-bloque",
    );
    datos.correccion.forEach((c, i) => {
      const botones = bloques[i].querySelectorAll("button");
      botones.forEach((b, j) => {
        if (j === c.correcta) b.classList.add("correcta");
        else if (j === respuestasLectura[i] && !c.acerto)
          b.classList.add("incorrecta");
        b.disabled = true;
      });
    });

    if (datos.perfecto && !datos.repetida && typeof celebrarConTuti === "function") {
      celebrarConTuti("Perfect reading!", `${datos.aciertos}/${datos.total} right. +${datos.xpGanado} XP`);
    }
    resultado.textContent = datos.perfecto
      ? `Perfect! ${datos.aciertos}/${datos.total} — +${datos.xpGanado} XP`
      : `${datos.aciertos} of ${datos.total} correct — +${datos.xpGanado} XP`;
    // Al releer un cuento se practica igual, pero el XP ya se ganó la primera vez
    if (datos.repetida) resultado.textContent += " (you already read this story)";
    resultado.className = "nivel-feedback";
    resultado.classList.remove("oculto");

    const chip = document.getElementById("progreso-monedas");
    if (chip && typeof datos.monedas === "number") chip.textContent = datos.monedas;

    // Las preguntas las hizo la IA: si alguna está mal, el estudiante lo reporta
    const lectura = lecturaActual;
    const elegidas = [...respuestasLectura];
    const zonaReporte = document.getElementById("lectura-reporte");
    if (zonaReporte && typeof ReporteEjercicio !== "undefined") {
      zonaReporte.innerHTML = "";
      ReporteEjercicio.agregarBoton(zonaReporte, {
        modulo: "lectura",
        contenido: () => ({
          lecturaId: lectura.id,
          titulo: lectura.titulo,
          preguntas: (lectura.preguntas || []).map((p, i) => ({
            pregunta: p.pregunta,
            opciones: p.opciones,
            elegida: elegidas[i],
            correcta: datos.correccion[i] ? datos.correccion[i].correcta : null,
          })),
        }),
      });
    }
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
  const btn = document.getElementById("btn-biblioteca");
  if (btn) btn.addEventListener("click", iniciarBiblioteca);

  const btnEnviar = document.getElementById("btn-enviar-lectura");
  if (btnEnviar) btnEnviar.addEventListener("click", enviarRespuestasLectura);

  const btnVolver = document.getElementById("btn-volver-catalogo");
  if (btnVolver)
    btnVolver.addEventListener("click", mostrarCatalogoBiblioteca);

  const btnSalir = document.getElementById("btn-salir-biblioteca");
  if (btnSalir) {
    btnSalir.addEventListener("click", () => {
      cerrarPopoverPalabra();
      document.getElementById("vista-biblioteca").classList.add("oculto");
      document.getElementById("vista-principal").classList.remove("oculto");
      if (typeof cargarProgreso === "function") cargarProgreso();
    });
  }
});
