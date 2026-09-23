const URL_BASE_DATOS = window.TUTORIAS_API_URL || "http://localhost:3000/api";

/** Hace la petición con la sesión y convierte cualquier error del servidor en un Error legible. */
async function pedirMisDatos(ruta, opciones = {}) {
  const resp = await fetch(`${URL_BASE_DATOS}${ruta}`, {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Sesion.obtenerToken()}`,
    },
  });
  const datos = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(datos.error || "Algo salió mal. Intenta de nuevo.");
  return datos;
}

const MisDatosAPI = {
  /** Cómo entra la persona, para saber si hay que pedirle la contraseña. */
  cuenta() {
    return pedirMisDatos("/usuario/cuenta");
  },

  /** Todo lo que la app guarda de la persona. */
  exportar() {
    return pedirMisDatos("/usuario/mis-datos");
  },

  /** Borra la cuenta y sus datos; pide el correo y, si la hay, la contraseña. */
  borrar({ correo, contrasena }) {
    return pedirMisDatos("/usuario/cuenta", {
      method: "DELETE",
      body: JSON.stringify({ correo, contrasena }),
    });
  },
};

window.MisDatosAPI = MisDatosAPI;
