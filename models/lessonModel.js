const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be a positive number"],
    },
    videoLink: {
      type: String,
      required: true,
    },
    door: {
      type: mongoose.Schema.ObjectId,
      ref: "Door",
      required: true,
    },
    exams: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Exam",
      },
    ],
    files: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "LessonFile",
      },
    ],
  },
  { timestamps: true }
);

const lessonModel = mongoose.model("Lesson", lessonSchema);

module.exports = lessonModel;
