const express = require("express");
const router = express.Router();
const MentorController = require("../controllers/mentorController");
const verificarAuth = require("../middleware/authMiddleware");

router.get("/estado", verificarAuth, MentorController.estado);
router.get("/consejo-del-dia", verificarAuth, MentorController.consejoDelDia);

module.exports = router;
