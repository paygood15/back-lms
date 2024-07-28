const expressAsyncHandler = require("express-async-handler");
const StudentExam = require("../models/studentExamModel");
const Lesson = require("../models/lessonModel");
const Exam = require("../models/examModel");
const sharp = require("sharp"); // image processing lib for nodejs
const { v4: uuidv4 } = require("uuid");
const { uploadSingleImage } = require("../middlewares/imageUpload");
const StudentCourseModel = require("../models/StudentCourseModel");

// Middleware for uploading and resizing images
exports.uploadExamImage = uploadSingleImage("image");

// Resize image and save
exports.resizeImage = expressAsyncHandler(async (req, res, next) => {
  if (!req.file) return next();

  const filename = `exam-${uuidv4()}-${Date.now()}.webp`;

  await sharp(req.file.buffer)
    .resize(500, 500) // resize image if needed
    .webp({ quality: 80 }) // convert to webp format with quality 80
    .toFile("uploads/exams/${filename}"); // write into a file on the disk

  req.body.image = filename;
  next();
});

// Create a new exam
exports.createExam = async (req, res) => {
  try {
    const exam = new Exam(req.body);
    await exam.save();

    // Update related lessons
    if (req.body.lesson) {
      await Lesson.findByIdAndUpdate(req.body.lesson, {
        $addToSet: { exams: exam._id },
      });
    }

    res.status(201).send(exam);
  } catch (error) {
    res.status(400).send("Error creating exam");
  }
};

// Retrieve all exams
exports.getExams = async (req, res) => {
  try {
    const exams = await Exam.find();
    res.send(exams);
  } catch (error) {
    res.status(500).send("Error retrieving exams");
  }
};

// إضافة سؤال إلى امتحان من قبل المشرف
// إضافة سؤال إلى امتحان من قبل المشرف
exports.addQuestion = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).send("Exam not found");
    }

    // التحقق من أن البيانات المطلوبة موجودة
    const { text, options, correctAnswer, score } = req.body;
    if (!text || !options || !correctAnswer) {
      return res.status(400).send("Missing required question fields");
    }

    // Add the question to the exam
    exam.questions.push({
      text,
      options,
      correctAnswer,
      score,
    });

    await exam.save();
    res.send(exam);
  } catch (error) {
    res.status(400).send("Error adding question");
  }
};

// Start an exam for a student
exports.startStudentExam = async (req, res) => {
  const { examId } = req.params;
  const studentId = req.user._id;

  try {
    // Retrieve the exam and its questions
    const exam = await Exam.findById(examId).populate("questions");
    if (!exam) {
      return res.status(404).send("Exam not found");
    }

    // Ensure the exam has a duration
    if (!exam.duration) {
      return res.status(400).send("Exam duration is required.");
    }

    // Retrieve the lesson associated with the exam
    const lesson = await Lesson.findOne({ exams: examId }).populate("door");
    if (!lesson) {
      return res.status(404).send("Lesson for this exam not found");
    }

    // Check if the student has access to the lesson
    const studentCourse = await StudentCourseModel.findOne({
      student: studentId,
    })
      .populate({
        path: "courses",
        populate: {
          path: "doors",
          model: "Door",
        },
      })
      .populate("doors");

    if (!studentCourse) {
      return res.status(403).send("Student does not have access to this exam");
    }

    const hasAccessToCourse = studentCourse.courses.some((course) =>
      course.doors.some((door) => door._id.equals(lesson.door._id))
    );

    const hasAccessToDoor = studentCourse.doors.some((door) =>
      door._id.equals(lesson.door._id)
    );

    if (!hasAccessToCourse && !hasAccessToDoor) {
      return res.status(403).send("Student does not have access to this exam");
    }

    // Check if the student already has an ongoing exam
    let studentExam = await StudentExam.findOne({
      exam: examId,
      student: studentId,
    });

    if (!studentExam) {
      studentExam = new StudentExam({
        exam: examId,
        student: studentId,
        answers: [],
        finished: false,
        attemptCount: 1,
        startTime: new Date(),
        endTime: new Date(Date.now() + exam.duration * 60000), // Duration in minutes
      });
    } else {
      studentExam.attemptCount += 1; // Increment attempt count
      studentExam.startTime = new Date();
      studentExam.endTime = new Date(Date.now() + exam.duration * 60000); // Update endTime
    }

    await studentExam.save();
    res.send(studentExam);
  } catch (error) {
    console.error("Error starting student exam:", error);
    res.status(500).send("Error starting student exam.");
  }
};

