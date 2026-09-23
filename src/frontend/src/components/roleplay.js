let escenarioActivo = null;
let historialRoleplay = [];

async function iniciarRoleplay() {
  document.getElementById("vista-principal").classList.add("oculto");
  document.getElementById("vista-roleplay").classList.remove("oculto");
  mostrarSelectorEscenarios();
}

async function mostrarSelectorEscenarios() {
  escenarioActivo = null;
  historialRoleplay = [];

  document.getElementById("roleplay-seleccion").classList.remove("oculto");
  document.getElementById("roleplay-chat-zona").classList.add("oculto");

  const lista = document.getElementById("roleplay-escenarios");
  const estado = document.getElementById("roleplay-estado");
  lista.innerHTML = "";
  estado.textContent = "Loading situations...";

  try {
    const datos = await RoleplayAPI.escenarios();
    estado.textContent = "";

    datos.escenarios.forEach((esc) => lista.appendChild(tarjetaEscenario(esc)));
    aplicarFiltroEscenarios();
  } catch (err) {
    estado.textContent = "Could not load the situations.";
  }
}

let filtroEscenarios = "todos";

/** Arma la tarjeta de una situación: ícono, nivel sugerido, duración y la acción. */
function tarjetaEscenario(esc) {
  const tarjeta = document.createElement("button");
  tarjeta.type = "button";
  tarjeta.className = "escenario";
  tarjeta.dataset.categoria = esc.categoria || "daily";
  tarjeta.innerHTML = `
    <span class="escenario-arriba">
      <span class="escenario-icono">${Icono.svg(esc.icono)}</span>
      <span class="escenario-nivel"></span>
    </span>
    <span class="escenario-texto">
      <span class="escenario-nombre"></span>
      <span class="escenario-desc"></span>
    </span>
    <span class="escenario-pie">
      <span class="escenario-minutos"></span>
      <span class="escenario-empezar">Start${Icono.svg("fa-arrow-right")}</span>
    </span>`;
  tarjeta.querySelector(".escenario-nivel").textContent = esc.nivel || "A1";
  tarjeta.querySelector(".escenario-nombre").textContent = esc.nombre;
  tarjeta.querySelector(".escenario-desc").textContent = esc.descripcion;
  tarjeta.querySelector(".escenario-minutos").textContent = esc.minutos ? `~${esc.minutos} min` : "";
  tarjeta.addEventListener("click", () => abrirEscenario(esc.id));
  return tarjeta;
}

/** Deja ver solo las situaciones del tema elegido; la de la foto sale solo en "All". */
function aplicarFiltroEscenarios() {
  let visibles = 0;
  document.querySelectorAll("#roleplay-escenarios .escenario").forEach((t) => {
    const ver = filtroEscenarios === "todos" || t.dataset.categoria === filtroEscenarios;
    t.classList.toggle("oculto", !ver);
    if (ver) visibles += 1;
  });
  document.getElementById("btn-visual-reaccionar").classList.toggle("oculto", filtroEscenarios !== "todos");
  document.getElementById("roleplay-vacio").classList.toggle("oculto", visibles > 0 || filtroEscenarios === "todos");
  document.querySelectorAll("#roleplay-filtros .filtro").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.filtro === filtroEscenarios)),
  );
}

async function abrirEscenario(escenarioId) {
  const estado = document.getElementById("roleplay-estado");
  estado.textContent = "Setting the scene...";

  try {
    const datos = await RoleplayAPI.iniciar(escenarioId);
    escenarioActivo = datos.escenario;
    historialRoleplay = [];

    document.getElementById("roleplay-seleccion").classList.add("oculto");
    document.getElementById("roleplay-chat-zona").classList.remove("oculto");
    document.getElementById("roleplay-titulo").textContent =
      datos.escenario.nombre;
    document.getElementById("roleplay-situacion").textContent =
      datos.escenario.descripcion;
    document.getElementById("roleplay-chat").innerHTML = "";
    estado.textContent = "";

    agregarBurbujaRoleplay("ia", datos.mensaje);
    pintarSugerencias(datos.sugerencias);
    document.getElementById("roleplay-entrada").value = "";
    document.getElementById("roleplay-entrada").focus();
  } catch (err) {
    estado.textContent = "Could not start that situation.";
  }
}

