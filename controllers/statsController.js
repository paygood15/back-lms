const CategoryModel = require("../models/categoryModel");
const DoorModel = require("../models/doorsModel");
const LessonModel = require("../models/lessonModel");
const OrderModel = require("../models/orderModel");
const StudentCourseModel = require("../models/StudentCourseModel");
const SubCategoryModel = require("../models/subCategoryModel");
const UserModel = require("../models/userModel");
const LessonProgressModel = require("../models/lessonProgressModel");
const StudentExam = require("../models/studentExamModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/ApiError");
const CouponModel = require("../models/couponModel");

exports.getStatistics = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  try {
    const [
      categoryCount,
      doorCount,
      lessonCount,
      orderCount,
      studentCourseCount,
      subCategoryCount,
      userCount,
    ] = await Promise.all([
      CategoryModel.countDocuments(),
      DoorModel.countDocuments(),
      LessonModel.countDocuments(),
      OrderModel.countDocuments(),
      StudentCourseModel.countDocuments(),
      SubCategoryModel.countDocuments(),
      UserModel.countDocuments(),
    ]);

    // الإحصائيات الخاصة بالطلاب
    const activeStudents = await UserModel.countDocuments({
      isDisabled: false,
    });
    const completedLessonsCount = await LessonProgressModel.countDocuments({
      viewedAt: {
        $gte: new Date(
          startDate || new Date().setMonth(new Date().getMonth() - 1)
        ),
        $lte: new Date(endDate || new Date()),
      },
    });
    const studentExamStats = await StudentExam.aggregate([
      {
        $match: {
          finished: true,
          startTime: {
            $gte: new Date(
              startDate || new Date().setMonth(new Date().getMonth() - 1)
            ),
            $lte: new Date(endDate || new Date()),
          },
        },
      },
      {
        $group: {
          _id: null,
          totalExams: { $sum: 1 },
          averageScore: { $avg: "$totalScore" },
          averagePercentage: { $avg: "$percentage" },
        },
      },
    ]);

    // تحليل زمني
    const [
      dailyOrders,
      monthlyOrders,
      monthlyNewUsers,
      monthlyCompletedLessons,
      monthlyOrderStatus,
      doorPopularity,
      lessonPopularity,
    ] = await Promise.all([
      OrderModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(startDate || new Date().setHours(0, 0, 0, 0)),
              $lte: new Date(endDate || new Date()),
            },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            totalOrders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      OrderModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(
                startDate || new Date().setMonth(new Date().getMonth() - 1)
              ),
              $lte: new Date(endDate || new Date()),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            totalOrders: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      UserModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(
                startDate || new Date().setMonth(new Date().getMonth() - 1)
              ),
              $lte: new Date(endDate || new Date()),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            newUsers: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      LessonProgressModel.aggregate([
        {
          $match: {
            viewedAt: {
              $gte: new Date(
                startDate || new Date().setMonth(new Date().getMonth() - 1)
              ),
              $lte: new Date(endDate || new Date()),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$viewedAt" },
              month: { $month: "$viewedAt" },
            },
            completedLessons: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      OrderModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(
                startDate || new Date().setMonth(new Date().getMonth() - 1)
              ),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              status: "$status",
            },
            totalOrders: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.status": 1 } },
      ]),
      DoorModel.aggregate([
        {
          $lookup: {
            from: "orders",
            localField: "_id",
            foreignField: "door",
            as: "orders",
          },
        },
        {
          $addFields: {
            orderCount: { $size: "$orders" },
          },
        },
        { $sort: { orderCount: -1 } },
      ]),
      LessonModel.aggregate([
        {
          $lookup: {
            from: "lessonprogresses",
            localField: "_id",
            foreignField: "lesson",
            as: "progress",
          },
        },
        {
          $addFields: {
            progressCount: { $size: "$progress" },
          },
        },
        { $sort: { progressCount: -1 } },
      ]),
    ]);

    // إحصاءات الكوبونات
    const couponStats = await CouponModel.aggregate([
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "usedCoupons",
          as: "orders",
        },
      },
      {
        $addFields: {
          usageCount: { $size: "$orders" },
          totalDiscount: {
            $sum: "$orders.discountApplied",
          },
        },
      },
      { $sort: { usageCount: -1 } },
    ]);

    // أرباح الأدمن
    const revenueStats = await OrderModel.aggregate([
      {
        $match: {
          status: "approved",
          createdAt: {
            $gte: new Date(
              startDate || new Date().setMonth(new Date().getMonth() - 1)
            ),
            $lte: new Date(endDate || new Date()),
          },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
        },
      },
    ]);

    const discountStats = await OrderModel.aggregate([
      {
        $match: {
          status: "approved",
          createdAt: {
            $gte: new Date(
              startDate || new Date().setMonth(new Date().getMonth() - 1)
            ),
            $lte: new Date(endDate || new Date()),
          },
        },
      },
      {
        $lookup: {
          from: "coupons",
          localField: "usedCoupons",
          foreignField: "_id",
          as: "coupons",
        },
      },
      {
        $addFields: {
          totalDiscount: {
            $sum: "$coupons.discount",
          },
        },
      },
      {
        $group: {
          _id: null,
          totalDiscount: { $sum: "$totalDiscount" },
        },
      },
    ]);

    const totalRevenue = revenueStats[0]?.totalRevenue || 0;
    const totalDiscount = discountStats[0]?.totalDiscount || 0;
    const netRevenue = totalRevenue - totalDiscount;

    // تنظيم الاستجابة
    const response = {
      status: "success",
      data: {
        // الإحصائيات العامة
        totalCounts: {
          categories: categoryCount,
          doors: doorCount,
          lessons: lessonCount,
          orders: orderCount,
          studentCourses: studentCourseCount,
          subCategories: subCategoryCount,
          users: userCount,
        },
        // الإحصائيات الخاصة بالطلاب
        studentStatistics: {
          activeStudents,
          completedLessons: completedLessonsCount,
          examStats: studentExamStats[0] || {
            totalExams: 0,
            averageScore: 0,
            averagePercentage: 0,
          },
        },
        // النسب المئوية
        percentages: {
          categories: (
            (categoryCount / (categoryCount + doorCount + lessonCount)) *
            100
          ).toFixed(2),
          doors: (
            (doorCount / (categoryCount + doorCount + lessonCount)) *
            100
          ).toFixed(2),
          lessons: (
            (lessonCount / (categoryCount + doorCount + lessonCount)) *
            100
          ).toFixed(2),
        },
        // التحليل الزمني
        timeAnalysis: {
          dailyOrders,
          monthlyOrders,
          monthlyNewUsers,
          monthlyCompletedLessons,
          monthlyOrderStatus,
        },
        // تحليل شعبية الأبواب والدروس
        popularityAnalysis: {
          doorPopularity: {
            title: "شعبية الأبواب",
            data: doorPopularity,
          },
          lessonPopularity: {
            title: "شعبية الدروس",
            data: lessonPopularity,
          },
        },
        // إحصاءات الكوبونات والأرباح
        couponStatistics: {
          title: "إحصاءات الكوبونات",
          data: couponStats,
        },
        revenueStatistics: {
          title: "أرباح الأدمن",
          data: netRevenue,
        },
      },
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});
