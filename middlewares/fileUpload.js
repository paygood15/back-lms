const multer = require("multer");
const ApiError = require("../utils/apiError");

// Upload single file => method return multer middleware
exports.uploadSingleFile = (fieldName) => {
  // Storage
  const multerStorage = multer.memoryStorage();

  // Accept any file type
  const multerFilter = (req, file, cb) => {
    cb(null, true);
  };

  const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

  return upload.single(fieldName);
};

// Upload multiple files => method return multer middleware
exports.uploadMultipleFiles = (fieldName) => {
  // Storage
  const multerStorage = multer.memoryStorage();

  // Accept any file type
  const multerFilter = (req, file, cb) => {
    cb(null, true);
  };

  const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

  return upload.array(fieldName);
};
