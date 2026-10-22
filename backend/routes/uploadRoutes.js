const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const Application = require("../models/Application");
const ServiceRequirement = require("../models/ServiceRequirement");
const ApplicationFile = require("../models/ApplicationFile");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ============================================================
// Multer Storage
// ============================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);

    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9,
    )}${extension}`;

    cb(null, uniqueName);
  },
});

// ============================================================
// Allowed File Types
// ============================================================

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// ============================================================
// Multer Configuration
// ============================================================

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 50,
  },

  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new Error("نوع الملف غير مسموح. المسموح: JPG, PNG, PDF, DOC, DOCX"),
      );
    }

    cb(null, true);
  },
});

// ============================================================
// Upload Files
// Owner only
// ============================================================

router.post(
  "/:applicationId/:requirementId",
  authenticate,

  // Validate before Multer saves files
  async (req, res, next) => {
    try {
      const { applicationId, requirementId } = req.params;

      const application = await Application.findById(applicationId);

      if (!application) {
        return res.status(404).json({
          message: "الطلب غير موجود",
        });
      }

      const isOwner =
        application.userId.toString() === req.user.userId.toString();

      if (!isOwner) {
        return res.status(403).json({
          message: "ليس لديك صلاحية لإضافة ملفات لهذا الطلب",
        });
      }

      if (
        application.status !== "draft" &&
        application.status !== "needs_correction"
      ) {
        return res.status(400).json({
          message: "لا يمكن رفع ملفات على طلب في حالته الحالية",
        });
      }

      const requirement = await ServiceRequirement.findOne({
        _id: requirementId,
        serviceId: application.serviceId,
      });

      if (!requirement) {
        return res.status(404).json({
          message: "المستند المحدد غير موجود ضمن متطلبات الخدمة",
        });
      }

      if (
        requirement.type === "info" ||
        requirement.type === "text" ||
        requirement.requiresUpload === false
      ) {
        return res.status(400).json({
          message: "هذا المتطلب لا يحتاج إلى رفع ملفات",
        });
      }

      // During correction, only allow requirements with pending corrections
      if (application.status === "needs_correction") {
        const pendingCorrection = application.corrections?.find(
          (correction) =>
            correction.requirementId.toString() ===
              requirement._id.toString() && correction.status === "pending",
        );

        if (!pendingCorrection) {
          return res.status(400).json({
            message:
              "لا يمكنك رفع ملف لهذا المستند لأنه غير مطلوب تصحيحه حاليًا",
          });
        }
      }

      req.application = application;
      req.requirement = requirement;

      next();
    } catch (error) {
      console.error("Upload pre-validation error:", error);

      return res.status(500).json({
        message: "حدث خطأ أثناء التحقق من الطلب",
      });
    }
  },

  // Run Multer only after authorization
  (req, res, next) => {
    upload.array("files", 50)(req, res, (uploadError) => {
      if (uploadError) {
        console.error("Multer upload error:", uploadError);

        if (req.files) {
          for (const file of req.files) {
            try {
              if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            } catch (cleanupError) {
              console.error("Multer cleanup error:", cleanupError);
            }
          }
        }

        return res.status(400).json({
          message: uploadError.message || "حدث خطأ أثناء رفع الملفات",
        });
      }

      next();
    });
  },

  // Save uploaded files
  async (req, res) => {
    try {
      const application = req.application;
      const requirement = req.requirement;
      const uploadedFiles = req.files || [];

      if (uploadedFiles.length === 0) {
        return res.status(400).json({
          message: "من فضلك اختر ملفًا واحدًا على الأقل",
        });
      }

      const existingFiles = await ApplicationFile.find({
        applicationId: application._id,
        requirementId: requirement._id,
      });

      const maxFiles =
        requirement.allowMultiple === true ? requirement.maxFiles || 1 : 1;

      const previousFileCount =
        application.status === "needs_correction" ? 0 : existingFiles.length;

      const finalFileCount = previousFileCount + uploadedFiles.length;

      if (finalFileCount > maxFiles) {
        for (const file of uploadedFiles) {
          try {
            if (file.path && fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          } catch (deleteError) {
            console.error("Error deleting invalid uploaded file:", deleteError);
          }
        }

        return res.status(400).json({
          message: `لا يمكن رفع أكثر من ${maxFiles} ملف لهذا المستند`,
          maxFiles,
        });
      }

      // Replace old files when correcting this requirement
      if (application.status === "needs_correction") {
        for (const oldFile of existingFiles) {
          try {
            if (oldFile.filePath) {
              const oldFilePath = path.isAbsolute(oldFile.filePath)
                ? oldFile.filePath
                : path.join(__dirname, "..", oldFile.filePath);

              if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
              }
            }
          } catch (fileError) {
            console.error("Error deleting old file:", fileError);
          }
        }

        await ApplicationFile.deleteMany({
          applicationId: application._id,
          requirementId: requirement._id,
        });
      }

      const savedFiles = [];

      for (const file of uploadedFiles) {
        const applicationFile = await ApplicationFile.create({
          applicationId: application._id,
          requirementId: requirement._id,
          originalName: file.originalname,
          storedName: file.filename,
          filePath: path.relative(path.join(__dirname, ".."), file.path),
          mimeType: file.mimetype,
          size: file.size,
        });

        savedFiles.push(applicationFile);
      }

      // Resolve matching corrections after successful upload
      if (application.status === "needs_correction") {
        const matchingCorrections =
          application.corrections?.filter(
            (correction) =>
              correction.requirementId.toString() ===
                requirement._id.toString() && correction.status === "pending",
          ) || [];

        for (const correction of matchingCorrections) {
          correction.status = "resolved";
          correction.resolvedAt = new Date();
        }

        await application.save();
      }

      return res.status(201).json({
        message: "تم رفع الملفات بنجاح",
        files: savedFiles,
      });
    } catch (error) {
      console.error("Upload error:", error);

      if (req.files) {
        for (const file of req.files) {
          try {
            if (file.path && fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          } catch (cleanupError) {
            console.error("Cleanup error:", cleanupError);
          }
        }
      }

      return res.status(500).json({
        message: "حدث خطأ أثناء رفع الملفات",
      });
    }
  },
);

// ============================================================
// Get Application Files
// Owner OR Reviewer OR Admin
// ============================================================

router.get("/application/:applicationId", authenticate, async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId);

    if (!application) {
      return res.status(404).json({
        message: "الطلب غير موجود",
      });
    }

    const isOwner =
      application.userId.toString() === req.user.userId.toString();

    const canReview = ["admin", "reviewer"].includes(req.user.role);

    if (!isOwner && !canReview) {
      return res.status(403).json({
        message: "ليس لديك صلاحية للوصول إلى ملفات هذا الطلب",
      });
    }

    const files = await ApplicationFile.find({
      applicationId: application._id,
    }).populate("requirementId");

    return res.json({ files });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "حدث خطأ أثناء جلب الملفات",
    });
  }
});

// ============================================================
// Delete File
// Owner only
// ============================================================

router.delete("/:fileId", authenticate, async (req, res) => {
  try {
    const file = await ApplicationFile.findById(req.params.fileId).populate({
      path: "applicationId",
      populate: {
        path: "userId",
        select: "_id",
      },
    });

    if (!file) {
      return res.status(404).json({
        message: "الملف غير موجود",
      });
    }

    const application = file.applicationId;

    if (!application || !application.userId) {
      return res.status(404).json({
        message: "الطلب أو المستخدم المرتبط بالملف غير موجود",
      });
    }

    const isOwner =
      application.userId._id.toString() === req.user.userId.toString();

    if (!isOwner) {
      return res.status(403).json({
        message: "ليس لديك صلاحية لحذف هذا الملف",
      });
    }

    if (
      application.status !== "draft" &&
      application.status !== "needs_correction"
    ) {
      return res.status(400).json({
        message: "لا يمكن حذف الملفات بعد إرسال الطلب",
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

    return res.json({
      message: "تم حذف الملف بنجاح",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "حدث خطأ أثناء حذف الملف",
    });
  }
});

// ============================================================
// View / Download File
// Owner OR Reviewer OR Admin
// ============================================================

router.get("/file/:fileId", authenticate, async (req, res) => {
  try {
    const file = await ApplicationFile.findById(req.params.fileId).populate({
      path: "applicationId",
      populate: {
        path: "userId",
        select: "_id",
      },
    });

    if (!file) {
      return res.status(404).json({
        message: "الملف غير موجود",
      });
    }

    const application = file.applicationId;

    if (!application || !application.userId) {
      return res.status(404).json({
        message: "الطلب أو المستخدم المرتبط بالملف غير موجود",
      });
    }

    const isOwner =
      application.userId._id.toString() === req.user.userId.toString();

    const canReview = ["admin", "reviewer"].includes(req.user.role);

    if (!isOwner && !canReview) {
      return res.status(403).json({
        message: "ليس لديك صلاحية للوصول إلى هذا الملف",
      });
    }

    const filePath = path.isAbsolute(file.filePath)
      ? file.filePath
      : path.join(__dirname, "..", file.filePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: "الملف غير موجود على الخادم",
      });
    }

    if (req.query.download === "true") {
      return res.download(filePath, file.originalName);
    }

    return res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "حدث خطأ أثناء فتح الملف",
    });
  }
});

module.exports = router;
