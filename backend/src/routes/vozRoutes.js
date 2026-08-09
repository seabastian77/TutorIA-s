// backend/src/routes/vozRoutes.js
const express = require("express");
const router = express.Router();
const VozController = require("../controllers/vozController");
const verificarAuth = require("../middleware/authMiddleware");

router.post("/responder", verificarAuth, VozController.responder);

module.exports = router;
