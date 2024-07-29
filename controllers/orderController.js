const expressAsyncHandler = require("express-async-handler");
const OrderModel = require("../models/orderModel");
const StudentCourseModel = require("../models/StudentCourseModel");
const DoorsModel = require("../models/doorsModel");
const SubCategoryModel = require("../models/subCategoryModel");
const { default: mongoose } = require("mongoose");
const CouponModel = require("../models/couponModel");
const UserModel = require("../models/userModel");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

exports.placeOrder = expressAsyncHandler(async (req, res) => {
  const { door, subCategory, couponCode } = req.body;
  const student = req.user._id;

  if (!door && !subCategory) {
    return res.status(400).json({ message: "Door or subCategory is required" });
  }

  let doorExists = null;
  let subCategoryExists = null;

  if (door && isValidObjectId(door)) {
    doorExists = await DoorsModel.findById(door);
    if (!doorExists) {
      return res.status(400).json({ message: "Invalid door id" });
    }
  } else if (door) {
    return res.status(400).json({ message: "Invalid door id format" });
  }

  if (subCategory && isValidObjectId(subCategory)) {
    subCategoryExists = await SubCategoryModel.findById(subCategory);
    if (!subCategoryExists) {
      return res.status(400).json({ message: "Invalid subCategory id" });
    }
  } else if (subCategory) {
    return res.status(400).json({ message: "Invalid subCategory id format" });
  }

  const existingOrder = await OrderModel.findOne({
    student,
    ...(door && { door }),
    ...(subCategory && { subCategory }),
    status: { $in: ["pending", "approved"] },
  });

  if (existingOrder) {
    return res.status(400).json({
      message:
        "Order for this door or subCategory already exists for this student",
    });
  }

  const rejectedOrder = await OrderModel.findOne({
    student,
    ...(door && { door }),
    ...(subCategory && { subCategory }),
    status: "rejected",
  });

  if (rejectedOrder) {
    await OrderModel.deleteOne({ _id: rejectedOrder._id });
  }

  let doorsInSubCategory = [];
  if (subCategory) {
    const subCategoryWithDoors = await SubCategoryModel.findById(
      subCategory
    ).populate("doors");
    if (subCategoryWithDoors) {
      doorsInSubCategory = subCategoryWithDoors.doors.map((door) => door._id);
    }
  }

  let coupon = null;
  let discount = 0;
  if (couponCode) {
    coupon = await CouponModel.findOne({ name: couponCode });
    if (!coupon) {
      return res.status(400).json({ message: "Invalid coupon code" });
    }

    if (coupon.course && coupon.course.toString() !== subCategory) {
      return res
        .status(400)
        .json({ message: "Coupon not applicable to this course" });
    }

    discount = coupon.discount;
    coupon.usageCount += 1;
    await coupon.save();

    // إضافة الكوبون إلى سجل المستخدم
    const user = await UserModel.findById(student);
    if (user) {
      if (!user.usedCoupons.includes(coupon._id)) {
        user.usedCoupons.push(coupon._id);
        await user.save();
      }
    }
  }

  const coursePrice = subCategoryExists
    ? subCategoryExists.price
    : doorExists.price;
  const finalPrice = coursePrice - discount;

  let newOrder = await OrderModel.create({
    student,
    door: door || null,
    subCategory: subCategory || null,
    finalPrice: finalPrice,
    status: finalPrice <= 0 ? "approved" : "pending",
  });

  if (doorsInSubCategory.length > 0) {
    await OrderModel.updateOne(
      { _id: newOrder._id },
      {
        $addToSet: {
          doors: {
            $each: doorsInSubCategory.map((id) => mongoose.Types.ObjectId(id)),
          },
        },
      }
    );
  }

  if (finalPrice <= 0) {
    let studentCourse = await StudentCourseModel.findOne({ student });
    if (studentCourse) {
      studentCourse.courses = studentCourse.courses || [];
      studentCourse.doors = studentCourse.doors || [];

      if (subCategory && !studentCourse.courses.includes(subCategory)) {
        studentCourse.courses.push(subCategory);
      }

      if (door && !studentCourse.doors.includes(door)) {
        studentCourse.doors.push(door);
      }

      await studentCourse.save();
    } else {
      const newStudentCourse = new StudentCourseModel({
        student,
        courses: subCategory ? [subCategory] : [],
        doors: door ? [door] : [],
      });

      await newStudentCourse.save();
    }
  }

  res.status(201).json({ newOrder });
});

exports.approveOrder = expressAsyncHandler(async (req, res) => {
  const { orderId } = req.params;

  // تحقق من وجود الطلب
  const order = await OrderModel.findById(orderId);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  // تحقق من حالة الطلب
  if (order.status !== "pending") {
    return res.status(400).json({ message: "Order cannot be approved" });
  }

  // تحديث حالة الطلب إلى "approved"
  order.status = "approved";
  await order.save();

  // تحديث معلومات الدورة والأبواب في نموذج StudentCourse
  let studentCourse = await StudentCourseModel.findOne({
    student: order.student,
  });

  if (studentCourse) {
    // تأكد من أن الخصائص موجودة وتهيئتها كقوائم
    studentCourse.courses = studentCourse.courses || [];
    studentCourse.doors = studentCourse.doors || [];

    // إضافة الدورة إلى قائمة الدورات
    if (
      order.subCategory &&
      !studentCourse.courses.includes(order.subCategory)
    ) {
      studentCourse.courses.push(order.subCategory);
    }

    // إضافة الأبواب إلى قائمة الأبواب
    if (order.door && !studentCourse.doors.includes(order.door)) {
      studentCourse.doors.push(order.door);
    }

    await studentCourse.save();
  } else {
    // إنشاء نموذج StudentCourse جديد إذا لم يكن موجوداً
    const newStudentCourse = new StudentCourseModel({
      student: order.student,
      courses: order.subCategory ? [order.subCategory] : [],
      doors: order.door ? [order.door] : [],
    });

    await newStudentCourse.save();
  }

  res.status(200).json({ message: "Order approved successfully", order });
});

// رفض الطلب
exports.rejectOrder = expressAsyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await OrderModel.findById(orderId);
  if (!order) return res.status(404).json({ message: "Order not found" });

  if (order.status === "rejected") {
    return res.status(400).json({ message: "Order already rejected" });
  }

  order.status = "rejected";
  await order.save();

  res.status(200).json({ message: "Order rejected" });
});

// الحصول على كل الطلبات
exports.getAllOrders = expressAsyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const totalOrders = await OrderModel.countDocuments();
  const orders = await OrderModel.find()
    .populate("student door subCategory")
    .limit(limit)
    .skip(skip);

  res.status(200).json({
    results: orders.length,
    pagination: {
      totalItems: totalOrders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
    },
    data: orders,
  });
});
exports.getStudentOrders = expressAsyncHandler(async (req, res) => {
  const studentId = req.user._id;

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const totalStudentOrders = await OrderModel.countDocuments({
    student: studentId,
  });
  const studentOrders = await OrderModel.find({ student: studentId })
    .populate("door subCategory")
    .limit(limit)
    .skip(skip);

  // التحقق من وجود طلبات
  if (!studentOrders || studentOrders.length === 0) {
    return res
      .status(404)
      .json({ message: "No orders found for this student" });
  }

  // إرسال الاستجابة
  res.status(200).json({
    results: studentOrders.length,
    pagination: {
      totalItems: totalStudentOrders,
      totalPages: Math.ceil(totalStudentOrders / limit),
      currentPage: page,
    },
    data: studentOrders,
  });
});
