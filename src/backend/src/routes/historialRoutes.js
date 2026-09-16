const express = require("express");
const router = express.Router();
const HistorialController = require("../controllers/historialController");
const verificarAuth = require("../middleware/authMiddleware");

router.get("/progreso", verificarAuth, HistorialController.progreso);

module.exports = router;
