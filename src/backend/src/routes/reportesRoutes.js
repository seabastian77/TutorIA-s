const express = require("express");
const router = express.Router();
const ReportesController = require("../controllers/reportesController");
const verificarAuth = require("../middleware/authMiddleware");
const soloAdmin = require("../middleware/soloAdmin");

router.post("/", verificarAuth, ReportesController.crear);
router.get("/", verificarAuth, soloAdmin, ReportesController.listar);
router.patch("/:id", verificarAuth, soloAdmin, ReportesController.marcarRevisado);

module.exports = router;
