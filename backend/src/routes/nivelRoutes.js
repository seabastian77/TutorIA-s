const express = require("express");
const router = express.Router();
const DiagnosticoController = require("../controllers/nivelController");
const verificarAuth = require("../middleware/authMiddleware");

router.post("/escena", verificarAuth, DiagnosticoController.escena);
router.post(
  "/evaluar-abierta",
  verificarAuth,
  DiagnosticoController.evaluarAbierta,
);
router.post("/finalizar", verificarAuth, DiagnosticoController.finalizar);

module.exports = router;
