const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// دالة لتحويل الصور إلى صيغة webp
const convertToWebp = async (inputPath, outputPath) => {
  try {
    console.log(`Converting image from ${inputPath} to ${outputPath}`);
    await sharp(inputPath).webp({ quality: 80 }).toFile(outputPath);

    // تأخير حذف الملف لبضع ملي ثانية
    setTimeout(() => {
      try {
        fs.unlinkSync(inputPath);
        console.log(`Image deleted successfully: ${inputPath}`);
      } catch (unlinkErr) {
        console.error("Error deleting original image:", unlinkErr);
      }
    }, 1000); // تأخير 1000 ملي ثانية (1 ثانية)

    console.log(`Image converted successfully: ${outputPath}`);
  } catch (err) {
    console.error("Error converting image to webp:", err);
    throw new Error("Error converting image to webp");
  }
};

module.exports = convertToWebp;
