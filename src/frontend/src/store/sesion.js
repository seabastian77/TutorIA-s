// Estado de sesión guardado en localStorage

const Sesion = {
  guardar({ usuario, token }) {
    localStorage.setItem('tutorias_token', token);
    localStorage.setItem('tutorias_usuario', JSON.stringify(usuario));
  },

  obtenerToken() {
    return localStorage.getItem('tutorias_token');
  },

  obtenerUsuario() {
    const datos = localStorage.getItem('tutorias_usuario');
    return datos ? JSON.parse(datos) : null;
  },

  estaAutenticado() {
    return !!this.obtenerToken();
  },

  cerrar() {
    localStorage.removeItem('tutorias_token');
    localStorage.removeItem('tutorias_usuario');
    // La charla con Tuti vive en sessionStorage y sobrevive a la recarga:
    // si no se borra aquí, el siguiente en entrar en esta pestaña la vería
    try {
      sessionStorage.removeItem('tutorias_charla');
    } catch (e) {
      // Sin almacenamiento no hay nada guardado que borrar
    }
  }
};

window.Sesion = Sesion;
