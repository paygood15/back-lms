const expressAsyncHandler = require("express-async-handler");
const subCategoryModel = require("../models/subCategoryModel");
const doorsModel = require("../models/doorsModel");
const ApiError = require("../utils/apiError");

// @desc   Get all doors with pagination and search
// @route  GET /api/doors
// @access Public
exports.getAllDoors = expressAsyncHandler(async (req, res) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10; // تغيير الحد الافتراضي إلى 10
  const skip = (page - 1) * limit;

  // البحث بالاستعلام (query)
  const searchQuery = req.query.search
    ? { title: { $regex: req.query.search, $options: "i" } } // البحث غير حساس للحالة
    : {};

  // العثور على الأبواب مع التصفح والبحث
  const doors = await doorsModel
    .find(searchQuery)
    .limit(limit)
    .skip(skip)
    .populate("subCategory", "name")
    .populate({
      path: "lessons",
      select: "title description",
    });

  // حساب العدد الإجمالي للأبواب لتحديد عدد الصفحات
  const totalDoors = await doorsModel.countDocuments(searchQuery);

  res.status(200).json({
    results: doors.length,
    pagination: {
      totalPages: Math.ceil(totalDoors / limit),
      currentPage: page,
      totalItems: totalDoors,
    },
    data: doors,
  });
});

// @desc   Get a specific door by ID
// @route  GET /api/doors/:id
// @access Public
exports.getSpecificDoor = expressAsyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const door = await doorsModel
    .findById(id)
    .populate({
      path: "lessons",
      select: "title description",
    })
    .populate("subCategory", "title");

  if (!door) {
    return next(new ApiError(`No door has Id: ${id}`, 404));
  }

  res.status(200).json({ data: door });
});

// @desc   Add a new door
// @route  POST /api/doors
// @access Private (Admin only)
exports.addDoor = expressAsyncHandler(async (req, res) => {
  const { subCategory } = req.body;

  const subCategoryDoc = await subCategoryModel.findById(subCategory);
  if (!subCategoryDoc) {
    return res.status(400).json({
      success: false,
      error: "Invalid subCategory",
    });
  }

  const door = await doorsModel.create(req.body);
  subCategoryDoc.doors.push(door._id);
  await subCategoryDoc.save();

  res.status(201).json({ data: door });
});

// @desc   Update an existing door
// @route  PUT /api/doors/:id
// @access Private (Admin only)
exports.updateDoor = expressAsyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const door = await doorsModel.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!door) {
    return next(new ApiError(`No door Has Id: ${id}`, 404));
  }

  res.status(200).json({ data: door });
});

// @desc   Delete a door
// @route  DELETE /api/doors/:id
// @access Private (Admin only)
exports.deleteDoor = expressAsyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const door = await doorsModel.findByIdAndDelete(id);

  if (!door) {
    return next(new ApiError(`No door Has Id: ${id}`, 404));
  }

  // إزالة الباب من فئة الفرعية المرتبطة به
  await subCategoryModel.findByIdAndUpdate(door.subCategory, {
    $pull: { doors: door._id },
  });

  res.status(200).json({ msg: "Door Deleted Successfully" });
});
//
exports.getDoorsInCourse = expressAsyncHandler(async (req, res, next) => {
  const { courseId } = req.params;

  // Extract pagination parameters from query string
  const page = parseInt(req.query.page, 10) || 1; // Default to page 1 if not provided
  const limit = parseInt(req.query.limit, 10) || 10; // Default to 10 items per page if not provided

  // Validate pagination parameters
  if (page < 1 || limit < 1) {
    return next(new ApiError("Invalid pagination parameters", 400));
  }

  // Find the course by ID and populate the doors
  const course = await subCategoryModel.findById(courseId).populate({
    path: "doors",
    select: "_id title description",
    options: {
      skip: (page - 1) * limit,
      limit: limit,
    },
 
  });

  if (!course) {
    return next(new ApiError("Course not found", 404));
  }

  // Get total number of doors for pagination metadata
  const totalDoors = await subCategoryModel.countDocuments({
    _id: courseId,
    doors: { $exists: true },
  });

  res.status(200).json({
    status: "success",
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalDoors / limit),
      totalDoors,
    },
    data: {
      doors: course.doors,
    },
  });
});
