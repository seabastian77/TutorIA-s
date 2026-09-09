const express = require("express");
const router = express.Router();
const LigaController = require("../controllers/ligaController");
const verificarAuth = require("../middleware/authMiddleware");

router.get("/clasificacion", verificarAuth, LigaController.clasificacion);

module.exports = router;
