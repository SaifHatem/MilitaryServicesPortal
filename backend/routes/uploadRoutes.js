const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const Application = require("../models/Application");
const ServiceRequirement = require("../models/ServiceRequirement");
const ApplicationFile = require("../models/ApplicationFile");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

// ======================================================
// Upload folder
// ======================================================

const uploadDirectory = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

// ======================================================
// Multer
// ======================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);

    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9,
    )}${extension}`;

    cb(null, uniqueName);
  },
});

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 50,
  },

  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("نوع الملف غير مسموح به"));
    }
  },
});

// ======================================================
// رفع ملفات لمتطلب معين
// ======================================================

router.post(
  "/:applicationId/:requirementId",
  authenticate,
  upload.array("files", 50),
  async (req, res) => {
    try {
      const { applicationId, requirementId } = req.params;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          message: "لم يتم اختيار أي ملفات",
        });
      }

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

      // ======================================================
      // السماح بالرفع في المسودة أو أثناء التصحيح
      // ======================================================

      if (
        application.status !== "draft" &&
        application.status !== "needs_correction"
      ) {
        return res.status(400).json({
          message: "لا يمكن رفع مستندات في حالة الطلب الحالية",
        });
      }

      const requirement = await ServiceRequirement.findOne({
        _id: requirementId,
        serviceId: application.serviceId,
      });

      if (!requirement) {
        return res.status(404).json({
          message: "المستند المطلوب غير موجود",
        });
      }

      // ======================================================
      // لو الطلب في حالة تصحيح:
      // نحذف النسخ القديمة لهذا المستند
      // ======================================================

      if (application.status === "needs_correction") {
        const oldFiles = await ApplicationFile.find({
          applicationId,
          requirementId,
        });

        for (const oldFile of oldFiles) {
          try {
            if (oldFile.filePath) {
              const oldFilePath = path.isAbsolute(oldFile.filePath)
                ? oldFile.filePath
                : path.join(__dirname, "..", oldFile.filePath);

              if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
              }
            }
          } catch (deleteError) {
            console.error("Old file delete error:", deleteError);
          }
        }

        await ApplicationFile.deleteMany({
          applicationId,
          requirementId,
        });
      }

      // ======================================================
      // حفظ الملفات الجديدة
      // ======================================================

      const savedFiles = [];

      for (const file of req.files) {
        const applicationFile = await ApplicationFile.create({
          applicationId,
          requirementId,

          originalName: file.originalname,

          storedName: file.filename,

          filePath: path.relative(path.join(__dirname, ".."), file.path),

          mimeType: file.mimetype,

          size: file.size,
        });

        savedFiles.push(applicationFile);
      }

      // ======================================================
      // لو كان فيه correction لنفس المستند
      // نعتبره resolved
      // ======================================================

      if (application.status === "needs_correction") {
        const correction = application.corrections.find(
          (item) =>
            item.requirementId.toString() === requirementId.toString() &&
            item.status === "pending",
        );

        if (correction) {
          correction.status = "resolved";

          correction.resolvedAt = new Date();

          await application.save();
        }
      }

      res.status(201).json({
        message: "تم رفع المستندات بنجاح",
        files: savedFiles,
      });
    } catch (error) {
      console.error("Upload error:", error);

      if (error instanceof multer.MulterError) {
        return res.status(400).json({
          message: "حدث خطأ أثناء رفع الملفات: " + error.message,
        });
      }

      res.status(500).json({
        message: error.message || "حدث خطأ أثناء رفع الملفات",
      });
    }
  },
);

// ======================================================
// جلب ملفات طلب معين
// ======================================================

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
        message: "ليس لديك صلاحية للوصول إلى هذه الملفات",
      });
    }

    const files = await ApplicationFile.find({
      applicationId: req.params.applicationId,
    }).populate("requirementId");

    res.json({
      files,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء جلب الملفات",
    });
  }
});

// ======================================================
// حذف ملف
// ======================================================

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

    if (
      application.status !== "draft" &&
      application.status !== "needs_correction"
    ) {
      return res.status(400).json({
        message: "لا يمكن حذف الملف في حالة الطلب الحالية",
      });
    }

    if (file.filePath) {
      const filePath = path.isAbsolute(file.filePath)
        ? file.filePath
        : path.join(__dirname, "..", file.filePath);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await ApplicationFile.findByIdAndDelete(file._id);

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

// ==========================================
// VIEW / DOWNLOAD SINGLE FILE
// ==========================================

router.get("/file/:fileId", authenticate, async (req, res) => {
  try {
    const file = await ApplicationFile.findById(req.params.fileId).populate({
      path: "applicationId",
      select: "userId",
    });

    if (!file) {
      return res.status(404).json({
        message: "المستند غير موجود",
      });
    }

    const application = file.applicationId;

    if (!application) {
      return res.status(404).json({
        message: "الطلب المرتبط بالمستند غير موجود",
      });
    }

    // صاحب الطلب
    const isOwner =
      application.userId.toString() === req.user.userId.toString();

    // الأدمن
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "غير مصرح لك بالوصول إلى هذا المستند",
      });
    }

    // الملف مخزن عندنا في filePath
    if (!file.filePath) {
      return res.status(404).json({
        message: "مسار المستند غير موجود",
      });
    }

    const filePath = path.isAbsolute(file.filePath)
      ? file.filePath
      : path.join(__dirname, "..", file.filePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: "ملف المستند غير موجود على الخادم",
      });
    }

    // لو فيه ?download=true يبقى تحميل
    if (req.query.download === "true") {
      return res.download(filePath, file.originalName, (downloadError) => {
        if (downloadError) {
          console.error("Download file error:", downloadError);

          if (!res.headersSent) {
            return res.status(500).json({
              message: "حدث خطأ أثناء تحميل المستند",
            });
          }
        }
      });
    }

    // غير كده = عرض المستند
    res.sendFile(filePath);
  } catch (error) {
    console.error("Get file error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء فتح المستند",
    });
  }
});

module.exports = router;
