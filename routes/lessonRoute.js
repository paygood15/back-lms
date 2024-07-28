const express = require("express");
const {
  getAllLessons,
  addLesson,
  getSpecificLesson,
  deleteLesson,
  updateLesson,
  recordLessonView,
  getStudentLessonStatistics,
  getAllStudentLessonStatistics,
} = require("../controllers/lessonController");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/record-view", authController.auth, recordLessonView);

router.get("/statistics", authController.auth, getStudentLessonStatistics);
router.get(
  "/admin/statistics",
  authController.auth,
  getAllStudentLessonStatistics
);
router
  .route("/")
  .get(getAllLessons)
  .post(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    addLesson
  );

router
  .route("/:id")
  .get(getSpecificLesson)
  .delete(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    deleteLesson
  )
  .put(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    updateLesson
  );

module.exports = router;
