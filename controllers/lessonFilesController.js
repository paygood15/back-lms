const LessonFile = require("../models/lessonFilesModel");
const ApiError = require("../utils/apiError");
const asyncHandler = require("express-async-handler");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const lessonModel = require("../models/lessonModel");

// Create a lesson file
exports.createLessonFile = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ApiError("Please upload a file", 400));
  }

  const fileName = `${uuidv4()}-${req.file.originalname}`;
  const filePath = path.join(__dirname, "../uploads/files", fileName);

  fs.writeFileSync(filePath, req.file.buffer);

  // Create a new lesson file
  const lessonFile = await LessonFile.create({
    title: req.body.title,
    lesson: req.body.lesson,
    file: fileName,
  });

  // Update the lesson with the new file
  await lessonModel.findByIdAndUpdate(
    req.body.lesson,
    { $push: { files: lessonFile._id } }, // Add file ID to lesson's files array
    { new: true, runValidators: true }
  );

  lessonFile.file = `${process.env.BASE_URL}/uploads/files/${fileName}`; // Set full URL

  res.status(201).json({
    status: "success",
    data: lessonFile,
  });
});

// Get all lesson files with pagination
exports.getAllLessonFiles = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const lessonFiles = await LessonFile.find().skip(skip).limit(limit);

  lessonFiles.forEach((file) => {
    const baseUrl = process.env.BASE_URL;
    if (file.file && !file.file.startsWith(baseUrl)) {
      file.file = `${baseUrl}/uploads/files/${file.file}`;
    }
  });

  res.status(200).json({
    status: "success",
    results: lessonFiles.length,
    data: lessonFiles,
  });
});
// Get a single lesson file
exports.getLessonFile = asyncHandler(async (req, res, next) => {
  const lessonFile = await LessonFile.findById(req.params.id);

  if (!lessonFile) {
    return next(new ApiError("No lesson file found with that ID", 404));
  }

  lessonFile.file = `${process.env.BASE_URL}/uploads/files/${lessonFile.file}`; // Set full URL

  res.status(200).json({
    status: "success",
    data: lessonFile,
  });
});

// Update a lesson file
exports.updateLessonFile = asyncHandler(async (req, res, next) => {
  const lessonFile = await LessonFile.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!lessonFile) {
    return next(new ApiError("No lesson file found with that ID", 404));
  }

  lessonFile.file = `${process.env.BASE_URL}/uploads/files/${lessonFile.file}`; // Set full URL

  res.status(200).json({
    status: "success",
    data: lessonFile,
  });
});

// Delete a lesson file

exports.deleteLessonFile = asyncHandler(async (req, res, next) => {
  const lessonFile = await LessonFile.findByIdAndDelete(req.params.id);

  if (!lessonFile) {
    return next(new ApiError("No lesson file found with that ID", 404));
  }

  // Remove the base URL from the file path
  let filePath = lessonFile.file;
  const baseUrl = process.env.BASE_URL;
  if (filePath.startsWith(baseUrl)) {
    filePath = filePath.replace(`${baseUrl}/uploads/files/`, "");
  }
  filePath = path.join(__dirname, "../uploads/files", filePath);

  // Delete the file from the filesystem
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    return next(new ApiError(`Failed to delete file: ${error.message}`, 500));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
