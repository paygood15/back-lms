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
        endTime: new Date(Date.now() + exam.duration * 60000),
        duration: exam.duration,
        attemptRecords: [
          {
            attemptNumber: 1,
            score: 0,
            percentage: 0,
            startTime: new Date(),
            endTime: new Date(Date.now() + exam.duration * 60000),
            duration: exam.duration,
          },
        ],
      });
    } else {
      studentExam.attemptCount += 1;
      studentExam.finished = false;
      studentExam.startTime = new Date();
      studentExam.endTime = new Date(Date.now() + exam.duration * 60000);
      studentExam.attemptRecords.push({
        attemptNumber: studentExam.attemptCount,
        score: 0,
        percentage: 0,
        startTime: new Date(),
        endTime: new Date(Date.now() + exam.duration * 60000),
        duration: exam.duration,
      });
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
    const exam = await Exam.findById(examId).populate("questions");
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
    console.error("Error answering question:", error);
    res.status(500).send("Error answering question");
  }
});

// إنهاء الامتحان من قبل الطالب
exports.finishStudentExam = async (req, res) => {
  const { examId } = req.params;
  const studentId = req.user._id;

  try {
    // Fetch the student's exam record
    const studentExam = await StudentExam.findOne({
      exam: examId,
      student: studentId,
    }).populate("exam"); // Populate the exam details

    if (!studentExam) {
      return res.status(404).send("Student exam not found");
    }

    // Check if the exam record has expired
    const now = new Date();
    if (now < studentExam.endTime) {
      studentExam.finished = true;

      // Update the most recent attempt record
      const latestAttempt =
        studentExam.attemptRecords[studentExam.attemptRecords.length - 1];
      latestAttempt.endTime = now;
      latestAttempt.duration = Math.ceil(
        (latestAttempt.endTime - latestAttempt.startTime) / 60000
      ); // Duration in minutes

      // Ensure questions are populated and valid
      if (studentExam.exam && Array.isArray(studentExam.exam.questions)) {
        // Update the total score and percentage
        studentExam.totalScore = studentExam.answers.reduce(
          (total, ans) => total + ans.score,
          0
        );
        const totalPossibleScore = studentExam.exam.questions.reduce(
          (sum, q) => sum + (q.score || 0),
          0
        );
        studentExam.percentage = (
          (studentExam.totalScore / totalPossibleScore) *
          100
        ).toFixed(2);

        latestAttempt.score = studentExam.totalScore;
        latestAttempt.percentage = studentExam.percentage;
      } else {
        console.error("Exam questions are missing or invalid");
        return res.status(500).send("Invalid exam questions data");
      }

      await studentExam.save();
      res.send(studentExam);
    } else {
      res.status(400).send("Exam time has already expired.");
    }
  } catch (error) {
    console.error("Error finishing student exam:", error);
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
      populate: { path: "exam", select: "title duration" }, // تأكد من تضمين مدة الامتحان
    };

    const studentExams = await StudentExam.paginate(
      { student: studentId },
      options
    );

    const totalExams = studentExams.totalDocs;
    const totalPages = studentExams.totalPages;
    const currentPage = studentExams.page;

    res.send({
      exams: studentExams.docs.map((exam) => ({
        examId: exam.exam._id,
        title: exam.exam.title,
        attempts: exam.attemptRecords.map((record) => ({
          attemptNumber: record.attemptNumber,
          score: record.score,
          percentage: record.percentage,
          startTime: record.startTime,
          endTime: record.endTime,
          duration: record.duration,
          durationPercentage: (
            (record.duration / (exam.exam.duration || 1)) *
            100
          ).toFixed(2), // تجنب القسمة على الصفر
        })),
        totalAttempts: exam.attemptRecords.length, // عدد المحاولات لكل امتحان
        averageScore: (
          exam.attemptRecords.reduce(
            (total, record) => total + record.score,
            0
          ) / (exam.attemptRecords.length || 1)
        ).toFixed(2), // متوسط الدرجات
      })),
      totalExams,
      totalPages,
      currentPage,
    });
  } catch (error) {
    console.error("Error retrieving student exam history:", error);
    res.status(500).send("Error retrieving student exam history");
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
  const { questionId } = req.params;

  try {
    // ابحث عن جميع الامتحانات التي تحتوي على السؤال
    const exams = await Exam.find({ "questions._id": questionId });

    if (!exams.length) {
      return res.status(404).send("Question not found in any exam");
    }

    // قم بإزالة السؤال من كل امتحان
    for (const exam of exams) {
      const questionIndex = exam.questions.findIndex(
        (q) => q._id.toString() === questionId
      );

      if (questionIndex !== -1) {
        // إزالة السؤال من الأسئلة
        exam.questions.splice(questionIndex, 1);

        // تحديث الامتحان بدون التحقق من الصحة
        await Exam.updateOne(
          { _id: exam._id },
          { $pull: { questions: { _id: questionId } } },
          { runValidators: false }
        );
      }
    }

    res.send({ message: "Question deleted successfully from all exams" });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(400).send("Error deleting question");
  }
};

