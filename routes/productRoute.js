const express = require("express");
const {
  getAllDoors,
  addDoor,
  getSpecificDoor,
  deleteDoor,
  updateDoor,
  getDoorsInCourse,
} = require("../controllers/productController");
const authController = require("../controllers/authController");

const router = express.Router();

router
  .route("/")
  .get(getAllDoors)
  .post(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    addDoor
  );
router.route("/course/:courseId").get(getDoorsInCourse);
router
  .route("/:id")
  .get(getSpecificDoor)
  .delete(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    deleteDoor
  )
  .put(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    updateDoor
  );
module.exports = router;
