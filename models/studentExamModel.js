const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const studentExamSchema = new mongoose.Schema({
  exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
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
      answer: { type: String, required: true },
      score: { type: Number, default: 0 }, // الدرجة التي حصل عليها الطالب للإجابة
    },
  ],
  totalScore: { type: Number, default: 0 }, // الدرجة الكلية
  percentage: { type: Number, default: 0 }, // نسبة الدرجة
  finished: { type: Boolean, default: false },
  startTime: Date,
  endTime: Date,
  attemptCount: { type: Number, default: 1 }, // عدد مرات امتحان الطالب
});
studentExamSchema.plugin(mongoosePaginate);

const StudentExam = mongoose.model("StudentExam", studentExamSchema);
module.exports = StudentExam;