exports.getStudentExamStatistics = async (req, res) => {
  const studentId = req.user._id;

  try {
    // العثور على جميع امتحانات الطالب
    const studentExams = await StudentExam.find({
      student: studentId,
    }).populate("exam");

    if (!studentExams.length) {
      return res
        .status(404)
        .json({ message: "No exams found for this student" });
    }

    // حساب الإحصائيات
    const totalExams = studentExams.length;
    const totalAttempts = studentExams.reduce(
      (acc, exam) => acc + exam.attemptCount,
      0
    );
    const totalFinished = studentExams.filter((exam) => exam.finished).length;
    const totalScores = studentExams.reduce(
      (acc, exam) => acc + (exam.totalScore || 0),
      0
    );
    const averageScore = totalAttempts > 0 ? totalScores / totalAttempts : 0;

    const percentageFinished =
      totalExams > 0 ? (totalFinished / totalExams) * 100 : 0;

    const averagePercentage =
      totalAttempts > 0
        ? studentExams.reduce(
            (acc, exam) => acc + parseFloat(exam.percentage || 0),
            0
          ) / totalAttempts
        : 0;

    res.status(200).json({
      totalExams,
      totalAttempts,
      totalFinished,
      averageScore,
      percentageFinished,
      averagePercentage,
    });
  } catch (error) {
    console.error("Error fetching student exam statistics:", error);
    res
      .status(500)
      .json({ message: "Error fetching student exam statistics." });
  }
};

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
        (acc, exam) => acc + (exam.totalScore || 0),
        0
      );
      const averageScore = totalAttempts > 0 ? totalScores / totalAttempts : 0;

      const percentageFinished =
        totalExams > 0 ? (totalFinished / totalExams) * 100 : 0;

      const averagePercentage =
        totalAttempts > 0
          ? studentExams.reduce(
              (acc, exam) => acc + parseFloat(exam.percentage || 0),
              0
            ) / totalAttempts
          : 0;

      return {
        examId: exam._id,
        title: exam.title,
        totalExams,
        totalAttempts,
        totalFinished,
        averageScore,
        percentageFinished,
        averagePercentage,
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
exports.getSingleExamAdmin = expressAsyncHandler(async (req, res) => {
  const { examId } = req.params;

  try {
    const exam = await Exam.findById(examId).populate("questions");

    if (!exam) {
      return res.status(404).send("Exam not found");
    }

    res.send(exam);
  } catch (error) {
    console.error("Error retrieving exam:", error);
    res.status(500).send("Error retrieving exam");
  }
});
// Get single question without any access check for admin
exports.getSingleQuestionAdmin = expressAsyncHandler(async (req, res) => {
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

    res.send(question);
  } catch (error) {
    console.error("Error retrieving question:", error);
    res.status(500).send("Error retrieving question");
  }
});
