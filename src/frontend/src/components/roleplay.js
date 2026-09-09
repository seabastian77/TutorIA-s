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

    datos.escenarios.forEach((esc) => {
      const tarjeta = document.createElement("button");
      tarjeta.className = `escenario escenario-${esc.color || "azul"}`;

      const icono = document.createElement("span");
      icono.className = "escenario-icono";
      icono.innerHTML = `<i class="fa-solid ${esc.icono}"></i>`;

      const texto = document.createElement("span");
      texto.className = "escenario-texto";

      const nombre = document.createElement("span");
      nombre.className = "escenario-nombre";
      nombre.textContent = esc.nombre;

      const desc = document.createElement("span");
      desc.className = "escenario-desc";
      desc.textContent = esc.descripcion;

      texto.appendChild(nombre);
      texto.appendChild(desc);
      tarjeta.appendChild(icono);
      tarjeta.appendChild(texto);

      tarjeta.addEventListener("click", () => abrirEscenario(esc.id));
      lista.appendChild(tarjeta);
    });
  } catch (err) {
    estado.textContent = "Could not load the situations.";
  }
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
