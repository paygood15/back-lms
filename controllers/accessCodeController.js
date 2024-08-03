const expressAsyncHandler = require("express-async-handler");
const AccessCodeModel = require("../models/accessCodeModel");
const ApiError = require("../utils/apiError");

// إنشاء كود دخول جديد
exports.createAccessCode = expressAsyncHandler(async (req, res, next) => {
  try {
    const { code, course, discount, validFrom, validTo, maxUses } = req.body;

    const accessCode = new AccessCodeModel({
      code,
      course,
      discount,
      validFrom,
      validTo,
      maxUses,
    });

    await accessCode.save();
    res
      .status(201)
      .json({ message: "Access code created successfully", accessCode });
  } catch (error) {
    next(new ApiError("Error creating access code", 500));
  }
});

// الحصول على جميع أكواد الدخول مع التصفح
exports.getAccessCodes = expressAsyncHandler(async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const accessCodes = await AccessCodeModel.find()
      .populate("course")
      .skip(skip)
      .limit(limit);

    const totalCount = await AccessCodeModel.countDocuments();

    res.status(200).json({
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      accessCodes,
    });
  } catch (error) {
    next(new ApiError("Error fetching access codes", 500));
  }
});

// الحصول على كود دخول معين
exports.getAccessCodeById = expressAsyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const accessCode = await AccessCodeModel.findById(id).populate("course");

    if (!accessCode) {
      return next(new ApiError("Access code not found", 404));
    }

    res.status(200).json({ accessCode });
  } catch (error) {
    next(new ApiError("Error fetching access code", 500));
  }
});

// تحديث كود دخول
exports.updateAccessCode = expressAsyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, course, discount, validFrom, validTo, maxUses } = req.body;

    const accessCode = await AccessCodeModel.findById(id);

    if (!accessCode) {
      return next(new ApiError("Access code not found", 404));
    }

    accessCode.code = code || accessCode.code;
    accessCode.course = course || accessCode.course;
    accessCode.discount = discount || accessCode.discount;
    accessCode.validFrom = validFrom || accessCode.validFrom;
    accessCode.validTo = validTo || accessCode.validTo;
    accessCode.maxUses = maxUses || accessCode.maxUses;

    await accessCode.save();
    res
      .status(200)
      .json({ message: "Access code updated successfully", accessCode });
  } catch (error) {
    next(new ApiError("Error updating access code", 500));
  }
});

// حذف كود دخول
exports.deleteAccessCode = expressAsyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    const accessCode = await AccessCodeModel.findById(id);

    if (!accessCode) {
      return next(new ApiError("Access code not found", 404));
    }

    await AccessCodeModel.findByIdAndDelete(id);
    res.status(200).json({ message: "Access code deleted successfully" });
  } catch (error) {
    next(new ApiError("Error deleting access code", 500));
  }
});
