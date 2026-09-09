const ABECEDARIO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

let partidaAhorcado = null;
let partidaSopa = null;
let partidaEmparejar = null;
let relojSopa = null;
let seleccionSopa = null;
let seleccionEmparejar = { izquierda: null, derecha: null };

function iniciarJuegos() {
  document.getElementById("vista-principal").classList.add("oculto");
  document.getElementById("vista-juegos").classList.remove("oculto");
  mostrarMenuJuegos();
}

/** Deja a la vista solo con el menú y apaga cualquier partida en marcha. */
function mostrarMenuJuegos() {
  detenerReloj();
  partidaAhorcado = null;
  partidaSopa = null;
  partidaEmparejar = null;

  ["juego-ahorcado", "juego-sopa", "juego-emparejar"].forEach((id) => {
    document.getElementById(id).classList.add("oculto");
  });

  document.getElementById("juegos-menu").classList.remove("oculto");
  document.getElementById("juegos-estado").textContent = "";
}

function abrirPanelJuego(id) {
  document.getElementById("juegos-menu").classList.add("oculto");
  ["juego-ahorcado", "juego-sopa", "juego-emparejar"].forEach((panel) => {
    document.getElementById(panel).classList.toggle("oculto", panel !== id);
  });
}

function avisoJuegos(texto, clase = "") {
  const estado = document.getElementById("juegos-estado");
  estado.textContent = texto;
  estado.className = `tienda-estado ${clase}`;
}

/** Resume en una línea lo que dio la partida en XP y monedas. */
function resumenPremio(datos) {
  const partes = [`+${datos.xpGanado} XP`];
  if (datos.monedasGanadas) {
    partes.push(`+${datos.monedasGanadas} ${datos.monedasGanadas === 1 ? "coin" : "coins"}`);
  }
  if (datos.metaCompletada) partes.push("daily goal complete");
  return partes.join(" · ");
}

// Ahorcado

async function empezarAhorcado() {
  abrirPanelJuego("juego-ahorcado");
  avisoJuegos("Picking a word...");

  document.getElementById("ahorcado-resultado").classList.add("oculto");
  document.getElementById("ahorcado-palabra").innerHTML = "";
  document.getElementById("ahorcado-teclado").innerHTML = "";

  try {
    const datos = await JuegosAPI.nuevoAhorcado();
    partidaAhorcado = { id: datos.partidaId, terminada: false };

    document.getElementById("ahorcado-pista").textContent = `Clue: ${datos.pista}`;
    document.getElementById("ahorcado-pistas").textContent = datos.pistasDisponibles;
    document.getElementById("btn-pista-ahorcado").disabled = datos.pistasDisponibles < 1;

    pintarTeclado();
    pintarAhorcado(datos);
    avisoJuegos("");
  } catch (err) {
    avisoJuegos("Could not start the game. Try again in a moment.", "tienda-estado-error");
  }
}

function pintarTeclado() {
  const teclado = document.getElementById("ahorcado-teclado");
  teclado.innerHTML = "";

  ABECEDARIO.forEach((letra) => {
    const tecla = document.createElement("button");
    tecla.className = "tecla";
    tecla.textContent = letra;
    tecla.dataset.letra = letra;
    tecla.addEventListener("click", () => jugarLetra(letra));
    teclado.appendChild(tecla);
  });
}

function pintarAhorcado(datos) {
  const palabra = document.getElementById("ahorcado-palabra");
  palabra.innerHTML = "";

  datos.mascara.forEach((letra) => {
    const hueco = document.createElement("span");
    hueco.className = letra ? "hueco hueco-lleno" : "hueco";
    hueco.textContent = letra || "";
    palabra.appendChild(hueco);
  });

  document.getElementById("ahorcado-intentos").textContent =
    `${datos.restantes} of ${datos.maxErrores} tries left`;

  // Cada error dibuja una parte más del muñeco
  document.querySelectorAll("#ahorcado-dibujo .ahorcado-parte").forEach((parte) => {
    parte.classList.toggle("visible", Number(parte.dataset.parte) <= datos.errores);
  });

  document.querySelectorAll("#ahorcado-teclado .tecla").forEach((tecla) => {
    const usada = datos.letras.includes(tecla.dataset.letra);
    tecla.disabled = usada || datos.estado !== "jugando";
    tecla.classList.toggle("tecla-usada", usada);
  });
}

