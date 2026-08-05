const express = require("express");
const router = express.Router();
const NivelController = require("../controllers/nivelController");
const verificarAuth = require("../middleware/authMiddleware");

router.post("/pregunta", verificarAuth, NivelController.pregunta);
router.post("/finalizar", verificarAuth, NivelController.finalizar);

module.exports = router;
