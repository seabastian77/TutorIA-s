// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const verificarAuth = require('../middleware/authMiddleware');

router.post('/registro', AuthController.registrar);
router.post('/login', AuthController.login);
router.get('/perfil', verificarAuth, AuthController.perfil);

module.exports = router;
