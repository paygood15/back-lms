const express = require("express");
const router = express.Router();
const {
  createAccessCode,
  getAccessCodes,
  getAccessCodeById,
  updateAccessCode,
  deleteAccessCode,
} = require("../controllers/accessCodeController"); // تأكد من مسار وحدة التحكم

// إنشاء كود دخول جديد
router.post("/create", createAccessCode);

// الحصول على جميع أكواد الدخول
router.get("/", getAccessCodes);

// الحصول على كود دخول معين
router.get("/:id", getAccessCodeById);

// تحديث كود دخول معين
router.put("/:id", updateAccessCode);

// حذف كود دخول معين
router.delete("/:id", deleteAccessCode);

module.exports = router;
