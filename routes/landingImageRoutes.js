const express = require("express");
const {
  createLandingImage,
  getAllLandingImages,
  getLandingImage,
  updateLandingImage,
  deleteLandingImage,
uploadLandingImages,
resizeImages
} = require("../controllers/landingImageController");

const router = express.Router();

// Route to handle image upload, resizing, and creation
router
  .route("/")
  .post(uploadLandingImages, resizeImages, createLandingImage)
  .get(getAllLandingImages);

// Routes to handle single image operations
router
  .route("/:id")
  .get(getLandingImage)
  .put(uploadLandingImages, resizeImages, updateLandingImage)
  .delete(deleteLandingImage);

module.exports = router;