// Answer a question for a student
exports.answerStudentQuestion = expressAsyncHandler(async (req, res) => {
  const { examId, questionId } = req.params;
  const studentId = req.user._id;

  try {
    // Find the student's exam
    const studentExam = await StudentExam.findOne({
      exam: examId,
      student: studentId,
    });
    if (!studentExam) {
      return res.status(404).send("Student exam not found");
    }

    // Find the exam
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).send("Exam not found");
    }

    // Find the question
    const question = exam.questions.id(questionId);
    if (!question) {
      return res.status(404).send("Question not found");
    }

    const now = new Date();
    if (studentExam.finished || now > studentExam.endTime) {
      return res.status(400).send("Exam is already finished or time expired.");
    }

    // Trim the correct answer and the student's answer to avoid issues with extra spaces
    const correctAnswer = question.correctAnswer.trim();
    const studentAnswer = req.body.answer.trim();

    // Find the existing answer if any
    const existingAnswer = studentExam.answers.find(
      (ans) => ans.questionId.toString() === questionId
    );

    if (existingAnswer) {
      existingAnswer.answer = studentAnswer;
      existingAnswer.score =
        correctAnswer === studentAnswer ? question.score : 0;
    } else {
      studentExam.answers.push({
        questionId: questionId,
        answer: studentAnswer,
        score: correctAnswer === studentAnswer ? question.score : 0,
      });
    }

    // Calculate the total score
    studentExam.totalScore = studentExam.answers.reduce(
      (total, ans) => total + ans.score,
      0
    );

    // Calculate percentage
    const totalPossibleScore = exam.questions.reduce(
      (sum, q) => sum + q.score,
      0
    );
    studentExam.percentage = (
      (studentExam.totalScore / totalPossibleScore) *
      100
    ).toFixed(2);

    // Save the updates
    await studentExam.save();

    // إرسال الامتحان المحدث
    res.send(studentExam);
  } catch (error) {
    res.status(500).send("Error answering question");
  }
});
// إنهاء الامتحان من قبل الطالب
exports.finishStudentExam = async (req, res) => {
  const { examId } = req.params;
  const studentId = req.user._id;

  try {
    const studentExam = await StudentExam.findOne({
      exam: examId,
      student: studentId,
    });
    if (!studentExam) {
      return res.status(404).send("Student exam not found");
    }

    const now = new Date();
    if (now < studentExam.endTime) {
      studentExam.finished = true;
      await studentExam.save();
      res.send(studentExam);
    } else {
      res.status(400).send("Exam time has already expired.");
    }
  } catch (error) {
    res.status(500).send("Error finishing student exam");
  }
};

// استرجاع تاريخ امتحانات الطالب
exports.getStudentExamHistory = async (req, res) => {
  const studentId = req.user._id;
  const { page = 1, limit = 10 } = req.query;

  try {
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      populate: { path: "exam", select: "title" },
    };

    const studentExams = await StudentExam.paginate(
      { student: studentId },
      options
    );

    const totalExams = studentExams.totalDocs;
    const totalPages = studentExams.totalPages;
    const currentPage = studentExams.page;

    res.send({
      totalExams,
      totalPages,
      currentPage,
      studentExams: studentExams.docs,
    });
  } catch (error) {
    console.error("Error fetching student exam history:", error);
    res.status(500).send("Error fetching student exam history.");
  }
};
// تعديل الامتحان
exports.updateExam = async (req, res) => {
  const { examId } = req.params;
  const updates = req.body;

  try {
    const exam = await Exam.findByIdAndUpdate(examId, updates, {
      new: true,
      runValidators: true,
    });

    if (!exam) {
      return res.status(404).send("Exam not found");
    }

    res.send(exam);
  } catch (error) {
    res.status(400).send("Error updating exam");
  }
};
// تعديل سؤال
exports.updateQuestion = async (req, res) => {
  const { examId, questionId } = req.params;
  const updates = req.body;

  try {
    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).send("Exam not found");
    }

    const question = exam.questions.id(questionId);
    if (!question) {
      return res.status(404).send("Question not found");
    }

    Object.assign(question, updates);
    await exam.save();

    res.send(exam);
  } catch (error) {
    res.status(400).send("Error updating question");
  }
};
// حذف امتحان
exports.deleteExam = async (req, res) => {
  const { examId } = req.params;

  try {
    const exam = await Exam.findByIdAndDelete(examId);

    if (!exam) {
      return res.status(404).send("Exam not found");
    }

    res.send({ message: "Exam deleted successfully" });
  } catch (error) {
    res.status(400).send("Error deleting exam");
  }
};
// حذف سؤال من امتحان
exports.deleteQuestion = async (req, res) => {
  const { examId, questionId } = req.params;

  try {
    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).send("Exam not found");
    }

    const question = exam.questions.id(questionId);
    if (!question) {
      return res.status(404).send("Question not found");
    }

    question.remove();
    await exam.save();

    res.send({ message: "Question deleted successfully" });
  } catch (error) {
    res.status(400).send("Error deleting question");
  }
};

