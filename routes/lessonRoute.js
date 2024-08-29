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
  getLessonsInDoor,
  getLessonStatistics,
  recordPlaybackEvent, // Add this line
  updateVideoProgress, // Add this line
} = require("../controllers/lessonController");
const authController = require("../controllers/authController");

const router = express.Router();

// تسجيل مشاهدة الحصة
router.post("/record-view", authController.auth, recordLessonView);

// إحصائيات الطالب الفردية
router.get("/statistics", authController.auth, getStudentLessonStatistics);

// إحصائيات جميع الطلاب
router.get(
  "/admin/statistics",
  authController.auth,
  getAllStudentLessonStatistics
);

// إحصائيات درس معين
router.get(
  "/lesson-statistics/:lessonId",
  authController.auth,
  getLessonStatistics
);

router
  .route("/")
  .get(getAllLessons)
  .post(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    addLesson
  );

router.route("/door/:doorId").get(getLessonsInDoor);

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

// Route for recording playback events
router.post("/record-playback-event", authController.auth, recordPlaybackEvent);

// Route for updating video progress
router.post("/update-video-progress", authController.auth, updateVideoProgress);

module.exports = router;
