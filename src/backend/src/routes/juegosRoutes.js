const express = require("express");
const router = express.Router();
const JuegosController = require("../controllers/juegosController");
const verificarAuth = require("../middleware/authMiddleware");

router.post("/ahorcado/nueva", verificarAuth, JuegosController.nuevoAhorcado);
router.post("/ahorcado/letra", verificarAuth, JuegosController.letraAhorcado);
router.post("/ahorcado/pista", verificarAuth, JuegosController.pistaAhorcado);

router.post("/sopa/nueva", verificarAuth, JuegosController.nuevaSopa);
router.post("/sopa/hallazgo", verificarAuth, JuegosController.hallazgoSopa);
router.post("/sopa/terminar", verificarAuth, JuegosController.terminarSopa);

router.post("/emparejar/nueva", verificarAuth, JuegosController.nuevoEmparejar);
router.post("/emparejar/par", verificarAuth, JuegosController.parEmparejar);

module.exports = router;
