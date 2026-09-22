const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");
const verificarAuth = require("../middleware/authMiddleware");

router.post("/registro", AuthController.registrar);
router.post("/login", AuthController.login);
router.get("/config", AuthController.config);
router.post("/google", AuthController.google);
router.post("/olvide", AuthController.olvide);
router.post("/restablecer", AuthController.restablecer);
router.get("/perfil", verificarAuth, AuthController.perfil);

module.exports = router;
