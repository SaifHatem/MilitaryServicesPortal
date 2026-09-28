const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const Application = require("../models/Application");
const ServiceRequirement = require("../models/ServiceRequirement");
const ApplicationFile = require("../models/ApplicationFile");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// إعداد التخزين
// ==========================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const applicationId = req.params.applicationId;

    const uploadPath = path.join(
      __dirname,
      "..",
      "uploads",
      "applications",
      applicationId,
    );

    fs.mkdirSync(uploadPath, {
      recursive: true,
    });

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);

    const uniqueName = crypto.randomUUID() + extension;

    cb(null, uniqueName);
  },
});

// ==========================================
// أنواع الملفات المسموح بها
// ==========================================

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// ==========================================
// فلتر الملفات
// ==========================================

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("نوع الملف غير مسموح به. المسموح: JPG, PNG, PDF, DOC, DOCX"));
  }
};

// ==========================================
// إعداد Multer
// ==========================================

const upload = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 50,
  },
});

// ==========================================
// رفع ملفات لمتطلب معين
// ==========================================

router.post(
  "/:applicationId/:requirementId",
  authenticate,

  upload.array("files", 50),

  async (req, res) => {
    try {
      const { applicationId, requirementId } = req.params;

      // التأكد أن الطلب موجود
      const application = await Application.findById(applicationId);

      if (!application) {
        return res.status(404).json({
          message: "الطلب غير موجود",
        });
      }

      if (
        req.user.role !== "admin" &&
        application.userId.toString() !== req.user.userId.toString()
      ) {
        return res.status(403).json({
          message: "ليس لديك صلاحية لرفع ملفات لهذا الطلب",
        });
      }

      // التأكد أن المتطلب موجود
      const requirement = await ServiceRequirement.findById(requirementId);

      if (!requirement) {
        return res.status(404).json({
          message: "المتطلب غير موجود",
        });
      }

      // التأكد أن المتطلب تابع لنفس الخدمة
      if (
        requirement.serviceId.toString() !== application.serviceId.toString()
      ) {
        return res.status(400).json({
          message: "هذا المتطلب لا ينتمي إلى خدمة الطلب",
        });
      }

      // التأكد أن المتطلب يسمح برفع ملفات
      if (!requirement.requiresUpload) {
        return res.status(400).json({
          message: "هذا المتطلب لا يحتاج إلى رفع ملفات",
        });
      }

      // التأكد من وجود ملفات
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          message: "من فضلك اختر ملفًا واحدًا على الأقل",
        });
      }

      // عدد الملفات الموجودة بالفعل
      const existingFiles = await ApplicationFile.countDocuments({
        applicationId,
        requirementId,
      });

      const totalFiles = existingFiles + req.files.length;

      // التأكد من الحد الأقصى
      if (totalFiles > requirement.maxFiles) {
        // حذف الملفات التي تم رفعها للتو
        for (const file of req.files) {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }

        return res.status(400).json({
          message: `هذا المتطلب يسمح بحد أقصى ${requirement.maxFiles} ملف`,
        });
      }

      // حفظ بيانات الملفات في MongoDB
      const savedFiles = [];

      for (const file of req.files) {
        const applicationFile = await ApplicationFile.create({
          applicationId,

          requirementId,

          originalName: file.originalname,

          storedName: file.filename,

          filePath: file.path,

          mimeType: file.mimetype,

          size: file.size,
        });

        savedFiles.push(applicationFile);
      }

      res.status(201).json({
        message: "تم رفع الملفات بنجاح",

        files: savedFiles,
      });
    } catch (error) {
      console.error(error);

      // حذف الملفات لو حصل خطأ
      if (req.files) {
        for (const file of req.files) {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }

      res.status(500).json({
        message: error.message || "حدث خطأ أثناء رفع الملفات",
      });
    }
  },
);

router.get("/application/:applicationId", authenticate, async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId);

    if (!application) {
      return res.status(404).json({
        message: "الطلب غير موجود",
      });
    }

    if (
      req.user.role !== "admin" &&
      application.userId.toString() !== req.user.userId.toString()
    ) {
      return res.status(403).json({
        message: "ليس لديك صلاحية للوصول إلى ملفات هذا الطلب",
      });
    }

    const files = await ApplicationFile.find({
      applicationId: req.params.applicationId,
    })
      .populate("requirementId")
      .sort({ createdAt: 1 });

    res.json(files);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء جلب ملفات الطلب",
    });
  }
});

router.delete("/:fileId", authenticate, async (req, res) => {
  try {
    const file = await ApplicationFile.findById(req.params.fileId);

    if (!file) {
      return res.status(404).json({
        message: "الملف غير موجود",
      });
    }

    const application = await Application.findById(file.applicationId);

    if (!application) {
      return res.status(404).json({
        message: "الطلب غير موجود",
      });
    }

    if (
      req.user.role !== "admin" &&
      application.userId.toString() !== req.user.userId.toString()
    ) {
      return res.status(403).json({
        message: "ليس لديك صلاحية لحذف هذا الملف",
      });
    }

    if (application.status !== "draft") {
      return res.status(400).json({
        message: "لا يمكن حذف الملفات بعد إرسال الطلب",
      });
    }

    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }

    await ApplicationFile.findByIdAndDelete(req.params.fileId);

    res.json({
      message: "تم حذف الملف بنجاح",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء حذف الملف",
    });
  }
});

router.post("/:id/submit", async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        message: "الطلب غير موجود",
      });
    }

    if (application.status !== "draft") {
      return res.status(400).json({
        message: "لا يمكن إرسال هذا الطلب مرة أخرى",
      });
    }

    const requirements = await ServiceRequirement.find({
      serviceId: application.serviceId,
      required: true,
      requiresUpload: true,
    });

    const missingRequirements = [];

    for (const requirement of requirements) {
      const fileCount = await ApplicationFile.countDocuments({
        applicationId: application._id,
        requirementId: requirement._id,
      });

      if (fileCount < requirement.minFiles) {
        missingRequirements.push({
          requirementId: requirement._id,
          name: requirement.name,
          requiredFiles: requirement.minFiles,
          uploadedFiles: fileCount,
        });
      }
    }

    if (missingRequirements.length > 0) {
      return res.status(400).json({
        message: "لا يمكن إرسال الطلب، توجد مستندات ناقصة",
        missingRequirements,
      });
    }

    application.status = "submitted";

    await application.save();

    res.json({
      message: "تم إرسال الطلب بنجاح",
      application,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء إرسال الطلب",
    });
  }
});
module.exports = router;
