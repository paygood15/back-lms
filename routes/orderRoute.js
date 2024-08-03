const express = require("express");
const router = express.Router();

const {
  placeOrder,
  approveOrder,
  rejectOrder,
  // getStudentCourses,
  getAllOrders,
  // getLoggedUserCourses,
  // getCourseDetails,
  getStudentOrders,
  getOrdersBySubCategoryAdmin,
  getStudentOrdersBySubCategory,
} = require("../controllers/orderController");

const authController = require("../controllers/authController");

router
  .route("/")
  .get(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    getAllOrders
  );
router.route("/").post(authController.auth, placeOrder);
router
  .route("/:orderId/approve")
  .patch(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    approveOrder
  );
router
  .route("/:orderId/reject")
  .patch(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    rejectOrder
  );
router.get("/student-orders", authController.auth, getStudentOrders);

router.get(
  "/admin/subcategory/:subCategoryId",
  authController.auth,
  authController.allowedTo("admin", "manager"),
  getOrdersBySubCategoryAdmin
);

router.get(
  "/student/subcategory/:subCategoryId",
  authController.auth,
  getStudentOrdersBySubCategory
);

module.exports = router;
