const express = require("express");
const {
  signup,
  login,
  forgotPassword,
  verifyPasswordResetCode,
  resetPassword,
  logout,
} = require("../controllers/authController");
const authController = require("../controllers/authController");
const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout,authController.auth);
router.post("/forgotPasswords", forgotPassword);
router.post("/verifyResetCode", verifyPasswordResetCode);
router.put("/resetPassword", resetPassword);

module.exports = router;