async function jugarLetra(letra) {
  if (!partidaAhorcado || partidaAhorcado.terminada) return;

  try {
    const datos = await JuegosAPI.letraAhorcado(partidaAhorcado.id, letra);
    pintarAhorcado(datos);
    if (datos.estado !== "jugando") cerrarAhorcado(datos);
  } catch (err) {
    avisoJuegos(err.message, "tienda-estado-error");
  }
}

async function usarPistaAhorcado() {
  if (!partidaAhorcado || partidaAhorcado.terminada) return;

  const boton = document.getElementById("btn-pista-ahorcado");
  boton.disabled = true;

  try {
    const datos = await JuegosAPI.pistaAhorcado(partidaAhorcado.id);
    document.getElementById("ahorcado-pistas").textContent = datos.pistasDisponibles;
    pintarAhorcado(datos);

    if (datos.estado !== "jugando") {
      cerrarAhorcado(datos);
    } else {
      boton.disabled = datos.pistasDisponibles < 1;
    }
  } catch (err) {
    avisoJuegos(
      err.codigo === "sin_pistas"
        ? "You have no hints left. Buy some in the shop."
        : err.message,
      "tienda-estado-error",
    );
  }
}

function cerrarAhorcado(datos) {
  partidaAhorcado.terminada = true;

  const resultado = document.getElementById("ahorcado-resultado");
  const gano = datos.estado === "ganada";

  resultado.className = `nivel-feedback ${gano ? "feedback-correcto" : "feedback-incorrecto"}`;
  resultado.textContent = gano
    ? `You got it! "${datos.palabra.toLowerCase()}" — ${resumenPremio(datos)}`
    : `The word was "${datos.palabra.toLowerCase()}" (${datos.traduccion}) — ${resumenPremio(datos)}`;
  resultado.classList.remove("oculto");

  document.getElementById("btn-pista-ahorcado").disabled = true;
}

// Sopa de letras

async function empezarSopa() {
  abrirPanelJuego("juego-sopa");
  detenerReloj();
  avisoJuegos("Building the grid...");

  document.getElementById("sopa-resultado").classList.add("oculto");
  document.getElementById("sopa-grilla").innerHTML = "";
  document.getElementById("sopa-palabras").innerHTML = "";

  try {
    const datos = await JuegosAPI.nuevaSopa();
    partidaSopa = {
      id: datos.partidaId,
      total: datos.palabras.length,
      encontradas: 0,
      terminada: false,
    };

    pintarGrilla(datos.letras);
    pintarPalabrasSopa(datos.palabras);
    arrancarReloj(datos.segundos);
    avisoJuegos("");
  } catch (err) {
    avisoJuegos("Could not build the grid. Try again in a moment.", "tienda-estado-error");
  }
}

function pintarGrilla(letras) {
  const grilla = document.getElementById("sopa-grilla");
  grilla.innerHTML = "";
  grilla.style.setProperty("--sopa-columnas", letras.length);

  letras.forEach((fila, indiceFila) => {
    fila.forEach((letra, indiceColumna) => {
      const celda = document.createElement("div");
      celda.className = "sopa-celda";
      celda.textContent = letra;
      celda.dataset.fila = indiceFila;
      celda.dataset.columna = indiceColumna;
      grilla.appendChild(celda);
    });
  });
}

function pintarPalabrasSopa(palabras) {
  const lista = document.getElementById("sopa-palabras");
  lista.innerHTML = "";

  palabras.forEach((p) => {
    const item = document.createElement("div");
    item.className = "sopa-palabra";
    item.dataset.palabra = p.palabra;

    const texto = document.createElement("strong");
    texto.textContent = p.palabra.toLowerCase();

    const traduccion = document.createElement("span");
    traduccion.textContent = p.traduccion;

    item.appendChild(texto);
    item.appendChild(traduccion);
    lista.appendChild(item);
  });
}

