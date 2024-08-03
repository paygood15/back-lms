const express = require("express");
const {
  getAllUsers,
  addUser,
  getSpecificUser,
  updateUser,
  deleteUser,
  changePassword,
  updateLoggedUserData,
  getLoggedUserData,
  updateLoggedUserPassword,
  toggleUserStatus,
} = require("../controllers/userController");
const {
  addUserValidator,
  getUserValidator,
  changeUserPasswordValidator,
  updateUserValidator,
  deleteUserValidator,
  changeLoggedUserPassValidator,
  updateLoggedUserValidator,
} = require("../utils/validators/userValidator");
const authController = require("../controllers/authController");

const router = express.Router({ mergeParams: true });

// تغيير كلمة المرور للمستخدم المسجل
router.put(
  "/changeMyPassword",
  authController.auth,
  changeLoggedUserPassValidator,
  updateLoggedUserPassword
);

// تحديث بيانات المستخدم المسجل
router.put(
  "/updateMe",
  authController.auth,
  updateLoggedUserValidator,
  updateLoggedUserData
);

// الحصول على بيانات المستخدم المسجل
router.get("/getMe", authController.auth, getLoggedUserData, getSpecificUser);

// مسارات الإدارة
router
  .route(`/`)
  .get(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    getAllUsers
  )
  .post(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    addUserValidator,
    addUser
  );

router
  .route("/:id")
  .get(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    getUserValidator,
    getSpecificUser
  )
  .put(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    updateUserValidator,
    updateUser
  )
  .delete(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    deleteUserValidator,
    deleteUser
  );

// تغيير كلمة المرور للمستخدم بواسطة معرّف
router.put(
  "/changePassword/:id",
  authController.auth,
  authController.allowedTo("admin", "manager"),
  changeUserPasswordValidator,
  changePassword
);

// تبديل حالة المستخدم
router.patch(
  "/toggleStatus/:id",
  authController.auth,
  authController.allowedTo("admin", "manager"),
  toggleUserStatus
);

module.exports = router;
