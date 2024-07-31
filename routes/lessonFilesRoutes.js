const express = require("express");
const lessonFilesController = require("../controllers/lessonFilesController");
const { uploadSingleFile } = require("../middlewares/fileUpload");
const authController = require("../controllers/authController");
const router = express.Router();

router
  .route("/")
  .get(authController.auth, lessonFilesController.getAllLessonFiles)
  .post(
    uploadSingleFile("file"),
    authController.auth,
    authController.allowedTo("admin", "manager"),

    lessonFilesController.createLessonFile
  );

router
  .route("/:id")
  .get(authController.auth, lessonFilesController.getLessonFile)
  .patch(
    authController.auth,
    authController.allowedTo("admin", "manager"),

    uploadSingleFile("file"),
    lessonFilesController.updateLessonFile
  )
  .delete(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    lessonFilesController.deleteLessonFile
  );

module.exports = router;
