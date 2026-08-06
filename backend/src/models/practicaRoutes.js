const express = require("express");
const router = express.Router();
const PracticaController = require("../controllers/practicaController");
const verificarAuth = require("../middleware/authMiddleware");

router.post("/pregunta", verificarAuth, PracticaController.siguientePregunta);
router.post("/responder", verificarAuth, PracticaController.responder);

module.exports = router;
