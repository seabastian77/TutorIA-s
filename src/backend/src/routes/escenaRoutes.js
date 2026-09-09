const express = require("express");
const router = express.Router();
const EscenaController = require("../controllers/escenaController");
const verificarAuth = require("../middleware/authMiddleware");

router.post("/nueva", verificarAuth, EscenaController.nueva);
router.post("/evaluar-linea", verificarAuth, EscenaController.evaluarLinea);

module.exports = router;
