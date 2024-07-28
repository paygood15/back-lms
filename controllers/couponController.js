const expressAsyncHandler = require("express-async-handler");
const mongoose = require("mongoose"); // تأكد من استيراد mongoose
const CouponModel = require("../models/couponModel");
const UserModel = require("../models/userModel");

exports.createCoupon = expressAsyncHandler(async (req, res) => {
  const { name, price, discount, commission, course } = req.body;

  const newCoupon = new CouponModel({
    name,
    price,
    discount,
    commission,
    course,
  });

  await newCoupon.save();
  res.status(201).json({ message: "Coupon created successfully", newCoupon });
});

exports.updateCoupon = expressAsyncHandler(async (req, res) => {
  const { couponId } = req.params;
  const updates = req.body;

  const coupon = await CouponModel.findByIdAndUpdate(couponId, updates, {
    new: true,
  });
  if (!coupon) {
    return res.status(404).json({ message: "Coupon not found" });
  }

  res.status(200).json({ message: "Coupon updated successfully", coupon });
});

exports.deleteCoupon = expressAsyncHandler(async (req, res) => {
  const { couponId } = req.params;

  const coupon = await CouponModel.findByIdAndDelete(couponId);
  if (!coupon) {
    return res.status(404).json({ message: "Coupon not found" });
  }

  res.status(200).json({ message: "Coupon deleted successfully" });
});

exports.getAllCoupons = expressAsyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const totalCoupons = await CouponModel.countDocuments();
  const coupons = await CouponModel.find()
    .populate("course")
    .limit(limit)
    .skip(skip);

  res.status(200).json({
    results: coupons.length,
    pagination: {
      totalItems: totalCoupons,
      totalPages: Math.ceil(totalCoupons / limit),
      currentPage: page,
    },
    data: coupons,
  });
});

exports.getCouponByCourse = expressAsyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const totalCoupons = await CouponModel.countDocuments({ course: courseId });
  const coupons = await CouponModel.find({ course: courseId })
    .populate("course")
    .limit(limit)
    .skip(skip);

  if (!coupons.length) {
    return res
      .status(404)
      .json({ message: "No coupons found for this course" });
  }

  res.status(200).json({
    results: coupons.length,
    pagination: {
      totalItems: totalCoupons,
      totalPages: Math.ceil(totalCoupons / limit),
      currentPage: page,
    },
    data: coupons,
  });
});

exports.getCouponStatistics = expressAsyncHandler(async (req, res) => {
  const { couponId } = req.params;

  // تحقق من أن couponId هو ObjectId
  const objectId = new mongoose.Types.ObjectId(couponId); // استخدام `new`

  // البحث عن الكوبون
  const coupon = await CouponModel.findById(objectId);
  if (!coupon) {
    return res.status(404).json({ message: "Coupon not found" });
  }

  // حساب الربح الكلي
  const totalRevenue = coupon.commission * coupon.usageCount;

  // تسجيل معلومات الكوبون للتحقق
  console.log("Coupon:", coupon);

  // البحث عن معلومات المستخدمين الذين استخدموا الكوبون
  const users = await UserModel.find({
    usedCoupons: objectId, // تأكد من استخدام ObjectId هنا
  }).exec(); // تأكد من استخدام exec() للحصول على وعد

  // تسجيل معلومات المستخدمين للتحقق
  console.log("Users:", users);

  if (!users.length) {
    return res
      .status(404)
      .json({ message: "No users found who used this coupon" });
  }

  res.status(200).json({
    coupon: {
      id: coupon._id,
      name: coupon.name,
      commission: coupon.commission,
      usageCount: coupon.usageCount,
      totalRevenue,
    },
    users,
  });
});
