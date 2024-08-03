const sectionModel = require("../models/sectionModel");
const categoryModel = require("../models/categoryModel");
const asyncHandler = require("express-async-handler");

// إنشاء section جديد وربطه بالـ category المحددة
exports.createSection = asyncHandler(async (req, res) => {
  const { name, description, categoryId } = req.body;

  // تحقق من وجود الـ category
  const category = await categoryModel.findById(categoryId);
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  // إنشاء section جديد
  const section = await sectionModel.create({
    name,

    description,
    category: categoryId,
  });

  // إضافة section إلى الـ category المحددة
  category.sections.push(section._id);
  await category.save();

  res.status(201).json(section);
});

// الحصول على جميع الأقسام مع ميزة التصفح
exports.getAllSections = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const sections = await sectionModel
    .find()
    .populate("category")
    .populate({
      path: "subCategories",
      populate: {
        path: "title description price category doors",
      },
    })
    .skip(skip)
    .limit(limit);
  const total = await sectionModel.countDocuments();

  res.status(200).json({
    total,
    page,
    pages: Math.ceil(total / limit),
    sections,
  });
});

// الحصول على قسم معين مع البيانات الفرعية
exports.getSection = asyncHandler(async (req, res) => {
  const section = await sectionModel
    .findById(req.params.id)
    .populate("category")
    .populate({
      path: "subCategories",
      populate: {
        path: "title description price category doors",
      },
    });

  if (!section) {
    return res.status(404).json({ message: "Section not found" });
  }
  res.status(200).json(section);
});

// تحديث قسم معين باستخدام PUT
exports.updateSection = asyncHandler(async (req, res) => {
  const { name, slug, description, categoryId } = req.body;
  const section = await sectionModel.findById(req.params.id);
  if (!section) {
    return res.status(404).json({ message: "Section not found" });
  }
  const category = await categoryModel.findById(categoryId);
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }
  // تحديث القسم بالكامل
  section.name = name;
  section.slug = slug;
  section.description = description;
  section.category = categoryId;

  await section.save();
  res.status(200).json(section);
});

// حذف قسم معين
exports.deleteSection = asyncHandler(async (req, res) => {
  const section = await sectionModel.findById(req.params.id);
  if (!section) {
    return res.status(404).json({ message: "Section not found" });
  }

  // إزالة section من الـ category
  const category = await categoryModel.findById(section.category);
  if (category) {
    category.sections.pull(section._id); // هنا يتم استخدام sections بدلاً من subCategories
    await category.save();
  }

  await section.remove();
  res.status(204).send();
});
