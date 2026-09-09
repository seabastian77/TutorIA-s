// Servicios de roleplay, biblioteca y laboratorio de audio
const URL_BASE_CONTENIDO =
  window.TUTORIAS_API_URL || "http://localhost:3000/api";

function cabecerasContenido() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${Sesion.obtenerToken()}`,
  };
}

async function pedirContenido(ruta, opciones = {}) {
  const resp = await fetch(`${URL_BASE_CONTENIDO}${ruta}`, {
    ...opciones,
    headers: cabecerasContenido(),
  });
  const datos = await resp.json();
  if (!resp.ok) throw new Error(datos.error || "Something went wrong");
  return datos;
}

const RoleplayAPI = {
  escenarios: () => pedirContenido("/roleplay/escenarios"),

  iniciar: (escenarioId) =>
    pedirContenido("/roleplay/iniciar", {
      method: "POST",
      body: JSON.stringify({ escenarioId }),
    }),

  responder: (escenarioId, historial, mensajeUsuario) =>
    pedirContenido("/roleplay/responder", {
      method: "POST",
      body: JSON.stringify({ escenarioId, historial, mensajeUsuario }),
    }),
};

const BibliotecaAPI = {
  catalogo: () => pedirContenido("/biblioteca/catalogo"),

  lectura: (slug) => pedirContenido(`/biblioteca/lectura/${slug}`),

  traducir: (palabra, contexto) =>
    pedirContenido("/biblioteca/traducir", {
      method: "POST",
      body: JSON.stringify({ palabra, contexto }),
    }),

  responder: (lecturaId, respuestas) =>
    pedirContenido("/biblioteca/responder", {
      method: "POST",
      body: JSON.stringify({ lecturaId, respuestas }),
    }),
};

const AudioAPI = {
  dictado: () => pedirContenido("/audio/dictado"),

  responderDictado: (ejercicioId, texto) =>
    pedirContenido("/audio/responder-dictado", {
      method: "POST",
      body: JSON.stringify({ ejercicioId, texto }),
    }),

  comprension: () => pedirContenido("/audio/comprension"),

  responderComprension: (ejercicioId, respuestas) =>
    pedirContenido("/audio/responder-comprension", {
      method: "POST",
      body: JSON.stringify({ ejercicioId, respuestas }),
    }),
};

const PreferenciasAPI = {
  guardarAyudaEspanol: (ayudaEspanol) =>
    pedirContenido("/usuario/preferencias", {
      method: "PATCH",
      body: JSON.stringify({ ayudaEspanol }),
    }),
};

window.RoleplayAPI = RoleplayAPI;
window.BibliotecaAPI = BibliotecaAPI;
window.AudioAPI = AudioAPI;
window.PreferenciasAPI = PreferenciasAPI;
