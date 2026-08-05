// src/services/authService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET || 'cambia_esta_clave_en_produccion';
const JWT_EXPIRA = '7d';

const AuthService = {
  async registrar({ nombre, correo, contrasena }) {
    const existente = await UserModel.buscarPorCorreo(correo);
    if (existente) {
      const error = new Error('Ese correo ya está registrado');
      error.status = 409;
      throw error;
    }

    const contrasenaHash = await bcrypt.hash(contrasena, 10);
    const usuario = await UserModel.crear({ nombre, correo, contrasenaHash });
    const token = this.generarToken(usuario);

    return { usuario, token };
  },

  async login({ correo, contrasena }) {
    const usuario = await UserModel.buscarPorCorreo(correo);
    if (!usuario) {
      const error = new Error('Correo o contraseña incorrectos');
      error.status = 401;
      throw error;
    }

    const coincide = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!coincide) {
      const error = new Error('Correo o contraseña incorrectos');
      error.status = 401;
      throw error;
    }

    await UserModel.actualizarUltimoAcceso(usuario.id);
    const token = this.generarToken(usuario);

    delete usuario.contrasena_hash;
    return { usuario, token };
  },

  generarToken(usuario) {
    return jwt.sign(
      { id: usuario.id, correo: usuario.correo },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRA }
    );
  },

  verificarToken(token) {
    return jwt.verify(token, JWT_SECRET);
  }
};

module.exports = AuthService;
