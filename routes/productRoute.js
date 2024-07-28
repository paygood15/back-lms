const express = require("express");
const { getAllDoors, addDoor, getSpecificDoor, deleteDoor, updateDoor } = require("../controllers/productController");
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
