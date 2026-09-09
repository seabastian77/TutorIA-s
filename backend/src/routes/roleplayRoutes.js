const express = require("express");
const router = express.Router();
const RoleplayController = require("../controllers/roleplayController");
const verificarAuth = require("../middleware/authMiddleware");

router.get("/escenarios", verificarAuth, RoleplayController.escenarios);
router.post("/iniciar", verificarAuth, RoleplayController.iniciar);
router.post("/responder", verificarAuth, RoleplayController.responder);

module.exports = router;
