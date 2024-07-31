const slugify = require("slugify");
const CategoryModel = require("../models/categoryModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const SubCategoryModel = require("../models/subCategoryModel");
const SectionModel = require("../models/sectionModel");

// الحصول على جميع الفئات مع الباجيناشن
exports.getAllCategories = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const skip = (page - 1) * limit;

    const totalCategoriesCount = await CategoryModel.countDocuments({});
    const totalPages = Math.ceil(totalCategoriesCount / limit);

    const categories = await CategoryModel.find({}).skip(skip).limit(limit);

    // جمع الفئات مع subcategories والأقسام
    const categoriesWithDetails = await Promise.all(
      categories.map(async (category) => {
        const subCategories = await SubCategoryModel.find(
          { category: category._id },
          { title: 1, _id: 1 } // projection لاسترداد الأسماء والمعرفات فقط
        );
        const sections = await SectionModel.find(
          { category: category._id },
          { name: 1, description: 1, _id: 1 } // projection لاسترداد العناوين والوصف والمعرفات فقط
        );
        return {
          ...category.toJSON(),
          slug: slugify(category.name, { lower: true }),
          subCategories: subCategories,
          sections: sections,
        };
      })
    );

    res.status(200).json({
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCategoriesCount,
        itemsPerPage: limit,
      },
      results: categoriesWithDetails.length,
      data: categoriesWithDetails,
    });
  } catch (error) {
    console.error("Error in getAllCategories:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// الحصول على فئة محددة مع تضمين العنوان والوصف للأقسام
exports.getCategory = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await CategoryModel.findById(id);

    if (!category) {
      return next(new ApiError(`No Category found with id: ${id}`, 404));
    }

    const subCategories = await SubCategoryModel.find(
      { category: category._id },
      { name: 1, _id: 1 } // projection لاسترداد الأسماء والمعرفات فقط
    );
    const sections = await SectionModel.find(
      { category: category._id },
      { name: 1, description: 1, _id: 1 } // projection لاسترداد العناوين والوصف والمعرفات فقط
    );

    const categoryWithDetails = {
      ...category.toJSON(),
      slug: slugify(category.name, { lower: true }),
      subCategories: subCategories,
      sections: sections,
    };

    res.status(200).json({ data: categoryWithDetails });
  } catch (error) {
    console.error("Error in getCategory:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// تحديث فئة
exports.updateCategory = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const category = await CategoryModel.findOneAndUpdate(
      { _id: id },
      { name, slug: slugify(name) },
      { new: true }
    );

    if (!category) {
      return next(new ApiError(`No Category found with id: ${id}`, 404));
    }

    res.status(200).json({ data: category });
  } catch (error) {
    console.error("Error in updateCategory:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// إضافة فئة جديدة
exports.addCategory = asyncHandler(async (req, res) => {
  try {
    const category = await CategoryModel.create(req.body);
    res.status(201).json({ data: category });
  } catch (error) {
    console.error("Error in addCategory:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// حذف فئة
exports.deleteCategory = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await CategoryModel.findByIdAndDelete(id);

    if (!category) {
      return next(new ApiError(`No Category found with id: ${id}`, 404));
    }

    res.status(200).json({ msg: `Category deleted successfully` });
  } catch (error) {
    console.error("Error in deleteCategory:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});
