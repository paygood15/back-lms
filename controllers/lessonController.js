const expressAsyncHandler = require("express-async-handler");
const lessonModel = require("../models/lessonModel");
const doorsModel = require("../models/doorsModel");
const ApiError = require("../utils/apiError");
const LessonProgressModel = require("../models/lessonProgressModel");
const StudentCourseModel = require("../models/StudentCourseModel");

exports.getAllLessons = expressAsyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 9999; // يمكنك تغيير الافتراضي إلى أي قيمة تريدها
  const skip = (page - 1) * limit;

  const queryObj = {};
  const { title, description, price } = req.query;

  if (title) queryObj.title = { $regex: title, $options: "i" }; // فلترة العنوان بحساسية صغيرة
  if (description)
    queryObj.description = { $regex: description, $options: "i" }; // فلترة الوصف بحساسية صغيرة
  if (price) queryObj.price = price; // فلترة السعر

  const totalLessons = await lessonModel.countDocuments(queryObj);
  const lessons = await lessonModel
    .find(queryObj)
    .select("-videoLink") // استبعاد videoLink من النتائج
    .limit(limit)
    .skip(skip)
    .populate("door", "title")
    .populate("files", "title");

  res.status(200).json({
    results: lessons.length,
    pagination: {
      totalItems: totalLessons,
      totalPages: Math.ceil(totalLessons / limit),
      currentPage: page,
    },
    data: lessons,
  });
});
// الحصول على درس معين
exports.getSpecificLesson = expressAsyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const lesson = await lessonModel
    .findById(id)
    .select("-videoLink") // استبعاد videoLink من النتائج
    .populate("door", "title");

  if (!lesson) {
    return next(new ApiError(`No lesson has Id: ${id}`, 404)); // استخدام رمز الحالة الصحيح
  }

  res.status(200).json({ data: lesson });
});
// إضافة درس جديد
exports.addLesson = expressAsyncHandler(async (req, res) => {
  const { door: doorId, ...lessonData } = req.body;

  // التحقق من وجود الباب
  const door = await doorsModel.findById(doorId);
  if (!door) {
    return res.status(400).json({
      success: false,
      error: "Invalid door id",
    });
  }

  // إنشاء الدرس
  const lesson = await lessonModel.create({ ...lessonData, door: doorId });

  // تحديث الباب لإضافة الدرس الجديد
  await doorsModel.findByIdAndUpdate(
    doorId,
    { $push: { lessons: lesson._id } },
    { new: true }
  );

  res.status(201).json({ data: lesson });
});

// تحديث درس
exports.updateLesson = expressAsyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const lesson = await lessonModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  if (!lesson) {
    return next(new ApiError(`No lesson has Id: ${id}`, 404)); // استخدام رمز الحالة الصحيح
  }
  res.status(200).json({ data: lesson });
});

// حذف درس
exports.deleteLesson = expressAsyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const lesson = await lessonModel.findByIdAndDelete(id);
  if (!lesson) {
    return next(new ApiError(`No lesson has Id: ${id}`, 404)); // استخدام رمز الحالة الصحيح
  }

  // إزالة الدرس من الباب
  await doorsModel.findByIdAndUpdate(lesson.door, { $pull: { lessons: id } });

  res.status(200).json({ msg: "Lesson deleted successfully" });
});