/** Devuelve las casillas en línea recta entre dos puntos, o solo la primera si no hay recta. */
function casillasEntre(inicio, fin) {
  const saltoF = fin.fila - inicio.fila;
  const saltoC = fin.columna - inicio.columna;
  const largoF = Math.abs(saltoF);
  const largoC = Math.abs(saltoC);

  if (largoF !== 0 && largoC !== 0 && largoF !== largoC) return [inicio];

  const pasos = Math.max(largoF, largoC);
  const df = Math.sign(saltoF);
  const dc = Math.sign(saltoC);

  return Array.from({ length: pasos + 1 }, (_, i) => ({
    fila: inicio.fila + df * i,
    columna: inicio.columna + dc * i,
  }));
}

function celdaEn(fila, columna) {
  return document.querySelector(
    `#sopa-grilla .sopa-celda[data-fila="${fila}"][data-columna="${columna}"]`,
  );
}

function pintarSeleccion() {
  document.querySelectorAll("#sopa-grilla .celda-activa").forEach((celda) => {
    celda.classList.remove("celda-activa");
  });

  if (!seleccionSopa) return;

  casillasEntre(seleccionSopa.inicio, seleccionSopa.fin).forEach((c) => {
    const celda = celdaEn(c.fila, c.columna);
    if (celda) celda.classList.add("celda-activa");
  });
}

function celdaDesdeEvento(e) {
  const elemento = document.elementFromPoint(e.clientX, e.clientY);
  return elemento && elemento.classList.contains("sopa-celda") ? elemento : null;
}

function empezarSeleccion(e) {
  if (!partidaSopa || partidaSopa.terminada) return;

  const celda = e.target.closest(".sopa-celda");
  if (!celda) return;

  const punto = {
    fila: Number(celda.dataset.fila),
    columna: Number(celda.dataset.columna),
  };

  seleccionSopa = { inicio: punto, fin: punto };
  document.getElementById("sopa-grilla").setPointerCapture?.(e.pointerId);
  pintarSeleccion();
}

function moverSeleccion(e) {
  if (!seleccionSopa) return;

  const celda = celdaDesdeEvento(e);
  if (!celda) return;

  seleccionSopa.fin = {
    fila: Number(celda.dataset.fila),
    columna: Number(celda.dataset.columna),
  };
  pintarSeleccion();
}

async function soltarSeleccion() {
  if (!seleccionSopa) return;

  const { inicio, fin } = seleccionSopa;
  seleccionSopa = null;
  pintarSeleccion();

  const mismaCasilla = inicio.fila === fin.fila && inicio.columna === fin.columna;
  if (mismaCasilla || !partidaSopa || partidaSopa.terminada) return;

  try {
    const datos = await JuegosAPI.hallazgoSopa(
      partidaSopa.id,
      inicio.fila,
      inicio.columna,
      fin.fila,
      fin.columna,
    );

    if (!datos.correcto) return;

    marcarPalabraSopa(datos.palabra, datos.casillas, "celda-hallada");
    partidaSopa.encontradas = datos.encontradas;

    if (datos.encontradas === datos.total) cerrarSopa();
  } catch (err) {
    avisoJuegos(err.message, "tienda-estado-error");
  }
}

function marcarPalabraSopa(palabra, casillas, clase) {
  casillas.forEach((c) => {
    const celda = celdaEn(c.fila, c.columna);
    if (celda) celda.classList.add(clase);
  });

  const item = document.querySelector(
    `#sopa-palabras .sopa-palabra[data-palabra="${palabra}"]`,
  );
  if (item) item.classList.add(clase === "celda-hallada" ? "palabra-hallada" : "palabra-perdida");
}

function arrancarReloj(segundos) {
  let restante = segundos;
  pintarReloj(restante);

  relojSopa = setInterval(() => {
    restante -= 1;
    pintarReloj(restante);
    if (restante <= 0) cerrarSopa();
  }, 1000);
}

