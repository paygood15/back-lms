const AsyncHandler = require("express-async-handler");
const subCategoryModel = require("../models/subCategoryModel");
const slugify = require("slugify");
const CategoryModel = require("../models/categoryModel");
const SectionModel = require("../models/sectionModel");
const ApiError = require("../utils/apiError");
const sharp = require("sharp"); // image processing lib for nodejs
const { v4: uuidv4 } = require("uuid");
const { uploadSingleImage } = require("../middlewares/imageUpload");

// Middleware to handle image upload
exports.uploadSubCategoryImage = uploadSingleImage("image");

// Resize image and save
exports.resizeImage = AsyncHandler(async (req, res, next) => {
  if (!req.file) return next();

  const filename = `course-${uuidv4()}-${Date.now()}.webp`;

  await sharp(req.file.buffer)
    .resize(500, 500) // resize image if needed
    .webp({ quality: 80 }) // convert to webp format with quality 80
    .toFile(`uploads/courses/${filename}`); // write into a file on the disk

  req.body.image = filename;
  next();
});
// Middleware to handle image upload
exports.uploadSubCategoryImage = uploadSingleImage("image");

// @desc   Add a new subcategory
// @route  POST /api/subcategories
// @access Private (Admin only)
exports.addSubCategory = AsyncHandler(async (req, res) => {
  // Find the category by ID
  const category = await CategoryModel.findById(req.body.category);
  if (!category) {
    return res.status(400).json({
      success: false,
      error: "Invalid Category",
    });
  }

  // Find the section by ID
  const section = await SectionModel.findById(req.body.section);
  if (!section) {
    return res.status(400).json({
      success: false,
      error: "Invalid Section",
    });
  }

  // Create a new subcategory
  const subCategory = await subCategoryModel.create(req.body);

  // Add the new subcategory to the category's subCategories array
  category.subCategories.push(subCategory._id);
  await category.save();

  // Add the new subcategory to the section's subCategories array
  section.subCategories.push(subCategory._id);
  await section.save();

  res.status(201).json({
    success: true,
    data: subCategory,
  });
});

// @desc   Add a description to a subcategory
// @route  POST /api/subcategories/:id/descriptions
// @access Private (Admin only)
exports.addDescription = AsyncHandler(async (req, res) => {
  const subCategory = await subCategoryModel.findById(req.params.id);
  if (!subCategory) {
    return res.status(404).json({ message: "Subcategory not found" });
  }

  if (!req.body.text) {
    return res.status(400).json({ message: "Description text is required" });
  }

  subCategory.descriptions.push({ text: req.body.text });
  await subCategory.save();

  res.status(201).json(subCategory);
});

// @desc   Get all subcategories with pagination and search
// @route  GET /api/subcategories
// @access Public
exports.getAllSubCategories = AsyncHandler(async (req, res) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10; // تغيير الحد الافتراضي إلى 10
  const skip = (page - 1) * limit;

  // البحث بالاستعلام (query)
  const searchQuery = req.query.search
    ? { name: { $regex: req.query.search, $options: "i" } } // البحث غير حساس للحالة
    : {};

  let filterObject = {};
  if (req.query.categoryId) {
    filterObject.category = req.query.categoryId;
  }

  const subCategories = await subCategoryModel
    .find({ ...filterObject, ...searchQuery })
    .skip(skip)
    .limit(limit)
    .populate("category", "name")
    .populate({
      path: "doors",
      select: "title description",
      populate: {
        path: "lessons",
        select: "title description",
        populate: {
          path: "files",
          select: "title lesson",
        },

        populate: {
          path: "exams",
          select: "title image lesson duration",
        },
      },
    });

  const totalSubCategories = await subCategoryModel.countDocuments({
    ...filterObject,
    ...searchQuery,
  });

  res.status(200).json({
    results: subCategories.length,
    page,
    limit,
    pagesCount: Math.ceil(totalSubCategories / limit),
    totalItems: totalSubCategories,
    data: subCategories,
  });
});
exports.getSubcategoryInCategory = AsyncHandler(async (req, res, next) => {
  const { categoryId } = req.params;

  // Extract pagination parameters from query string
  const page = parseInt(req.query.page, 10) || 1; // Default to page 1 if not provided
  const limit = parseInt(req.query.limit, 10) || 10; // Default to 10 items per page if not provided

  // Validate pagination parameters
  if (page < 1 || limit < 1) {
    return next(new ApiError("Invalid pagination parameters", 400));
  }

  // Find the category by ID
  const category = await CategoryModel.findById(categoryId);
  if (!category) {
    return next(new ApiError("Category not found", 404));
  }

  // Get total number of subcategories for pagination metadata
  const totalSubCategories = await subCategoryModel.countDocuments({
    _id: { $in: category.subCategories },
  });

  // Find the subcategories with pagination
  const subCategories = await subCategoryModel
    .find({
      _id: { $in: category.subCategories },
    })
    .select("_id title description price")
    .skip((page - 1) * limit)
    .limit(limit);

  res.status(200).json({
    status: "success",
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalSubCategories / limit),
      totalSubCategories,
    },
    data: {
      subCategories,
    },
  });
});