// تسجيل مشاهدة الحصة
exports.recordLessonView = expressAsyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { lessonId } = req.body;

  // Check if lesson exists
  const lessonExists = await lessonModel.findById(lessonId); // Changed to lessonModel
  if (!lessonExists) {
    return res.status(404).json({ message: "Lesson not found" });
  }

  // Record lesson view
  await LessonProgressModel.create({ student: studentId, lesson: lessonId });

  res.status(200).json({ message: "Lesson view recorded" });
});
exports.getStudentLessonStatistics = expressAsyncHandler(async (req, res) => {
  const studentId = req.user.id;

  // العثور على الدورات والأبواب الخاصة بالطالب
  const studentCourses = await StudentCourseModel.findOne({
    student: studentId,
  }).populate({
    path: "courses",
    populate: {
      path: "doors",
      populate: {
        path: "lessons", // استخراج الدروس من الأبواب
      },
    },
  });

  if (!studentCourses) {
    return res.status(404).json({ message: "Student courses not found" });
  }

  // دمج الدروس من الأبواب في جميع الدورات
  const allLessons = studentCourses.courses.flatMap((course) =>
    course.doors.flatMap((door) => door.lessons)
  );

  // الحصول على الحصص التي شاهدها الطالب
  const seenLessons = await LessonProgressModel.find({
    student: studentId,
  }).populate({
    path: "lesson",
    select: "_id title",
  });

  const seenLessonIds = new Set(
    seenLessons.map((progress) => progress.lesson._id.toString())
  );

  // حساب عدد الدروس الكلي وعدد الدروس التي شاهدها الطالب
  const totalLessonsCount = allLessons.length;
  const seenLessonCount = allLessons.filter((lesson) =>
    seenLessonIds.has(lesson._id.toString())
  ).length;

  // حساب النسبة المئوية
  const percentageSeen =
    totalLessonsCount > 0 ? (seenLessonCount / totalLessonsCount) * 100 : 0;

  res.status(200).json({
    statistics: {
      seenLessonsCount: seenLessonCount,
      totalLessonsCount,
      percentageSeen,
    },
  });
});

exports.getAllStudentLessonStatistics = expressAsyncHandler(
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1; // Current page number
      const limit = parseInt(req.query.limit) || 10; // Number of records per page

      // العثور على جميع الطلاب والدورات والأبواب الخاصة بهم
      const studentCourses = await StudentCourseModel.find({})
        .populate({
          path: "student", // Populate the student field to get user details
          select: "name email phone", // Specify which user fields to include
        })
        .populate({
          path: "courses",
          populate: {
            path: "doors",
            populate: {
              path: "lessons", // استخراج الدروس من الأبواب
            },
          },
        });

      if (!studentCourses || studentCourses.length === 0) {
        return res.status(404).json({ message: "No student courses found" });
      }

      // إنشاء خريطة لتخزين إحصائيات كل طالب
      const studentStatistics = {};

      for (const studentCourse of studentCourses) {
        const studentId = studentCourse.student?._id.toString();
        const studentName = studentCourse.student?.name;
        const studentEmail = studentCourse.student?.email;
        const studentPhone = studentCourse.student?.phone;

        if (!studentCourse.courses || !studentCourse.courses.length) {
          console.log(`No courses found for student ${studentId}`);
          continue; // Skip this student if no courses are found
        }

        // دمج الدروس من الأبواب في جميع الدورات
        const allLessons = studentCourse.courses.flatMap((course) => {
          if (!course.doors || !course.doors.length) {
            console.log(`No doors found for course ${course._id}`);
            return [];
          }
          return course.doors.flatMap((door) => {
            if (!door.lessons || !door.lessons.length) {
              console.log(`No lessons found for door ${door._id}`);
              return [];
            }
            return door.lessons;
          });
        });

        // الحصول على الحصص التي شاهدها الطالب
        const seenLessons = await LessonProgressModel.find({
          student: studentId,
        }).populate({
          path: "lesson",
          select: "_id title",
        });

        const seenLessonIds = new Set(
          seenLessons.map((progress) => progress.lesson._id.toString())
        );

        // حساب عدد الدروس الكلي وعدد الدروس التي شاهدها الطالب
        const totalLessonsCount = allLessons.length;
        const seenLessonCount = allLessons.filter((lesson) =>
          seenLessonIds.has(lesson._id.toString())
        ).length;

        // حساب النسبة المئوية
        const percentageSeen =
          totalLessonsCount > 0
            ? (seenLessonCount / totalLessonsCount) * 100
            : 0;

        studentStatistics[studentId] = {
          name: studentName,
          email: studentEmail,
          phone: studentPhone,
          seenLessonsCount: seenLessonCount,
          totalLessonsCount,
          percentageSeen,
        };
      }

      // Pagination
      const studentsArray = Object.entries(studentStatistics); // Convert object to array for pagination
      const totalItems = studentsArray.length;
      const totalPages = Math.ceil(totalItems / limit);
      const paginatedItems = studentsArray.slice(
        (page - 1) * limit,
        page * limit
      );

      res.status(200).json({
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
        },
        statistics: Object.fromEntries(paginatedItems), // Convert array back to object
      });
    } catch (error) {
      console.error("Error in getAllStudentLessonStatistics:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }
);
