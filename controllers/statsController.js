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
const ApiError = require("../utils/apiError");
const CouponModel = require("../models/couponModel");

// دالة لحساب إحصائيات الطلبات
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

    const orderStatusCounts = await OrderModel.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const [
      dailyOrders,
      monthlyOrders,
      monthlyNewUsers,
      monthlyCompletedLessons,
      monthlyOrderStatus,
      doorPopularity,
      lessonPopularity,
      subCategoryPopularity, // إضافة هذا السطر

      totalRevenue,
      totalCoursePrice,
      dailyUsers,
      monthlyUsers,
      yearlyUsers,
      activeUsers,
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
      SubCategoryModel.aggregate([
        // إضافة هذا الاستعلام
        {
          $lookup: {
            from: "orders",
            localField: "_id",
            foreignField: "subCategory",
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
      OrderModel.aggregate([
        {
          $match: { status: "approved" },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$finalPrice" },
          },
        },
      ]),
      OrderModel.aggregate([
        {
          $match: { status: "approved" },
        },
        {
          $lookup: {
            from: "subcategories",
            localField: "subCategory",
            foreignField: "_id",
            as: "subCategoryDetails",
          },
        },
        {
          $unwind: "$subCategoryDetails",
        },
        {
          $group: {
            _id: null,
            totalCoursePrice: { $sum: "$subCategoryDetails.price" },
          },
        },
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
            totalUsers: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),

      UserModel.aggregate([
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
            _id: null,
            activeUsers: {
              $sum: { $cond: [{ $eq: ["$isDisabled", false] }, 1, 0] },
            },
          },
        },
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
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            totalUsers: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      UserModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(
                startDate ||
                  new Date().setFullYear(new Date().getFullYear() - 1)
              ),
              $lte: new Date(endDate || new Date()),
            },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y", date: "$createdAt" } },
            totalUsers: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const response = {
      status: "success",
      data: {
        totalCounts: {
          categories: categoryCount,
          doors: doorCount,
          lessons: lessonCount,
          orders: orderCount,
          studentCourses: studentCourseCount,
          subCategories: subCategoryCount,
          users: userCount,
          activeUsers: activeUsers[0]?.activeUsers || 0,
        },
        orderStatusCounts,
        timeAnalysis: {
          dailyOrders,
          monthlyOrders,
          monthlyNewUsers,
          monthlyCompletedLessons,
          monthlyOrderStatus,
        },
        popularityAnalysis: {
          subCategoryPopularity: {
            title: "شعبة الكورسات",
            data: subCategoryPopularity,
          },
          doorPopularity: { title: "شعبية الأبواب", data: doorPopularity },
          lessonPopularity: { title: "شعبية الدروس", data: lessonPopularity },
        },
        revenueAnalysis: {
          totalRevenue: totalRevenue[0]?.totalRevenue || 0,
          totalCoursePrice: totalCoursePrice[0]?.totalCoursePrice || 0,
        },
        userStatistics: {
          dailyUsers,
          monthlyUsers,
          yearlyUsers,
        },
      },
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});
