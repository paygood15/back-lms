const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  text: String,
  image: {
    type: String,
  },
  options: [{ type: String }], // قائمة خيارات الإجابة
  correctAnswer: String, // الإجابة الصحيحة
  score: { type: Number, default: 0 }, // الدرجة التي يحصل عليها الطالب إذا كانت الإجابة صحيحة
});

const examSchema = new mongoose.Schema({
  title: String,
  image: {
    type: String,
  },
  questions: [questionSchema],
  lesson: {
    type: mongoose.Schema.ObjectId,
    ref: "Lesson",
    required: true,
  },
  finished: { type: Boolean, default: false },
  startTime: Date,
  endTime: Date,
  duration: { type: Number, required: true }, // مدة الامتحان بالدقائق
});
const setImageUrl = (doc) => {
  if (doc.image && !doc.image.includes(process.env.BASE_URL)) {
    const imageUrl = `${process.env.BASE_URL}/uploads/exams/${doc.image}`;
    doc.image = imageUrl;
  }
};

examSchema.post("init", (doc) => {
  setImageUrl(doc);
});
questionSchema.post("init", (doc) => {
  setImageUrl(doc);
});

examSchema.post("save", (doc) => {
  setImageUrl(doc);
});
questionSchema.post("save", (doc) => {
  setImageUrl(doc);
});

const Exam = mongoose.model("Exam", examSchema);
module.exports = Exam;