function pintarReloj(segundos) {
  const seguro = Math.max(segundos, 0);
  const minutos = Math.floor(seguro / 60);
  const resto = String(seguro % 60).padStart(2, "0");

  const reloj = document.getElementById("sopa-reloj");
  reloj.textContent = `${minutos}:${resto}`;
  reloj.classList.toggle("reloj-corto", seguro <= 15);
}

function detenerReloj() {
  if (relojSopa) clearInterval(relojSopa);
  relojSopa = null;
  seleccionSopa = null;
}

async function cerrarSopa() {
  if (!partidaSopa || partidaSopa.terminada) return;

  partidaSopa.terminada = true;
  detenerReloj();

  try {
    const datos = await JuegosAPI.terminarSopa(partidaSopa.id);

    // Las que no aparecieron se muestran para que el estudiante las vea
    datos.faltantes.forEach((f) => {
      marcarPalabraSopa(f.palabra, f.casillas, "celda-perdida");
    });

    const resultado = document.getElementById("sopa-resultado");
    resultado.className = `nivel-feedback ${datos.perfecto ? "feedback-correcto" : "feedback-incorrecto"}`;
    resultado.textContent = datos.perfecto
      ? `All ${datos.total} words found! ${resumenPremio(datos)}`
      : `${datos.encontradas} of ${datos.total} words found — ${resumenPremio(datos)}`;
    resultado.classList.remove("oculto");
  } catch (err) {
    avisoJuegos(err.message, "tienda-estado-error");
  }
}

// Emparejamiento

async function empezarEmparejar() {
  abrirPanelJuego("juego-emparejar");
  avisoJuegos("Shuffling the cards...");

  document.getElementById("emparejar-resultado").classList.add("oculto");
  document.getElementById("emparejar-izquierda").innerHTML = "";
  document.getElementById("emparejar-derecha").innerHTML = "";
  seleccionEmparejar = { izquierda: null, derecha: null };

  try {
    const datos = await JuegosAPI.nuevoEmparejar();
    partidaEmparejar = {
      id: datos.partidaId,
      total: datos.izquierda.length,
      terminada: false,
    };

    pintarColumna("emparejar-izquierda", datos.izquierda, "izquierda");
    pintarColumna("emparejar-derecha", datos.derecha, "derecha");
    pintarMarcadorEmparejar(0, datos.izquierda.length);
    avisoJuegos("");
  } catch (err) {
    avisoJuegos("Could not start the game. Try again in a moment.", "tienda-estado-error");
  }
}

function pintarColumna(contenedorId, items, lado) {
  const contenedor = document.getElementById(contenedorId);
  contenedor.innerHTML = "";

  items.forEach((item) => {
    const carta = document.createElement("button");
    carta.className = `carta-par carta-${lado}`;
    carta.textContent = item.texto;
    carta.dataset.id = item.id;
    carta.addEventListener("click", () => elegirCarta(lado, item.id, carta));
    contenedor.appendChild(carta);
  });
}

function pintarMarcadorEmparejar(aciertos, total) {
  document.getElementById("emparejar-marcador").textContent = `${aciertos} / ${total}`;
}

function elegirCarta(lado, id, carta) {
  if (!partidaEmparejar || partidaEmparejar.terminada) return;
  if (carta.classList.contains("carta-hecha")) return;

  const previa = document.querySelector(`.carta-${lado}.carta-elegida`);
  if (previa) previa.classList.remove("carta-elegida");

  carta.classList.add("carta-elegida");
  seleccionEmparejar[lado] = id;

  if (seleccionEmparejar.izquierda && seleccionEmparejar.derecha) {
    comprobarPar();
  }
}

