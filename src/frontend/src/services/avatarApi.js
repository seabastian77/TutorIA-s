const URL_BASE_AVATAR = window.TUTORIAS_API_URL || "http://localhost:3000/api";

const AvatarAPI = {
  /** Pregunta si la tutoría usa el avatar de demostración o un proveedor de video real. */
  async config() {
    const resp = await fetch(`${URL_BASE_AVATAR}/avatar/config`, {
      headers: { Authorization: `Bearer ${Sesion.obtenerToken()}` },
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "No se pudo leer la configuración del avatar");
    return datos;
  },

  /** Pide al backend un token de sesión del proveedor; la clave del proveedor nunca llega aquí. */
  async crearSesion() {
    const resp = await fetch(`${URL_BASE_AVATAR}/avatar/sesion`, {
      method: "POST",
      headers: { Authorization: `Bearer ${Sesion.obtenerToken()}` },
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "No se pudo abrir el video del tutor");
    return datos;
  },
};

window.AvatarAPI = AvatarAPI;
