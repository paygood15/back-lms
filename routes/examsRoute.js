const express = require("express");
const {
  createExam,
  startStudentExam,
  addQuestion,
  getExams,
  answerStudentQuestion,
  finishStudentExam,
  getStudentExamHistory,
  getStudentExamStatistics,
  getLessonExamStatistics,
  uploadExamImage,
  resizeImage,
  updateExam,
  updateQuestion,
  deleteExam,
  deleteQuestion,
  getSingleExam,
} = require("../controllers/examsController");
const authController = require("../controllers/authController");

const router = express.Router();

// Route to create a new exam
router.post(
  "/create",
  uploadExamImage,
  resizeImage,
  authController.auth,
  authController.allowedTo("admin", "manager"),

  createExam
);

// Route to start a new student exam
router.post("/:examId/start", authController.auth, startStudentExam);

// Route to add a question to an exam
router.post(
  "/:examId/add-question",
  uploadExamImage,
  resizeImage,
  authController.auth,
  authController.allowedTo("admin", "manager"),

  addQuestion
);

// Route to get all exams
router.get(
  "/",
  authController.auth,
  authController.allowedTo("admin", "manager"),
  getExams
);

// Route to answer a question in an exam
router.post(
  "/:examId/answer-question/:questionId",
  authController.auth,
  answerStudentQuestion
);

// Route to finish an exam
router.post("/:examId/finish", authController.auth, finishStudentExam);

// Route to get a student's exam history
router.get("/history", authController.auth, getStudentExamHistory);
router.get("/:examId", authController.auth, getSingleExam);

// Route to get a student's exam statistics
router.get("/statistics", authController.auth, getStudentExamStatistics);

// Route to get statistics for exams in a lesson
router.get(
  "/lesson/:lessonId/statistics",
  authController.auth,
  getLessonExamStatistics
);
// Route to update an existing exam
router.put(
  "/:examId/update",
  uploadExamImage,
  resizeImage,
  authController.auth,
  authController.allowedTo("admin", "manager"),

  updateExam
);

// Route to update a question in an exam
router.put(
  "/:examId/update-question/:questionId",
  uploadExamImage,
  resizeImage,
  authController.auth,
  authController.allowedTo("admin", "manager"),

  updateQuestion
);

// Route to delete an exam
router.delete(
  "/:examId/delete",
  authController.auth,
  authController.allowedTo("admin", "manager"),
  deleteExam
);

// Route to delete a question from an exam
router.delete(
  "/:examId/delete-question/:questionId",
  authController.auth,
  authController.allowedTo("admin", "manager"),

  deleteQuestion
);

module.exports = router;
