let modoVisual = "describir";
let temaVisual = null;
let ejercicioVisual = null;
let catalogoVisual = null;

function abrirVisual(modo) {
  modoVisual = modo === "reaccionar" ? "reaccionar" : "describir";

  document.getElementById("vista-principal").classList.add("oculto");
  document.getElementById("vista-practica").classList.add("oculto");
  document.getElementById("vista-roleplay").classList.add("oculto");
  document.getElementById("vista-visual").classList.remove("oculto");

  document.getElementById("visual-titulo").textContent =
    modoVisual === "reaccionar" ? "React to the scene" : "Describe the photo";
  document.getElementById("visual-subtitulo").textContent =
    modoVisual === "reaccionar"
      ? "Look at the situation and write what you would say."
      : "Pick a scene and write what is happening in it.";

  mostrarTemasVisual();
}

async function mostrarTemasVisual() {
  document.getElementById("visual-ejercicio").classList.add("oculto");
  document.getElementById("visual-temas").classList.remove("oculto");

  const lista = document.getElementById("visual-lista-temas");
  const estado = document.getElementById("visual-estado");

  lista.innerHTML = "";
  estado.textContent = "Loading...";
  estado.className = "tienda-estado";

  try {
    if (!catalogoVisual) catalogoVisual = await VisualAPI.temas();

    if (!catalogoVisual.disponible) {
      estado.textContent =
        "Photo exercises are not set up yet. Everything else keeps working.";
      estado.className = "tienda-estado tienda-estado-error";
      return;
    }

    estado.textContent = "";
    const temas = catalogoVisual[modoVisual] || [];

    temas.forEach((tema) => {
      const boton = document.createElement("button");
      boton.className = "tema-visual";
      boton.innerHTML = `<i class="fa-solid ${tema.icono}"></i>`;

      const nombre = document.createElement("span");
      nombre.textContent = tema.nombre;
      boton.appendChild(nombre);

      boton.addEventListener("click", () => pedirEjercicioVisual(tema.id));
      lista.appendChild(boton);
    });
  } catch (err) {
    estado.textContent = "Could not load the topics. Try again in a moment.";
    estado.className = "tienda-estado tienda-estado-error";
  }
}

async function pedirEjercicioVisual(tema) {
  temaVisual = tema;

  document.getElementById("visual-temas").classList.add("oculto");
  document.getElementById("visual-ejercicio").classList.remove("oculto");
  document.getElementById("visual-resultado").classList.add("oculto");
  document.getElementById("visual-entrada").value = "";
  document.getElementById("visual-entrada").disabled = false;
  document.getElementById("btn-comprobar-visual").disabled = false;

  const marco = document.getElementById("visual-marco");
  marco.classList.add("cargando");
  document.getElementById("visual-imagen").removeAttribute("src");
  document.getElementById("visual-credito").innerHTML = "";

  try {
    const datos = await VisualAPI.ejercicio(modoVisual, tema);
    ejercicioVisual = datos.ejercicioId;

    const imagen = document.getElementById("visual-imagen");
    // El marco deja de latir tanto si la foto carga como si no llega
    imagen.onload = () => marco.classList.remove("cargando");
    imagen.onerror = () => {
      marco.classList.remove("cargando");
      avisoVisual("The photo could not be loaded. Try another one.");
    };
    imagen.src = datos.imagen;
    imagen.alt = datos.titulo;

    document.getElementById("visual-instruccion").textContent = datos.instruccion;
    pintarCredito(datos.autor, datos.autorUrl);
  } catch (err) {
    marco.classList.remove("cargando");
    avisoVisual(
      err.codigo === "sin_medios"
        ? "Photo exercises are not set up yet."
        : "Could not load the photo. Try again in a moment.",
    );
  }
}

/** La licencia de Pexels obliga a nombrar al fotógrafo y enlazar al sitio. */
function pintarCredito(autor, autorUrl) {
  const credito = document.getElementById("visual-credito");
  credito.innerHTML = "";
  if (!autor) return;

  const nombre = document.createElement("a");
  nombre.href = autorUrl || "https://www.pexels.com";
  nombre.target = "_blank";
  nombre.rel = "noopener";
  nombre.textContent = autor;

  const sitio = document.createElement("a");
  sitio.href = "https://www.pexels.com";
  sitio.target = "_blank";
  sitio.rel = "noopener";
  sitio.textContent = "Pexels";

  credito.append("Photo by ", nombre, " on ", sitio);
}

