// src/store/sesion.js
// Manejo simple de estado global de sesión usando localStorage

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
  }
};

window.Sesion = Sesion;
