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
      icono.innerHTML = `<i class="fa-solid ${tema.icono}"></i>`;

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

/**
 * Pinta el texto separando cada palabra en su propio elemento para que
 * se pueda tocar y pedir la traducción. Se usa textContent siempre:
 * el texto viene de la IA y nunca debe interpretarse como HTML.
 */
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

async function pedirTraduccion(palabra, contexto, elemento) {
  const popover = document.getElementById("popover-palabra");

  document.getElementById("popover-palabra-texto").textContent = palabra;
  document.getElementById("popover-traduccion").textContent = "Looking it up...";
  document.getElementById("popover-tipo").textContent = "";
  document.getElementById("popover-ejemplo").textContent = "";
  popover.classList.remove("oculto");

  colocarPopover(elemento);

  try {
    const datos = await BibliotecaAPI.traducir(palabra, contexto);
    document.getElementById("popover-palabra-texto").textContent =
      datos.palabra || palabra;
    document.getElementById("popover-traduccion").textContent =
      datos.traduccion || "";
    document.getElementById("popover-tipo").textContent = datos.tipo || "";
    document.getElementById("popover-ejemplo").textContent = datos.ejemplo || "";
    colocarPopover(elemento);
  } catch (err) {
    document.getElementById("popover-traduccion").textContent =
      "Could not look up that word.";
  }
}

function colocarPopover(elemento) {
  const popover = document.getElementById("popover-palabra");
  const caja = elemento.getBoundingClientRect();
  const alto = popover.offsetHeight || 140;

  // Si no cabe arriba, se pone debajo de la palabra
  const arriba = caja.top - alto - 10;
  const y = arriba > 10 ? arriba : caja.bottom + 10;
  const x = Math.min(
    Math.max(12, caja.left + caja.width / 2 - popover.offsetWidth / 2),
    window.innerWidth - popover.offsetWidth - 12,
  );

  popover.style.top = `${y + window.scrollY}px`;
  popover.style.left = `${x}px`;
}

function cerrarPopoverPalabra() {
  const popover = document.getElementById("popover-palabra");
  if (popover) popover.classList.add("oculto");
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
  const btn = document.getElementById("btn-biblioteca");
  if (btn) btn.addEventListener("click", iniciarBiblioteca);

  const btnEnviar = document.getElementById("btn-enviar-lectura");
  if (btnEnviar) btnEnviar.addEventListener("click", enviarRespuestasLectura);

  const btnVolver = document.getElementById("btn-volver-catalogo");
  if (btnVolver)
    btnVolver.addEventListener("click", mostrarCatalogoBiblioteca);

  const btnCerrarPopover = document.getElementById("btn-cerrar-popover");
  if (btnCerrarPopover)
    btnCerrarPopover.addEventListener("click", cerrarPopoverPalabra);

  const btnSalir = document.getElementById("btn-salir-biblioteca");
  if (btnSalir) {
    btnSalir.addEventListener("click", () => {
      cerrarPopoverPalabra();
      document.getElementById("vista-biblioteca").classList.add("oculto");
      document.getElementById("vista-principal").classList.remove("oculto");
      if (typeof cargarProgreso === "function") cargarProgreso();
    });
  }

  // Tocar fuera del globo lo cierra
  document.addEventListener("click", (e) => {
    const popover = document.getElementById("popover-palabra");
    if (!popover || popover.classList.contains("oculto")) return;
    if (!popover.contains(e.target) && !e.target.classList.contains("palabra")) {
      cerrarPopoverPalabra();
    }
  });
});