function avisoVisual(texto) {
  const estado = document.getElementById("visual-estado");
  estado.textContent = texto;
  estado.className = texto ? "tienda-estado tienda-estado-error" : "tienda-estado";
}

async function comprobarVisual() {
  const entrada = document.getElementById("visual-entrada");
  const texto = entrada.value.trim();

  if (!texto || !ejercicioVisual) return;

  const boton = document.getElementById("btn-comprobar-visual");
  boton.disabled = true;
  entrada.disabled = true;
  avisoVisual("");

  const resultado = document.getElementById("visual-resultado");
  resultado.className = "nivel-feedback";
  resultado.textContent = "Looking at your answer...";
  resultado.classList.remove("oculto");

  try {
    const datos = await VisualAPI.responder(ejercicioVisual, texto);
    pintarResultadoVisual(datos);
  } catch (err) {
    resultado.classList.add("oculto");
    entrada.disabled = false;
    boton.disabled = false;
    avisoVisual("Could not check your answer. Try again in a moment.");
  }
}

function pintarResultadoVisual(datos) {
  const resultado = document.getElementById("visual-resultado");
  resultado.innerHTML = "";
  resultado.className = `nivel-feedback ${datos.perfecto ? "feedback-correcto" : "feedback-incorrecto"}`;

  const marcador = document.createElement("p");
  marcador.className = "visual-marcador";
  marcador.textContent = `${datos.precision}% · +${datos.xpGanado} XP`;
  resultado.appendChild(marcador);

  if (datos.resumen) {
    const resumen = document.createElement("p");
    resumen.textContent = datos.resumen;
    resultado.appendChild(resumen);
  }

  agregarListaVisual(resultado, "You got this right", datos.acertado, "lista-bien");
  agregarListaVisual(resultado, "You missed this", datos.falto, "lista-mal");

  (datos.correcciones || []).forEach((c) => {
    const fila = document.createElement("p");
    fila.className = "visual-correccion";

    const mal = document.createElement("s");
    mal.textContent = c.escribio;

    const bien = document.createElement("strong");
    bien.textContent = c.mejor;

    fila.append(mal, " → ", bien);
    if (c.porque) fila.append(` — ${c.porque}`);
    resultado.appendChild(fila);
  });

  if (datos.mejorRespuesta) {
    const mejor = document.createElement("p");
    mejor.className = "visual-mejor";
    mejor.textContent = `A native would say: "${datos.mejorRespuesta}"`;
    resultado.appendChild(mejor);
  }

  agregarListaVisual(resultado, "Useful phrases", datos.frasesUtiles, "lista-frases");
}

function agregarListaVisual(contenedor, titulo, items, clase) {
  if (!Array.isArray(items) || items.length === 0) return;

  const encabezado = document.createElement("p");
  encabezado.className = "visual-subtitulo-lista";
  encabezado.textContent = titulo;
  contenedor.appendChild(encabezado);

  const lista = document.createElement("ul");
  lista.className = `visual-lista ${clase}`;
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    lista.appendChild(li);
  });
  contenedor.appendChild(lista);
}

document.addEventListener("DOMContentLoaded", () => {
  const btnDescribir = document.getElementById("btn-visual-describir");
  if (btnDescribir)
    btnDescribir.addEventListener("click", () => abrirVisual("describir"));

  const btnReaccionar = document.getElementById("btn-visual-reaccionar");
  if (btnReaccionar)
    btnReaccionar.addEventListener("click", () => abrirVisual("reaccionar"));

  const btnComprobar = document.getElementById("btn-comprobar-visual");
  if (btnComprobar) btnComprobar.addEventListener("click", comprobarVisual);

  const btnOtra = document.getElementById("btn-otra-visual");
  if (btnOtra)
    btnOtra.addEventListener("click", () => pedirEjercicioVisual(temaVisual));

  const btnCambiarTema = document.getElementById("btn-cambiar-tema-visual");
  if (btnCambiarTema) btnCambiarTema.addEventListener("click", mostrarTemasVisual);

  const btnSalir = document.getElementById("btn-salir-visual");
  if (btnSalir) {
    btnSalir.addEventListener("click", () => {
      document.getElementById("vista-visual").classList.add("oculto");
      document.getElementById("vista-principal").classList.remove("oculto");
      if (typeof cargarProgreso === "function") cargarProgreso();
    });
  }
});
