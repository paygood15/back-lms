const mongoose = require("mongoose");

const studentCourseSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    courses: [
      {
        
        type: mongoose.Schema.ObjectId,
        ref: "subCategory",
      },
    ],
    doors: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Door",
      },
    ],
  },
  { timestamps: true }
);

const StudentCourseModel = mongoose.model("StudentCourse", studentCourseSchema);

module.exports = StudentCourseModel;
