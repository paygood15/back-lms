const express = require("express");
const multer = require("multer");

const {
  addSubCategory,
  getAllSubCategories,
  getSpecificSubCategory,
  updateSubCategory,
  deleteSubCategory,
  addDescription,
  updateDescription,
  deleteDescription,
  uploadSubCategoryImage,
  resizeImage,
  getSubcategoryInCategory,
} = require("../controllers/subCategoryController");
const {
  createSubCategoryValidator,
  getSubCategoryValidator,
  updateSubCategoryValidator,
  deleteSubCategoryValidator,
} = require("../utils/validators/subCategoryValidator");
const authController = require("../controllers/authController");

const router = express.Router({ mergeParams: true });

router.route(`/`).get(getAllSubCategories).post(
  // createSubCategoryValidator,
  uploadSubCategoryImage,
  resizeImage,
  authController.auth,
  authController.allowedTo("admin", "manager"),
  addSubCategory
);
router.route("/category/:categoryId").get(getSubcategoryInCategory);
router
  .route("/:id")
  .get(getSubCategoryValidator, getSpecificSubCategory)
  .put(
    uploadSubCategoryImage,
    resizeImage,
    authController.auth,
    authController.allowedTo("admin", "manager"),
    updateSubCategoryValidator,
    updateSubCategory
  )
  .delete(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    deleteSubCategoryValidator,
    deleteSubCategory
  );
// Description
router
  .route("/:id/descriptions")
  .post(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    addDescription
  );
router
  .route("/:id/descriptions/:descriptionId")
  .put(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    updateDescription
  )
  .delete(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    deleteDescription
  );

module.exports = router;
