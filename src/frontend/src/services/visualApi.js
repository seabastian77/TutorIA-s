// Servicio de los ejercicios con imagen
const URL_BASE_VISUAL = window.TUTORIAS_API_URL || "http://localhost:3000/api";

function cabecerasVisual() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${Sesion.obtenerToken()}`,
  };
}

async function pedirVisual(ruta, opciones = {}) {
  const resp = await fetch(`${URL_BASE_VISUAL}${ruta}`, {
    ...opciones,
    headers: cabecerasVisual(),
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

const VisualAPI = {
  temas: () => pedirVisual("/visual/temas"),

  ejercicio: (modo, tema) =>
    pedirVisual("/visual/ejercicio", {
      method: "POST",
      body: JSON.stringify({ modo, tema }),
    }),

  responder: (ejercicioId, texto) =>
    pedirVisual("/visual/responder", {
      method: "POST",
      body: JSON.stringify({ ejercicioId, texto }),
    }),
};

window.VisualAPI = VisualAPI;
