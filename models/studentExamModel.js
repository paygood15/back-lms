const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const studentExamSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  answers: [
    {
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
        required: true,
      },
      answer: {
        type: String,
        required: true,
      },
      score: {
        type: Number,
        default: 0,
      },
    },
  ],
  finished: {
    type: Boolean,
    default: false,
  },
  attemptCount: {
    type: Number,
    default: 1,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  totalScore: {
    type: Number,
    default: 0,
  },
  percentage: {
    type: Number,
    default: 0,
  },
  duration: {
    type: Number, // duration in minutes
  },
  attemptRecords: [
    {
      attemptNumber: {
        type: Number,
        required: true,
      },
      score: {
        type: Number,
        default: 0,
      },
      percentage: {
        type: Number,
        default: 0,
      },
      startTime: {
        type: Date,
        required: true,
      },
      endTime: {
        type: Date,
        required: true,
      },
      duration: {
        type: Number, // duration in minutes
      },
    },
  ],
});

studentExamSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("StudentExam", studentExamSchema);
