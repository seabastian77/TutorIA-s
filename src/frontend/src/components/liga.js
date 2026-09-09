const ESCUDOS_LIGA = {
  bronce: { color: "#c08457", icono: "fa-medal" },
  plata: { color: "#c6cdd6", icono: "fa-medal" },
  oro: { color: "#ffd84d", icono: "fa-medal" },
  zafiro: { color: "#4c6fff", icono: "fa-gem" },
  rubi: { color: "#ff4d5e", icono: "fa-gem" },
  diamante: { color: "#7fe4ff", icono: "fa-gem" },
};

async function iniciarLiga() {
  document.getElementById("vista-principal").classList.add("oculto");
  document.getElementById("vista-liga").classList.remove("oculto");

  const estado = document.getElementById("liga-estado");
  document.getElementById("liga-tabla").innerHTML = "";
  estado.textContent = "Loading the leaderboard...";

  try {
    const datos = await LigaAPI.obtenerClasificacion();
    estado.textContent = "";
    pintarCabeceraLiga(datos);
    pintarTablaLiga(datos);
  } catch (err) {
    estado.textContent = "Could not load the leaderboard.";
  }
}

function pintarCabeceraLiga(datos) {
  const escudo = ESCUDOS_LIGA[datos.liga] || ESCUDOS_LIGA.bronce;

  const icono = document.getElementById("liga-icono");
  icono.className = `fa-solid ${escudo.icono}`;
  icono.style.color = escudo.color;

  document.getElementById("liga-nombre").textContent = datos.ligaNombre;
  document.getElementById("liga-grupo").textContent = `Group ${datos.grupo}`;

  const dias = datos.diasRestantes;
  document.getElementById("liga-dias").textContent =
    dias === 1 ? "1 day left" : `${dias} days left`;

  const resumen = document.getElementById("liga-resumen");
  if (datos.tuPosicion) {
    resumen.textContent = `You're #${datos.tuPosicion} of ${datos.participantes} with ${datos.tuXp} XP`;
  } else {
    resumen.textContent = "Practice today to enter this week's ranking";
  }

  // Aviso de ascenso o descenso de la semana pasada
  const aviso = document.getElementById("liga-aviso");
  if (datos.movimiento === "sube") {
    aviso.textContent = `You finished #${datos.posicionAnterior} last week and moved up to ${datos.ligaNombre}!`;
    aviso.className = "liga-aviso liga-aviso-sube";
  } else if (datos.movimiento === "baja") {
    aviso.textContent = `You dropped to ${datos.ligaNombre} last week. Time to climb back.`;
    aviso.className = "liga-aviso liga-aviso-baja";
  } else {
    aviso.textContent = "";
    aviso.className = "liga-aviso oculto";
  }
}

function pintarTablaLiga(datos) {
  const tabla = document.getElementById("liga-tabla");
  tabla.innerHTML = "";

  if (datos.clasificacion.length === 0) {
    document.getElementById("liga-estado").textContent =
      "Nobody has scored yet this week. Be the first!";
    return;
  }

  datos.clasificacion.forEach((fila) => {
    const item = document.createElement("div");
    item.className = `liga-fila liga-zona-${fila.zona}`;
    if (fila.esTu) item.classList.add("liga-fila-tuya");

    const puesto = document.createElement("span");
    puesto.className = "liga-puesto";
    puesto.textContent = fila.posicion;

    const nombre = document.createElement("span");
    nombre.className = "liga-nombre-jugador";
    // textContent: el nombre lo escribió otro usuario, nunca va como HTML
    nombre.textContent = fila.esTu ? `${fila.nombre} (you)` : fila.nombre;

    const xp = document.createElement("span");
    xp.className = "liga-xp";
    xp.textContent = `${fila.xp} XP`;

    item.appendChild(puesto);
    item.appendChild(nombre);
    item.appendChild(xp);
    tabla.appendChild(item);
  });

  // Línea que marca dónde termina la zona de ascenso
  const primeraNeutra = datos.clasificacion.findIndex(
    (f) => f.zona !== "ascenso",
  );
  if (primeraNeutra > 0 && primeraNeutra < datos.clasificacion.length) {
    const separador = document.createElement("div");
    separador.className = "liga-separador";
    separador.textContent = `Top ${datos.suben} move up`;
    tabla.insertBefore(separador, tabla.children[primeraNeutra]);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btnLiga = document.getElementById("btn-liga");
  if (btnLiga) btnLiga.addEventListener("click", iniciarLiga);

  const btnSalir = document.getElementById("btn-salir-liga");
  if (btnSalir) {
    btnSalir.addEventListener("click", () => {
      document.getElementById("vista-liga").classList.add("oculto");
      document.getElementById("vista-principal").classList.remove("oculto");
    });
  }
});
