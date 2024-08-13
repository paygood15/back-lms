
const AsyncHandler = require("express-async-handler");
const LandingImage = require("../models/landingImageModel");

// const sharp = require("sharp"); // image processing lib for nodejs
// const { v4: uuidv4 } = require("uuid");
// const { uploadSingleImage } = require("../middlewares/imageUpload");
const multer = require("multer");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");

// إعداد Multer للرفع باستخدام الذاكرة المؤقتة (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // حد الحجم 5 ميجابايت لكل ملف
});

// Middleware لرفع صور متعددة
exports.uploadLandingImages = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "image2", maxCount: 1 },
  { name: "image3", maxCount: 1 },
  { name: "image4", maxCount: 1 },
]);

// Resize images and save
exports.resizeImages = AsyncHandler(async (req, res, next) => {
  if (!req.files) return next();

  const processImage = async (file, fieldName) => {
    if (file) {
      const filename = `landing-${fieldName}-${uuidv4()}-${Date.now()}.webp`;

      await sharp(file.buffer)
        .webp({ quality: 80 }) // تحويل إلى صيغة webp بجودة 80
        .toFile(`uploads/home/${filename}`); // الكتابة في ملف على القرص

      req.body[fieldName] = filename;
    }
  };

  await processImage(req.files.image ? req.files.image[0] : null, "image");
  await processImage(req.files.image2 ? req.files.image2[0] : null, "image2");
  await processImage(req.files.image3 ? req.files.image3[0] : null, "image3");
  await processImage(req.files.image4 ? req.files.image4[0] : null, "image4");

  next();
});
// @desc    Upload and create landing image
// @route   POST /api/v1/landing-image
// @access  Private/Admin
exports.createLandingImage = AsyncHandler(async (req, res) => {
  const newImage = await LandingImage.create(req.body);
  res.status(201).json({
    status: "success",
    data: newImage,
  });
});

// @desc    Get all landing images
// @route   GET /api/v1/landing-image
// @access  Public
exports.getAllLandingImages = AsyncHandler(async (req, res) => {
  const images = await LandingImage.find();
  res.status(200).json({
    status: "success",
    results: images.length,
    data: images,
  });
});

// @desc    Get a single landing image by ID
// @route   GET /api/v1/landing-image/:id
// @access  Public
exports.getLandingImage = AsyncHandler(async (req, res) => {
  const image = await LandingImage.findById(req.params.id);
  if (!image) {
    return res.status(404).json({
      status: "fail",
      message: "Image not found",
    });
  }
  res.status(200).json({
    status: "success",
    data: image,
  });
});

// @desc    Update landing image by ID
// @route   PUT /api/v1/landing-image/:id
// @access  Private/Admin
exports.updateLandingImage = AsyncHandler(async (req, res) => {
  const updatedImage = await LandingImage.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  if (!updatedImage) {
    return res.status(404).json({
      status: "fail",
      message: "Image not found",
    });
  }
  res.status(200).json({
    status: "success",
    data: updatedImage,
  });
});

// @desc    Delete landing image by ID
// @route   DELETE /api/v1/landing-image/:id
// @access  Private/Admin
exports.deleteLandingImage = AsyncHandler(async (req, res) => {
  const image = await LandingImage.findByIdAndDelete(req.params.id);
  if (!image) {
    return res.status(404).json({
      status: "fail",
      message: "Image not found",
    });
  }
  res.status(204).json({
    status: "success",
    data: null,
  });
});