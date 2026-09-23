const express = require("express");
const router = express.Router();
const MetricasController = require("../controllers/metricasController");
const verificarAuth = require("../middleware/authMiddleware");
const soloAdmin = require("../middleware/soloAdmin");

router.get("/acceso", verificarAuth, MetricasController.acceso);
router.get("/resumen", verificarAuth, soloAdmin, MetricasController.resumen);

module.exports = router;
