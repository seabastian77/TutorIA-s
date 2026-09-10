const express = require("express");
const router = express.Router();
const VisualController = require("../controllers/visualController");
const verificarAuth = require("../middleware/authMiddleware");

router.get("/temas", verificarAuth, VisualController.temas);
router.post("/ejercicio", verificarAuth, VisualController.ejercicio);
router.post("/responder", verificarAuth, VisualController.responder);

module.exports = router;
