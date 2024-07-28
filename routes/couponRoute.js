const express = require("express");
const router = express.Router();
const {
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getAllCoupons,
  getCouponByCourse,
  getCouponStatistics,
} = require("../controllers/couponController");
const authController = require("../controllers/authController");

// إنشاء كوبون جديد
router.post("/create", authController.auth, createCoupon);

// تحديث كوبون موجود
router.put("/:couponId", authController.auth, updateCoupon);

// حذف كوبون
router.delete("/:couponId", authController.auth, deleteCoupon);

// الحصول على جميع الكوبونات مع التصفح
router.get("/", authController.auth, getAllCoupons);
router.get("/course/:courseId", getCouponByCourse);
router.get("/statistics/:couponId", authController.auth, getCouponStatistics);

module.exports = router;
