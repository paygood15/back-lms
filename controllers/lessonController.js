const expressAsyncHandler = require("express-async-handler");
const lessonModel = require("../models/lessonModel");
const doorsModel = require("../models/doorsModel");
const ApiError = require("../utils/apiError");
const LessonProgressModel = require("../models/lessonProgressModel");
const StudentCourseModel = require("../models/StudentCourseModel");
const DoorModel = require("../models/doorsModel");
const mongoose = require("mongoose");

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
    .populate("door", "title")
    .populate("files", "title");

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
exports.getLessonsInDoor = expressAsyncHandler(async (req, res, next) => {
  const { doorId } = req.params;

  // Extract pagination parameters from query string
  const page = parseInt(req.query.page, 10) || 1; // Default to page 1 if not provided
  const limit = parseInt(req.query.limit, 10) || 10; // Default to 10 items per page if not provided

  // Validate pagination parameters
  if (page < 1 || limit < 1) {
    return next(new ApiError("Invalid pagination parameters", 400));
  }

  // Find the door by ID and populate the lessons
  const door = await DoorModel.findById(doorId).populate({
    path: "lessons",
    select: "_id title description",
    options: {
      skip: (page - 1) * limit,
      limit: limit,
    },
    populate: [
      {
        path: "files",
        select: "title",
      },
      {
        path: "exams",
        select: "title",
      },
    ],
  });

  if (!door) {
    return next(new ApiError("Door not found", 404));
  }

  // Get total number of lessons for pagination metadata
  const totalLessons = await DoorModel.countDocuments({
    _id: doorId,
    lessons: { $exists: true },
  });

  res.status(200).json({
    status: "success",
    data: {
      lessons: door.lessons,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalLessons / limit),
        totalLessons,
      },
    },
  });
});
exports.getLessonStatistics = expressAsyncHandler(async (req, res, next) => {
  const { lessonId } = req.params;
  const page = parseInt(req.query.page, 10) || 1; // رقم الصفحة الحالي
  const limit = parseInt(req.query.limit, 10) || 10; // عدد العناصر في كل صفحة

  if (page < 1 || limit < 1) {
    return next(new ApiError("Invalid pagination parameters", 400));
  }

  // العثور على الدرس
  const lesson = await lessonModel.findById(lessonId).select("title");
  if (!lesson) {
    return next(new ApiError("Lesson not found", 404));
  }

  // العثور على جميع الطلاب الذين شاهدوا هذا الدرس مع التصفح
  const totalProgressRecords = await LessonProgressModel.countDocuments({
    lesson: lessonId,
  });

  const progressRecords = await LessonProgressModel.find({
    lesson: lessonId,
  })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({
      path: "student",
      select: "name randomId",
    });

  // استخدام مجموعة Set لتجنب التكرار
  const seenStudents = new Set();
  const uniqueStudents = [];

  progressRecords.forEach((record) => {
    // تحقق مما إذا كان السجل يحتوي على طالب
    if (record.student) {
      const studentId = record.student._id.toString(); // تحويل إلى نص لضمان التميز
      if (!seenStudents.has(studentId)) {
        seenStudents.add(studentId);
        uniqueStudents.push({
          name: record.student.name,
          randomId: record.student.randomId,
          StartTime: record.videoStartTime, // إضافة وقت البدء
          EndTime: record.videoEndTime, // إضافة وقت التوقف
          totalTime: record.videoDuration,
          Progress: record.videoProgress, // إضافة نسبة المشاهدة
        });
      }
    }
  });

  res.status(200).json({
    lesson: lesson.title,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalProgressRecords / limit),
      totalRecords: totalProgressRecords,
      recordsPerPage: limit,
    },
    students: uniqueStudents,
  });
});

