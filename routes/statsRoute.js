const express = require("express");
const router = express.Router();

const { getStatistics } = require("../controllers/statsController");
const authController = require("../controllers/authController");

router.get(
  "/",
  authController.auth,
  authController.allowedTo("admin", "manager"),
  getStatistics
);

module.exports = router;
