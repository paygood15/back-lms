const express = require("express");
const {
  createSection,
  getAllSections,
  getSection,
  updateSection,
  deleteSection,
} = require("../controllers/sectionController");
const authController = require("../controllers/authController");
const router = express.Router();

router.route("/").post(authController.auth, createSection).get(getAllSections);

router
  .route("/:id")
  .get(getSection)
  .put(authController.auth, updateSection)
  .delete(authController.auth, deleteSection);

module.exports = router;