exports.recordPlaybackEvent = expressAsyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { lessonId, eventType, position } = req.body;

  // Define fixed event types
  const validEventTypes = ["play", "pause", "stop"];
  if (!validEventTypes.includes(eventType)) {
    return res.status(400).json({ message: "Invalid event type" });
  }

  const progress = await LessonProgressModel.findOne({
    student: studentId,
    lesson: lessonId,
  });

  if (!progress) {
    return res.status(404).json({ message: "Progress record not found" });
  }

  const now = new Date();
  const lastEvent = progress.playbackEvents[progress.playbackEvents.length - 1];

  // Calculate time watched if the previous event was 'play'
  if (
    lastEvent &&
    lastEvent.type === "play" &&
    (eventType === "pause" || eventType === "stop")
  ) {
    const timeWatched = (now - lastEvent.timestamp) / 1000; // Time in seconds
    progress.totalTimeWatched += timeWatched;
    progress.videoEndTime = now; // Update end time
  }

  // Set the video start time only on the first 'play' event
  if (eventType === "play" && !progress.videoStartTime) {
    progress.videoStartTime = now;
  }

  // Check if this event has already been recorded to avoid duplication
  if (
    lastEvent &&
    lastEvent.type === eventType &&
    lastEvent.position === position
  ) {
    return res.status(200).json({ message: "Playback event already recorded" });
  }

  // Add the playback event
  progress.playbackEvents.push({
    timestamp: now,
    type: eventType,
    position,
  });

  // Recalculate progress percentage
  progress.calculateProgress();

  await progress.save();

  res.status(200).json({ message: "Playback event recorded" });
});

exports.updateVideoProgress = expressAsyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { lessonId, currentPosition, totalDuration } = req.body;

  const progress = await LessonProgressModel.findOne({
    student: studentId,
    lesson: lessonId,
  });

  if (!progress) {
    return res.status(404).json({ message: "Progress record not found" });
  }

  // Update total video duration
  progress.videoDuration = totalDuration;

  // Recalculate progress percentage based on totalTimeWatched
  progress.calculateProgress();

  await progress.save();

  res.status(200).json({ message: "Video progress updated" });
});

exports.getStudentLessonProgress = expressAsyncHandler(
  async (req, res, next) => {
    const studentId = req.user.id;
    const { lessonId } = req.params;

    // Validate IDs
    if (
      !mongoose.Types.ObjectId.isValid(studentId) ||
      !mongoose.Types.ObjectId.isValid(lessonId)
    ) {
      return next(new ApiError("Invalid student or lesson ID", 400));
    }

    // Find the student's lesson progress
    const progressRecord = await LessonProgressModel.findOne({
      student: studentId,
      lesson: lessonId,
    }).populate({
      path: "student",
      select: "name randomId",
    });

    if (!progressRecord) {
      return next(new ApiError("Progress record not found", 404));
    }

    // Calculate total time watched
    let totalTimeWatched = 0;
    let lastPlayTime = progressRecord.videoStartTime;

    if (progressRecord.playbackEvents.length > 0) {
      for (let i = 0; i < progressRecord.playbackEvents.length; i++) {
        const event = progressRecord.playbackEvents[i];
        if (event.type === "play") {
          if (lastPlayTime) {
            totalTimeWatched += (event.timestamp - lastPlayTime) / 1000; // Convert milliseconds to seconds
          }
          lastPlayTime = event.timestamp;
        } else if (event.type === "stop") {
          totalTimeWatched += (event.timestamp - lastPlayTime) / 1000; // Convert milliseconds to seconds
          lastPlayTime = null; // Reset for next session
        }
      }
    }

    // Calculate video progress percentage
    const progressPercentage =
      (totalTimeWatched / progressRecord.videoDuration) * 100;

    res.status(200).json({
      student: {
        name: progressRecord.student.name,
        randomId: progressRecord.student.randomId,
      },
      lesson: progressRecord.lesson,
      videoProgress: {
        startTime: progressRecord.videoStartTime,
        endTime: progressRecord.videoEndTime,
        duration: progressRecord.videoDuration,
        progressPercentage: Math.min(progressPercentage, 100), // Ensure it doesn't exceed 100%
        totalTimeWatched,
      },
      playbackEvents: progressRecord.playbackEvents,
    });
  }
);
