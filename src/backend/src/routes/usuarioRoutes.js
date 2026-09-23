const express = require("express");
const router = express.Router();
const UsuarioController = require("../controllers/usuarioController");
const MisDatosController = require("../controllers/misDatosController");
const verificarAuth = require("../middleware/authMiddleware");

router.get("/progreso", verificarAuth, UsuarioController.progreso);
router.get("/logros", verificarAuth, UsuarioController.logros);
router.patch("/preferencias", verificarAuth, UsuarioController.preferencias);
router.get("/cuenta", verificarAuth, MisDatosController.cuenta);
router.get("/mis-datos", verificarAuth, MisDatosController.exportar);
router.delete("/cuenta", verificarAuth, MisDatosController.borrar);

module.exports = router;
