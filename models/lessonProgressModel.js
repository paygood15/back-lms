const mongoose = require("mongoose");

const lessonProgressSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    lesson: {
      type: mongoose.Schema.ObjectId,
      ref: "Lesson",
      required: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// تحقق مما إذا كان النموذج موجوداً بالفعل لتجنب إعادة تعريفه
const LessonProgressModel =
  mongoose.models.LessonProgress ||
  mongoose.model("LessonProgress", lessonProgressSchema);

module.exports = LessonProgressModel;