function agregarBurbujaRoleplay(tipo, texto) {
  const chat = document.getElementById("roleplay-chat");
  const burbuja = document.createElement("div");
  burbuja.className = `voz-burbuja voz-burbuja-${tipo === "usuario" ? "usuario" : "ia"}`;
  burbuja.textContent = texto;
  chat.appendChild(burbuja);
  chat.scrollTop = chat.scrollHeight;

  historialRoleplay.push({ rol: tipo, texto });
}

function agregarCorreccionRoleplay(texto) {
  const chat = document.getElementById("roleplay-chat");
  const burbuja = document.createElement("div");
  burbuja.className = "voz-burbuja voz-burbuja-correccion";
  burbuja.textContent = texto;
  chat.appendChild(burbuja);
  chat.scrollTop = chat.scrollHeight;
}

function pintarSugerencias(sugerencias) {
  const zona = document.getElementById("roleplay-sugerencias");
  zona.innerHTML = "";

  (sugerencias || []).forEach((s) => {
    const chip = document.createElement("button");
    chip.className = "sugerencia";
    chip.textContent = s;
    chip.addEventListener("click", () => {
      document.getElementById("roleplay-entrada").value = s;
      document.getElementById("roleplay-entrada").focus();
    });
    zona.appendChild(chip);
  });
}

async function enviarMensajeRoleplay() {
  const entrada = document.getElementById("roleplay-entrada");
  const boton = document.getElementById("btn-enviar-roleplay");
  const texto = entrada.value.trim();

  if (!texto || !escenarioActivo) return;

  agregarBurbujaRoleplay("usuario", texto);
  entrada.value = "";
  entrada.disabled = true;
  boton.disabled = true;
  document.getElementById("roleplay-sugerencias").innerHTML = "";
  document.getElementById("roleplay-estado").textContent = "Thinking...";

  try {
    const datos = await RoleplayAPI.responder(
      escenarioActivo.id,
      historialRoleplay,
      texto,
    );

    document.getElementById("roleplay-estado").textContent = "";
    agregarBurbujaRoleplay("ia", datos.mensaje);

    if (datos.correccion) agregarCorreccionRoleplay(datos.correccion);
    pintarSugerencias(datos.sugerencias);

    // El chip de monedas del panel se mantiene al día
    const chip = document.getElementById("progreso-monedas");
    if (chip && typeof datos.monedas === "number") {
      chip.textContent = datos.monedas;
    }

    if (datos.terminado) {
      document.getElementById("roleplay-estado").textContent =
        "Scene finished. Well done!";
      document.getElementById("roleplay-sugerencias").innerHTML = "";
    }
  } catch (err) {
    document.getElementById("roleplay-estado").textContent =
      "Could not send that. Try again.";
  } finally {
    entrada.disabled = false;
    boton.disabled = false;
    entrada.focus();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn-roleplay");
  if (btn) btn.addEventListener("click", iniciarRoleplay);

  const btnEnviar = document.getElementById("btn-enviar-roleplay");
  if (btnEnviar) btnEnviar.addEventListener("click", enviarMensajeRoleplay);

  const entrada = document.getElementById("roleplay-entrada");
  if (entrada) {
    entrada.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        enviarMensajeRoleplay();
      }
    });
  }

  document.querySelectorAll("#roleplay-filtros .filtro").forEach((b) =>
    b.addEventListener("click", () => {
      filtroEscenarios = b.dataset.filtro;
      aplicarFiltroEscenarios();
    }),
  );

  const btnCambiar = document.getElementById("btn-cambiar-escenario");
  if (btnCambiar) btnCambiar.addEventListener("click", mostrarSelectorEscenarios);

  const btnSalir = document.getElementById("btn-salir-roleplay");
  if (btnSalir) {
    btnSalir.addEventListener("click", () => {
      document.getElementById("vista-roleplay").classList.add("oculto");
      document.getElementById("vista-principal").classList.remove("oculto");
      if (typeof cargarProgreso === "function") cargarProgreso();
    });
  }
});