// @desc   Get a specific subcategory by ID
// @route  GET /api/subcategories/:id
// @access Public
exports.getSpecificSubCategory = AsyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const subCategory = await subCategoryModel.findById(id);
  if (!subCategory) {
    return next(new ApiError(`No SubCategory has id : ${id}`, 404));
  }
  res.status(200).json({
    success: true,
    data: subCategory,
  });
});

// @desc   Update a subcategory
// @route  PUT /api/subcategories/:id
// @access Private (Admin only)
exports.updateSubCategory = AsyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Find the existing subcategory
  const existingSubCategory = await subCategoryModel.findById(id);
  if (!existingSubCategory) {
    return next(new ApiError(`No SubCategory has id : ${id}`, 404));
  }

  // If section is being updated
  if (
    req.body.section &&
    req.body.section !== existingSubCategory.section.toString()
  ) {
    // Find the new section by ID
    const newSection = await SectionModel.findById(req.body.section);
    if (!newSection) {
      return res.status(400).json({
        success: false,
        error: "Invalid Section",
      });
    }

    // Remove subcategory from old section
    const oldSection = await SectionModel.findById(existingSubCategory.section);
    if (oldSection) {
      oldSection.subCategories.pull(existingSubCategory._id);
      await oldSection.save();
    }

    // Add subcategory to new section
    newSection.subCategories.push(existingSubCategory._id);
    await newSection.save();
  }

  // Update the subcategory
  const subCategory = await subCategoryModel.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: subCategory,
  });
});

// @desc   Delete a subcategory
// @route  DELETE /api/subcategories/:id
// @access Private (Admin only)
exports.deleteSubCategory = AsyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const subCategory = await subCategoryModel.findByIdAndDelete(id);

  if (!subCategory) {
    return next(new ApiError(`No SubCategory has id : ${id}`, 404));
  }
  res.status(200).json({
    msg: `SubCategory Is Deleted Successfully`,
  });
});

// @desc   Update a description in a subcategory
// @route  PUT /api/subcategories/:id/descriptions/:descriptionId
// @access Private (Admin only)
exports.updateDescription = AsyncHandler(async (req, res) => {
  const { id, descriptionId } = req.params;
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ message: "Description text is required" });
  }

  const subCategory = await subCategoryModel.findById(id);
  if (!subCategory) {
    return res.status(404).json({ message: "Subcategory not found" });
  }

  const description = subCategory.descriptions.id(descriptionId);
  if (!description) {
    return res.status(404).json({ message: "Description not found" });
  }

  description.text = text;
  await subCategory.save();

  res.status(200).json({
    success: true,
    data: subCategory,
  });
});

// @desc   Delete a description from a subcategory
// @route  DELETE /api/subcategories/:id/descriptions/:descriptionId
// @access Private (Admin only)
exports.deleteDescription = AsyncHandler(async (req, res) => {
  const { id, descriptionId } = req.params;

  const subCategory = await subCategoryModel.findById(id);
  if (!subCategory) {
    return res.status(404).json({ message: "Subcategory not found" });
  }

  const description = subCategory.descriptions.id(descriptionId);
  if (!description) {
    return res.status(404).json({ message: "Description not found" });
  }

  description.remove();
  await subCategory.save();

  res.status(200).json({
    success: true,
    data: subCategory,
  });
});
