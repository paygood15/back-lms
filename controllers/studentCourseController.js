const expressAsyncHandler = require("express-async-handler");
const StudentCourseModel = require("../models/StudentCourseModel");
const DoorsModel = require("../models/doorsModel");
const subCategoryModel = require("../models/subCategoryModel");
const LessonModel = require("../models/lessonModel"); // تأكد من أن مسار النموذج صحيح
const ExamModel = require("../models/examModel"); // تأكد من أن مسار النموذج صحيح

exports.getLoggedUserCourses = expressAsyncHandler(async (req, res) => {
  const studentId = req.user.id;

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // الحصول على الدورات الخاصة بالطالب
  const studentCourses = await StudentCourseModel.findOne({
    student: studentId,
  })
    .populate({
      path: "courses",
      select: "title doors",
      populate: {
        path: "doors",
        select: "title lessons",
        populate: {
          path: "lessons",
          select: "title description price ",
        },
        model: "Door",
      },
      model: "subCategory",
    })
    .populate({
      path: "doors",
      select: "title lessons",
      populate: {
        path: "lessons",
        select: "title description price videoLink files",
        populate: {
          path: "files",
          select: "title file",
          model: "LessonFile",
        },
      },
      model: "Door",
    })
    .exec();

  if (!studentCourses) {
    return res
      .status(404)
      .json({ message: "No courses found for this student" });
  }

  // حساب عدد الكورسات والابواب
  const numberOfCourses = studentCourses.courses.length;
  const numberOfDoors = studentCourses.doors.length;

  // للحصول على الدورات والأبواب مع الباجنيشن
  const coursesWithPagination = studentCourses.courses.slice(
    skip,
    skip + limit
  );
  const doorsWithPagination = studentCourses.doors.slice(skip, skip + limit);

  res.status(200).json({
    statistics: {
      numberOfCourses,
      numberOfDoors,
    },
    pagination: {
      totalCourses: numberOfCourses,
      totalDoors: numberOfDoors,
      currentPage: page,
      totalPagesCourses: Math.ceil(numberOfCourses / limit),
      totalPagesDoors: Math.ceil(numberOfDoors / limit),
    },
    data: {
      courses: coursesWithPagination,
      doors: doorsWithPagination,
    },
  });
});
/**
 * @description Get details of a specific course or door by its ID
 * @route GET /api/course/:courseId
 * @access Public
 */
exports.getCourseDetails = expressAsyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user._id;

  // Find the door if the ID matches a door
  const door = await DoorsModel.findById(courseId).populate({
    path: "lessons",
    select: "title description files exams videoLink",
    populate: [
      {
        path: "files",
        select: "title file",
        model: "LessonFile",
      },
      {
        path: "exams",
        select: "title questions",
        model: "Exam",
        populate: {
          path: "questions",
          select: "text answer score",
        },
      },
    ],
  });

  if (door) {
    // Find student courses
    const studentCourses = await StudentCourseModel.findOne({
      student: studentId,
    });

    if (!studentCourses) {
      return res.status(404).json({ message: "Student courses not found" });
    }

    // Check if the door is in the student's doors list
    const isDoorAvailable = studentCourses.doors.includes(courseId);
    if (!isDoorAvailable) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.status(200).json(door);
  }

  // Find the course if the ID matches a course
  const course = await subCategoryModel.findById(courseId).populate({
    path: "doors",
    select: "title description",
    populate: {
      path: "lessons",
      select: "title description files exams videoLink",
      populate: [
        {
          path: "files",
          select: "title file",
          model: "LessonFile",
        },
        {
          path: "exams",
          select: "title questions",
          model: "Exam",
          populate: {
            path: "questions",
            select: "text answer score",
          },
        },
      ],
    },
  });

  if (course) {
    // Find student courses
    const studentCourses = await StudentCourseModel.findOne({
      student: studentId,
    });

    if (!studentCourses) {
      return res.status(404).json({ message: "Student courses not found" });
    }

    // Check if the course is in the student's courses list
    const isCourseAvailable = studentCourses.courses.includes(courseId);
    if (!isCourseAvailable) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.status(200).json(course);
  }

  return res.status(404).json({ message: "Course or Door not found" });
});

/**
 * @description Get courses of a specific student
 * @route GET /api/student/:studentId/courses
 * @access Public
 */
exports.getStudentCourses = expressAsyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const studentCourses = await StudentCourseModel.findOne({
    student: studentId,
  })
    .populate({
      path: "courses",
      select: "title doors", // اختر الحقول المطلوبة
      populate: {
        path: "doors",
        select: "title description", // تحديد الحقول التي تريد عرضها
        populate: {
          path: "lessons",
          select: "title description", // تحديد الحقول التي تريد عرضها
        },
        model: "Door", // تأكد من أن الاسم يتطابق مع اسم النموذج
      },
      model: "subCategory", // تأكد من أن الاسم يتطابق مع اسم النموذج
    })
    .populate({
      path: "doors",
      select: "title description", // تحديد الحقول التي تريد عرضها
      populate: {
        path: "lessons",
        select: "title description", // تحديد الحقول التي تريد عرضها
      },
      model: "Door", // تأكد من أن الاسم يتطابق مع اسم النموذج
    })
    .exec();

  if (!studentCourses) {
    return res
      .status(404)
      .json({ message: "No courses found for this student" });
  }

  res.status(200).json(studentCourses);
});
