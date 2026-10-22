const express = require("express");
const router = express.Router();
const AvatarController = require("../controllers/avatarController");
const verificarAuth = require("../middleware/authMiddleware");

router.get("/config", verificarAuth, AvatarController.config);
router.post("/sesion", verificarAuth, AvatarController.sesion);

module.exports = router;