// الحصول على إحصائيات الامتحانات للطالب
exports.getStudentExamStatistics = expressAsyncHandler(async (req, res) => {
  const studentId = req.user.id;

  // الحصول على جميع امتحانات الطالب
  const exams = await StudentExam.find({ student: studentId }).exec();

  if (!exams || exams.length === 0) {
    return res.status(404).json({ message: "No exams found for this student" });
  }

  // حساب عدد الامتحانات
  const totalExams = exams.length;

  // حساب عدد مرات فتح الامتحان
  const totalAttempts = exams.reduce((acc, exam) => acc + exam.attemptCount, 0);

  // حساب عدد مرات إنهاء الامتحان
  const totalFinished = exams.filter((exam) => exam.finished).length;

  // حساب إجمالي الدرجات
  const totalScores = exams.reduce((acc, exam) => acc + exam.totalScore, 0);

  // حساب متوسط الدرجات
  const averageScore = totalExams > 0 ? totalScores / totalExams : 0;

  // حساب النسب المئوية
  const averagePercentage =
    exams.reduce((acc, exam) => acc + exam.percentage, 0) / totalExams;

  // حساب النسبة المئوية للامتحانات المنتهية
  const percentageFinished =
    totalExams > 0 ? (totalFinished / totalExams) * 100 : 0;

  res.status(200).json({
    statistics: {
      totalExams,
      totalAttempts,
      totalFinished,
      averageScore,
      averagePercentage,
      percentageFinished, // إضافة النسبة المئوية للامتحانات المنتهية
    },
  });
});
// الحصول على إحصائيات امتحانات الدرس
exports.getLessonExamStatistics = expressAsyncHandler(async (req, res) => {
  const lessonId = req.params.lessonId;

  // العثور على جميع الامتحانات المرتبطة بالدرس
  const exams = await Exam.find({ lesson: lessonId }).exec();

  if (!exams || exams.length === 0) {
    return res.status(404).json({ message: "No exams found for this lesson" });
  }

  // حساب إحصائيات كل امتحان
  const examStats = await Promise.all(
    exams.map(async (exam) => {
      const studentExams = await StudentExam.find({ exam: exam._id }).exec();

      const totalExams = studentExams.length;
      const totalAttempts = studentExams.reduce(
        (acc, exam) => acc + exam.attemptCount,
        0
      );
      const totalFinished = studentExams.filter((exam) => exam.finished).length;
      const totalScores = studentExams.reduce(
        (acc, exam) => acc + exam.totalScore,
        0
      );
      const averageScore = totalExams > 0 ? totalScores / totalExams : 0;

      // حساب النسبة المئوية للامتحانات المنتهية
      const percentageFinished =
        totalExams > 0 ? (totalFinished / totalExams) * 100 : 0;

      // حساب متوسط درجات الطلاب كنسبة مئوية
      const averagePercentage =
        totalExams > 0
          ? studentExams.reduce((acc, exam) => acc + exam.percentage, 0) /
            totalExams
          : 0;

      return {
        examId: exam._id,
        title: exam.title,
        totalExams,
        totalAttempts,
        totalFinished,
        averageScore,
        percentageFinished, // إضافة النسبة المئوية للامتحانات المنتهية
        averagePercentage, // إضافة متوسط درجات الطلاب كنسبة مئوية
      };
    })
  );

  res.status(200).json({ examStats });
});
exports.getSingleExam = expressAsyncHandler(async (req, res) => {
  const { examId } = req.params;
  const studentId = req.user._id;
  console.log(examId);
  console.log(studentId);

  try {
    // العثور على امتحان الطالب
    const studentExam = await StudentExam.findOne({
      exam: examId,
      student: studentId,
    })
      .populate({
        path: "exam",
        populate: {
          path: "questions",
          select: "text image options score", // حدد الحقول التي تريد استرجاعها
        },
      })
      .exec();

    if (!studentExam) {
      return res.status(404).send("Student exam not found");
    }

    // تحقق من الوصول إلى الامتحان
    const exam = await Exam.findById(examId).populate("questions");
    if (!exam) {
      return res.status(404).send("Exam not found");
    }

    const lesson = await Lesson.findOne({ exams: examId }).populate("door");
    if (!lesson) {
      return res.status(404).send("Lesson for this exam not found");
    }

    const studentCourse = await StudentCourseModel.findOne({
      student: studentId,
    })
      .populate({
        path: "courses",
        populate: {
          path: "doors",
          model: "Door",
        },
      })
      .populate("doors");

    if (!studentCourse) {
      return res.status(403).send("Student does not have access to this exam");
    }

    const hasAccessToCourse = studentCourse.courses.some((course) =>
      course.doors.some((door) => door._id.equals(lesson.door._id))
    );

    const hasAccessToDoor = studentCourse.doors.some((door) =>
      door._id.equals(lesson.door._id)
    );

    if (!hasAccessToCourse && !hasAccessToDoor) {
      return res.status(403).send("Student does not have access to this exam");
    }

    // إعداد الـ response
    const examResponse = {
      _id: exam._id,
      title: exam.title,
      image: exam.image,
      questions: exam.questions.map((question) => {
        return {
          _id: question._id,
          text: question.text,
          image: question.image,
          options: question.options,
          score: question.score,
        };
      }),
      totalScore: studentExam.totalScore,
      percentage: studentExam.percentage,
      finished: studentExam.finished,
      startTime: studentExam.startTime,
      endTime: studentExam.endTime,
      attemptCount: studentExam.attemptCount,
    };

    res.send(examResponse);
  } catch (error) {
    console.error("Error retrieving exam:", error);
    res.status(500).send("Error retrieving exam");
  }
});