async function comprobarPar() {
  const { izquierda, derecha } = seleccionEmparejar;
  seleccionEmparejar = { izquierda: null, derecha: null };

  const cartaIzq = document.querySelector(`.carta-izquierda[data-id="${izquierda}"]`);
  const cartaDer = document.querySelector(`.carta-derecha[data-id="${derecha}"]`);

  try {
    const datos = await JuegosAPI.parEmparejar(partidaEmparejar.id, izquierda, derecha);

    [cartaIzq, cartaDer].forEach((c) => c && c.classList.remove("carta-elegida"));

    if (datos.correcto) {
      [cartaIzq, cartaDer].forEach((c) => {
        if (!c) return;
        c.classList.add("carta-hecha");
        c.disabled = true;
      });
      pintarMarcadorEmparejar(datos.aciertos, datos.total);
    } else {
      // El rojo se quita solo para poder volver a intentarlo enseguida
      [cartaIzq, cartaDer].forEach((c) => c && c.classList.add("carta-fallada"));
      setTimeout(() => {
        [cartaIzq, cartaDer].forEach((c) => c && c.classList.remove("carta-fallada"));
      }, 600);
    }

    if (datos.completado) cerrarEmparejar(datos);
  } catch (err) {
    [cartaIzq, cartaDer].forEach((c) => c && c.classList.remove("carta-elegida"));
    avisoJuegos(err.message, "tienda-estado-error");
  }
}

function cerrarEmparejar(datos) {
  partidaEmparejar.terminada = true;

  const resultado = document.getElementById("emparejar-resultado");
  const sinFallos = datos.errores === 0;

  // Completar la ronda siempre es una victoria, con fallos o sin ellos
  resultado.className = "nivel-feedback feedback-correcto";
  resultado.textContent = sinFallos
    ? `Flawless! All ${datos.total} pairs, no mistakes — ${resumenPremio(datos)}`
    : `All ${datos.total} pairs matched with ${datos.errores} ${datos.errores === 1 ? "mistake" : "mistakes"} — ${resumenPremio(datos)}`;
  resultado.classList.remove("oculto");
}

document.addEventListener("DOMContentLoaded", () => {
  const btnJuegos = document.getElementById("btn-juegos");
  if (btnJuegos) btnJuegos.addEventListener("click", iniciarJuegos);

  const aperturas = {
    "btn-juego-ahorcado": empezarAhorcado,
    "btn-otro-ahorcado": empezarAhorcado,
    "btn-juego-sopa": empezarSopa,
    "btn-otra-sopa": empezarSopa,
    "btn-juego-emparejar": empezarEmparejar,
    "btn-otro-emparejar": empezarEmparejar,
  };

  Object.entries(aperturas).forEach(([id, accion]) => {
    const boton = document.getElementById(id);
    if (boton) boton.addEventListener("click", accion);
  });

  ["btn-menu-juegos", "btn-menu-juegos-2", "btn-menu-juegos-3"].forEach((id) => {
    const boton = document.getElementById(id);
    if (boton) boton.addEventListener("click", mostrarMenuJuegos);
  });

  const btnPista = document.getElementById("btn-pista-ahorcado");
  if (btnPista) btnPista.addEventListener("click", usarPistaAhorcado);

  const grilla = document.getElementById("sopa-grilla");
  if (grilla) {
    grilla.addEventListener("pointerdown", empezarSeleccion);
    grilla.addEventListener("pointermove", moverSeleccion);
    grilla.addEventListener("pointerup", soltarSeleccion);
    grilla.addEventListener("pointercancel", soltarSeleccion);
  }

  // El teclado físico también sirve para jugar al ahorcado
  document.addEventListener("keydown", (e) => {
    const vista = document.getElementById("vista-juegos");
    const panel = document.getElementById("juego-ahorcado");
    if (!vista || vista.classList.contains("oculto")) return;
    if (!panel || panel.classList.contains("oculto")) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (/^[a-zA-Z]$/.test(e.key)) jugarLetra(e.key.toUpperCase());
  });

  const btnSalir = document.getElementById("btn-salir-juegos");
  if (btnSalir) {
    btnSalir.addEventListener("click", () => {
      detenerReloj();
      document.getElementById("vista-juegos").classList.add("oculto");
      document.getElementById("vista-principal").classList.remove("oculto");
      if (typeof cargarProgreso === "function") cargarProgreso();
    });
  }
});
