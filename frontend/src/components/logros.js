async function iniciarLogros() {
  document.getElementById("vista-principal").classList.add("oculto");
  document.getElementById("vista-logros").classList.remove("oculto");

  const contenedor = document.getElementById("logros-lista");
  contenedor.innerHTML = "";
  document.getElementById("logros-estado").textContent =
    "Loading achievements...";

  try {
    const datos = await LogrosAPI.obtenerLogros();
    document.getElementById("logros-estado").textContent = "";
    renderizarLogros(datos.logros);
  } catch (err) {
    document.getElementById("logros-estado").textContent =
      "Could not load your achievements.";
  }
}

function renderizarLogros(logros) {
  const contenedor = document.getElementById("logros-lista");
  contenedor.innerHTML = "";

  logros.forEach((logro) => {
    const fila = document.createElement("div");
    fila.className = `logro-item ${logro.desbloqueado ? "desbloqueado" : "bloqueado"}`;

    const progreso = Math.min(logro.actual, logro.meta);

    fila.innerHTML = `
      <div class="logro-icono">
        <i class="fa-solid ${logro.desbloqueado ? logro.icono : "fa-lock"}"></i>
      </div>
      <div class="logro-info">
        <p class="logro-nombre">${logro.nombre}</p>
        <p class="logro-descripcion">${logro.descripcion}</p>
        <div class="logro-barra-fondo">
          <div class="logro-barra-relleno" style="width:${(progreso / logro.meta) * 100}%"></div>
        </div>
        <p class="logro-conteo">${progreso} / ${logro.meta}</p>
      </div>
    `;

    contenedor.appendChild(fila);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const btnLogros = document.getElementById("btn-logros");
  if (btnLogros) btnLogros.addEventListener("click", iniciarLogros);

  const btnSalirLogros = document.getElementById("btn-salir-logros");
  if (btnSalirLogros) {
    btnSalirLogros.addEventListener("click", () => {
      document.getElementById("vista-logros").classList.add("oculto");
      document.getElementById("vista-principal").classList.remove("oculto");
    });
  }
});
