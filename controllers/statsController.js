const CategoryModel = require("../models/categoryModel");
const DoorModel = require("../models/doorsModel");
const LessonModel = require("../models/lessonModel");
const OrderModel = require("../models/orderModel");
const StudentCourseModel = require("../models/StudentCourseModel");
const SubCategoryModel = require("../models/subCategoryModel");
const UserModel = require("../models/userModel");
const LessonProgressModel = require("../models/lessonProgressModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const CouponModel = require("../models/couponModel");

// Function to calculate statistics
exports.getStatistics = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  try {
    // Aggregate counts
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
      dailyRevenue,
      dailyNewUsers,
      monthlyNewUsers,
      monthlyCompletedLessons,
      monthlyOrderStatus,
      doorPopularity,
      lessonPopularity,
      subCategoryPopularity,
      totalRevenue,
      totalCoursePrice,
      coursePrices,
      dailyUsers,
      monthlyUsers,
      yearlyUsers,
      activeUsers,
    ] = await Promise.all([
      // Daily Orders
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

      // Monthly Orders
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

      // Daily Revenue
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
            dailyRevenue: { $sum: "$finalPrice" },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Daily New Users
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
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            dailyNewUsers: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Monthly New Users
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

      // Monthly Completed Lessons
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

      // Monthly Order Status
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

      // Door Popularity
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

      // Lesson Popularity
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

      // SubCategory Popularity
      SubCategoryModel.aggregate([
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

      // Total Revenue
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

      // Total Course Price
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

      // Course Prices
      LessonModel.aggregate([
        {
          $lookup: {
            from: "orders",
            localField: "_id",
            foreignField: "subCategory",
            as: "orders",
          },
        },
        {
          $unwind: "$orders",
        },
        {
          $group: {
            _id: null,
            totalCoursePrice: { $sum: "$orders.finalPrice" },
          },
        },
      ]),

      // Monthly Users
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

      // Daily Users
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
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            totalUsers: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Yearly Users
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

      // Active Users
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
    ]);

    // Calculate percentage changes
    const getPercentageChange = (current, previous) =>
      previous === 0 ? 0 : ((current - previous) / previous) * 100;

    const monthlyOrderChange =
      monthlyOrders.length > 1
        ? getPercentageChange(
            monthlyOrders[monthlyOrders.length - 1].totalOrders,
            monthlyOrders[monthlyOrders.length - 2].totalOrders
          )
        : 0;
    const monthlyNewUserChange =
      monthlyNewUsers.length > 1
        ? getPercentageChange(
            monthlyNewUsers[monthlyNewUsers.length - 1].newUsers,
            monthlyNewUsers[monthlyNewUsers.length - 2].newUsers
          )
        : 0;
    const monthlyCompletedLessonChange =
      monthlyCompletedLessons.length > 1
        ? getPercentageChange(
            monthlyCompletedLessons[monthlyCompletedLessons.length - 1]
              .completedLessons,
            monthlyCompletedLessons[monthlyCompletedLessons.length - 2]
              .completedLessons
          )
        : 0;
    const yearlyUserChange =
      yearlyUsers.length > 1
        ? getPercentageChange(
            yearlyUsers[yearlyUsers.length - 1].totalUsers,
            yearlyUsers[yearlyUsers.length - 2].totalUsers
          )
        : 0;

    const totalRevenueValue = totalRevenue[0]?.totalRevenue || 0;
    const totalCoursePriceValue = totalCoursePrice[0]?.totalCoursePrice || 0;
    const totalCoursePrices = coursePrices[0]?.totalCoursePrice || 0;

    const profitPercentage =
      totalCoursePriceValue > 0
        ? ((totalRevenueValue / totalCoursePriceValue) * 100).toFixed(2)
        : 0;

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
          dailyRevenue,
          dailyNewUsers,
          monthlyNewUsers,
          monthlyCompletedLessons,
          monthlyOrderStatus,
          dailyUsers,
          monthlyOrderChange: `${monthlyOrderChange.toFixed(2)}%`,
          monthlyNewUserChange: `${monthlyNewUserChange.toFixed(2)}%`,
          monthlyCompletedLessonChange: `${monthlyCompletedLessonChange.toFixed(
            2
          )}%`,
          yearlyUserChange: `${yearlyUserChange.toFixed(2)}%`,
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
          totalRevenue: totalRevenueValue,
          totalCoursePrice: totalCoursePriceValue,
          profitPercentage: `${profitPercentage}%`,
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
