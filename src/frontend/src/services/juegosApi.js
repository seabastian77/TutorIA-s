// Servicios de los minijuegos: ahorcado, sopa de letras y emparejamiento
const URL_BASE_JUEGOS = window.TUTORIAS_API_URL || "http://localhost:3000/api";

async function pedirJuegos(ruta, cuerpo = {}) {
  const resp = await fetch(`${URL_BASE_JUEGOS}${ruta}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Sesion.obtenerToken()}`,
    },
    body: JSON.stringify(cuerpo),
  });

  const datos = await resp.json();
  if (!resp.ok) {
    // El código viaja aparte para poder dar un mensaje distinto
    const error = new Error(datos.error || "Something went wrong");
    error.codigo = datos.codigo;
    throw error;
  }
  return datos;
}

const JuegosAPI = {
  nuevoAhorcado: () => pedirJuegos("/juegos/ahorcado/nueva"),

  letraAhorcado: (partidaId, letra) =>
    pedirJuegos("/juegos/ahorcado/letra", { partidaId, letra }),

  pistaAhorcado: (partidaId) =>
    pedirJuegos("/juegos/ahorcado/pista", { partidaId }),

  nuevaSopa: () => pedirJuegos("/juegos/sopa/nueva"),

  hallazgoSopa: (partidaId, fila, columna, filaFin, columnaFin) =>
    pedirJuegos("/juegos/sopa/hallazgo", {
      partidaId,
      fila,
      columna,
      filaFin,
      columnaFin,
    }),

  terminarSopa: (partidaId) => pedirJuegos("/juegos/sopa/terminar", { partidaId }),

  nuevoEmparejar: () => pedirJuegos("/juegos/emparejar/nueva"),

  parEmparejar: (partidaId, izquierdaId, derechaId) =>
    pedirJuegos("/juegos/emparejar/par", { partidaId, izquierdaId, derechaId }),
};

window.JuegosAPI = JuegosAPI;
