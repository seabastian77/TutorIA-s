const express = require("express");
const router = express.Router();
const UsuarioController = require("../controllers/usuarioController");
const verificarAuth = require("../middleware/authMiddleware");

router.get("/progreso", verificarAuth, UsuarioController.progreso);
router.get("/logros", verificarAuth, UsuarioController.logros);

module.exports = router;
