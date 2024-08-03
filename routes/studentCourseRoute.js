const express = require("express");
const {
  getStudentCourses,
  getLoggedUserCourses,
  getCourseDetails,
} = require("../controllers/studentCourseController");

const authController = require("../controllers/authController");
const router = express.Router();

router.route("/my-courses").get(authController.auth, getLoggedUserCourses);
router.route("/:courseId").get(authController.auth, getCourseDetails);
router.get(
  "/student/:studentId",
  authController.allowedTo("admin", "manager"),
  authController.auth,
  getStudentCourses
);

// router.get("/my-courses", authController.auth, getLoggedUserCourses);
// router.get("/:studentId", authController.auth, getStudentCourses);
// router.get("/:courseId", authController.auth, getCourseDetails);
module.exports = router;
