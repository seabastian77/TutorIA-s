const express = require("express");
const router = express.Router();
const VozController = require("../controllers/vozController");
const verificarAuth = require("../middleware/authMiddleware");

router.post("/responder", verificarAuth, VozController.responder);
router.post("/hablar", verificarAuth, VozController.hablar);

module.exports = router;
