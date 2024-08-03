const express = require("express");
const morgan = require("morgan");
const path = require("path");
const compression = require("compression");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config({
  path: "./config.env",
});
// const examsController = require("./controllers/examsController");
const categoryRoute = require(`./routes/categoryRoute`);
const subCategoryRoute = require(`./routes/subCategoryRoute`);
const productRoute = require(`./routes/productRoute`);
const lessonRoute = require(`./routes/lessonRoute`);
const userRoute = require(`./routes/userRoute`);
const authRoute = require(`./routes/authRoute`);
const studentCourseRoute = require(`./routes/studentCourseRoute`);
const orderRoute = require(`./routes/orderRoute`);
const statsRoute = require(`./routes/statsRoute`);
const examsRoute = require("./routes/examsRoute");
const lessonFilesRoutes = require("./routes/lessonFilesRoutes");
const couponRoute = require("./routes/couponRoute");
const sectionRoute = require("./routes/sectionRoute");
const accessCodeRoutes = require("./routes/accessCodeRoutes");


const dbConnection = require("./config/database");
const ApiError = require("./utils/apiError");
const globalError = require("./middlewares/errorMiddleware");
const Exam = require("./models/examModel");
// connect DB
dbConnection();
const app = express();
app.use(express.json());

if (process.env.NODE_ENV === "development") {
  app.use(morgan(`dev`));
}
app.use(compression());
app.use(cors());
app.options("*", cors());
app.enable("trust proxy");

// routes
app.use("/api/v1/categories", categoryRoute);
app.use("/api/v1/subcategories", subCategoryRoute);
app.use("/api/v1/products", productRoute);
app.use("/api/v1/lessons", lessonRoute);
app.use("/api/v1/users", userRoute);
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/orders", orderRoute);
app.use("/api/v1/studentCourse", studentCourseRoute);
app.use("/api/v1/statistics", statsRoute);
app.use("/api/v1/exams", examsRoute);
app.use("/api/v1/lessonFiles", lessonFilesRoutes);
app.use("/api/v1/coupons", couponRoute);
app.use("/api/v1/sections", sectionRoute);
app.use("/api/v1/accessCode", accessCodeRoutes);


// setInterval(async () => {
//   await examsController.checkExpiredExams();
// }, 60000); // فحص كل دقيقة
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.all("*", (req, res, next) => {
  next(new ApiError(`can't find this route: ${req.originalUrl}`, 400));
});

// Global Handling Middleware
app.use(globalError);
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`App Running On Port:${PORT}`);
});
