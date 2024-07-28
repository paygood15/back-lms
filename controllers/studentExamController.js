const StudentExam = require("../models/studentExamModel");
const Exam = require("../models/examModel");

exports.startStudentExam = async (req, res) => {
  const { examId } = req.params;
  const studentId = req.user._id; // Assuming user ID is stored in req.user

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
    });
  }

  const exam = await Exam.findById(examId);
  if (!exam) {
    return res.status(404).send("Exam not found");
  }

  const duration = req.body.duration; // Duration in minutes
  studentExam.startTime = new Date();
  studentExam.endTime = new Date(
    studentExam.startTime.getTime() + duration * 60000
  );

  await studentExam.save();
  res.send(studentExam);
};
exports.answerStudentQuestion = async (req, res) => {
  const { examId, questionId } = req.params;
  const studentId = req.user._id;

  const studentExam = await StudentExam.findOne({
    exam: examId,
    student: studentId,
  });
  if (!studentExam) {
    return res.status(404).send("Student exam not found");
  }

  const exam = await Exam.findById(examId);
  if (!exam) {
    return res.status(404).send("Exam not found");
  }

  const question = exam.questions.id(questionId);
  if (!question) {
    return res.status(404).send("Question not found");
  }

  const now = new Date();
  if (studentExam.finished || now > studentExam.endTime) {
    return res.status(400).send("Exam is already finished or time expired.");
  }

  const existingAnswer = studentExam.answers.id(questionId);
  if (existingAnswer) {
    existingAnswer.answer = req.body.answer;
  } else {
    studentExam.answers.push({
      questionId: questionId,
      answer: req.body.answer,
      score: question.answer === req.body.answer ? 1 : 0,
    });
  }

  studentExam.totalScore = studentExam.answers.reduce(
    (total, ans) => total + ans.score,
    0
  );
  await studentExam.save();

  res.send(studentExam);
};
exports.finishStudentExam = async (req, res) => {
  const { examId } = req.params;
  const studentId = req.user._id;

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
};
