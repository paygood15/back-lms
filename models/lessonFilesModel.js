const mongoose = require("mongoose");

const lessonFileSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    lesson: {
      type: mongoose.Schema.ObjectId,
      ref: "Lesson",
      required: true,
    },
    file: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Function to set file URLs
const setFileUrls = (doc) => {
  const baseUrl = process.env.BASE_URL;
  if (doc.file && !doc.file.startsWith(baseUrl)) {
    doc.file = `${baseUrl}/uploads/files/${doc.file}`;
  }
};

lessonFileSchema.post("init", (doc) => {
  setFileUrls(doc);
});

lessonFileSchema.post("save", (doc) => {
  setFileUrls(doc);
});

const LessonFile = mongoose.model("LessonFile", lessonFileSchema);

module.exports = LessonFile;
