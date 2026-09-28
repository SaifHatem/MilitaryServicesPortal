// const express = require("express");
// const fs = require("fs");
// const path = require("path");
// const multer = require("multer");

// const Application = require("../models/Application");
// const ServiceRequirement = require("../models/ServiceRequirement");
// const ApplicationFile = require("../models/ApplicationFile");

// const authenticate = require("../middleware/authMiddleware");

// const router = express.Router();

// const uploadDir = path.join(__dirname, "..", "uploads");

// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// // =====================================================
// // Multer Storage
// // =====================================================

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, uploadDir);
//   },

//   filename: (req, file, cb) => {
//     const extension = path.extname(file.originalname);

//     const uniqueName = `${Date.now()}-${Math.round(
//       Math.random() * 1e9,
//     )}${extension}`;

//     cb(null, uniqueName);
//   },
// });

// // =====================================================
// // Allowed File Types
// // =====================================================

// const allowedMimeTypes = [
//   "image/jpeg",
//   "image/png",
//   "application/pdf",
//   "application/msword",
//   "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
// ];

// // =====================================================
// // Multer Configuration
// // =====================================================

// const upload = multer({
//   storage,

//   limits: {
//     fileSize: 10 * 1024 * 1024,
//     files: 50,
//   },

//   fileFilter: (req, file, cb) => {
//     if (!allowedMimeTypes.includes(file.mimetype)) {
//       return cb(
//         new Error("نوع الملف غير مسموح. المسموح: JPG, PNG, PDF, DOC, DOCX"),
//       );
//     }

//     cb(null, true);
//   },
// });

// // =====================================================
// // Upload Files
// // =====================================================
// //
// // Important:
// // We check authentication, ownership, status and
// // requirement BEFORE Multer saves anything.
// // =====================================================

// router.post(
//   "/:applicationId/:requirementId",
//   authenticate,

//   async (req, res, next) => {
//     try {
//       const { applicationId, requirementId } = req.params;

//       // ==========================================
//       // Find Application
//       // ==========================================

//       const application = await Application.findById(applicationId);

//       if (!application) {
//         return res.status(404).json({
//           message: "الطلب غير موجود",
//         });
//       }

//       // ==========================================
//       // Owner Only
//       // ==========================================

//       const isOwner =
//         application.userId.toString() === req.user.userId.toString();

//       if (!isOwner) {
//         return res.status(403).json({
//           message: "ليس لديك صلاحية لإضافة ملفات لهذا الطلب",
//         });
//       }

//       // ==========================================
//       // Check Application Status
//       // ==========================================

//       if (
//         application.status !== "draft" &&
//         application.status !== "needs_correction"
//       ) {
//         return res.status(400).json({
//           message: "لا يمكن رفع ملفات على طلب في حالته الحالية",
//         });
//       }

//       // ==========================================
//       // Find Requirement
//       // ==========================================

//       const requirement = await ServiceRequirement.findOne({
//         _id: requirementId,
//         serviceId: application.serviceId,
//       });

//       if (!requirement) {
//         return res.status(404).json({
//           message: "المستند المحدد غير موجود ضمن متطلبات الخدمة",
//         });
//       }

//       // ==========================================
//       // Check Requirement Type
//       // ==========================================

//       if (
//         requirement.type === "info" ||
//         requirement.type === "text" ||
//         requirement.requiresUpload === false
//       ) {
//         return res.status(400).json({
//           message: "هذا المتطلب لا يحتاج إلى رفع ملفات",
//         });
//       }

//       // ==========================================
//       // Save Data for Next Middleware
//       // ==========================================

//       req.application = application;
//       req.requirement = requirement;

//       next();
//     } catch (error) {
//       console.error("Upload pre-validation error:", error);

//       return res.status(500).json({
//         message: "حدث خطأ أثناء التحقق من الطلب",
//       });
//     }
//   },

//   // ==========================================
//   // Multer runs ONLY after authorization
//   // ==========================================

//   (req, res, next) => {
//     upload.array("files", 50)(req, res, (uploadError) => {
//       if (uploadError) {
//         console.error("Multer upload error:", uploadError);

//         // Cleanup any files Multer may have already created
//         if (req.files) {
//           for (const file of req.files) {
//             try {
//               if (file.path && fs.existsSync(file.path)) {
//                 fs.unlinkSync(file.path);
//               }
//             } catch (cleanupError) {
//               console.error("Multer cleanup error:", cleanupError);
//             }
//           }
//         }

//         return res.status(400).json({
//           message: uploadError.message || "حدث خطأ أثناء رفع الملفات",
//         });
//       }

//       next();
//     });
//   },

//   // ==========================================
//   // Save Uploaded Files
//   // ==========================================

//   async (req, res) => {
//     try {
//       const application = req.application;
//       const requirement = req.requirement;

//       const uploadedFiles = req.files || [];

//       // ==========================================
//       // Check Files
//       // ==========================================

//       if (uploadedFiles.length === 0) {
//         return res.status(400).json({
//           message: "من فضلك اختر ملفًا واحدًا على الأقل",
//         });
//       }

//       // ==========================================
//       // Existing Files
//       // ==========================================

//       const existingFiles = await ApplicationFile.find({
//         applicationId: application._id,
//         requirementId: requirement._id,
//       });

//       const maxFiles =
//         requirement.allowMultiple === true ? requirement.maxFiles || 1 : 1;

//       // ==========================================
//       // When correcting:
//       // old files will be replaced
//       // ==========================================

//       const previousFileCount =
//         application.status === "needs_correction" ? 0 : existingFiles.length;

//       const finalFileCount = previousFileCount + uploadedFiles.length;

//       // ==========================================
//       // Check Maximum Files
//       // ==========================================

//       if (finalFileCount > maxFiles) {
//         for (const file of uploadedFiles) {
//           try {
//             if (file.path && fs.existsSync(file.path)) {
//               fs.unlinkSync(file.path);
//             }
//           } catch (deleteError) {
//             console.error("Error deleting invalid uploaded file:", deleteError);
//           }
//         }

//         return res.status(400).json({
//           message: `لا يمكن رفع أكثر من ${maxFiles} ملف لهذا المستند`,
//           maxFiles,
//         });
//       }

//       // ==========================================
//       // Correction Flow
//       // Delete Old Files
//       // ==========================================

//       if (application.status === "needs_correction") {
//         for (const oldFile of existingFiles) {
//           try {
//             if (oldFile.filePath) {
//               const oldFilePath = path.isAbsolute(oldFile.filePath)
//                 ? oldFile.filePath
//                 : path.join(__dirname, "..", oldFile.filePath);

//               if (fs.existsSync(oldFilePath)) {
//                 fs.unlinkSync(oldFilePath);
//               }
//             }
//           } catch (fileError) {
//             console.error("Error deleting old file:", fileError);
//           }
//         }

//         await ApplicationFile.deleteMany({
//           applicationId: application._id,
//           requirementId: requirement._id,
//         });
//       }

//       // ==========================================
//       // Save Files in Database
//       // ==========================================

//       const savedFiles = [];

//       for (const file of uploadedFiles) {
//         const applicationFile = await ApplicationFile.create({
//           applicationId: application._id,
//           requirementId: requirement._id,
//           originalName: file.originalname,
//           storedName: file.filename,
//           filePath: path.relative(path.join(__dirname, ".."), file.path),
//           mimeType: file.mimetype,
//           size: file.size,
//         });

//         savedFiles.push(applicationFile);
//       }

//       // ==========================================
//       // Resolve Correction
//       // ==========================================

//       if (application.status === "needs_correction") {
//         const matchingCorrections = application.corrections.filter(
//           (correction) =>
//             correction.requirementId.toString() ===
//               requirement._id.toString() && correction.status === "pending",
//         );

//         for (const correction of matchingCorrections) {
//           correction.status = "resolved";
//           correction.resolvedAt = new Date();
//         }

//         await application.save();
//       }

//       // ==========================================
//       // Success
//       // ==========================================

//       return res.status(201).json({
//         message: "تم رفع الملفات بنجاح",
//         files: savedFiles,
//       });
//     } catch (error) {
//       console.error("Upload error:", error);

//       // ==========================================
//       // Cleanup Physical Files
//       // ==========================================

//       if (req.files) {
//         for (const file of req.files) {
//           try {
//             if (file.path && fs.existsSync(file.path)) {
//               fs.unlinkSync(file.path);
//             }
//           } catch (cleanupError) {
//             console.error("Cleanup error:", cleanupError);
//           }
//         }
//       }

//       return res.status(500).json({
//         message: "حدث خطأ أثناء رفع الملفات",
//       });
//     }
//   },
// );

// // =====================================================
// // Get Application Files
// // =====================================================

// router.get("/application/:applicationId", authenticate, async (req, res) => {
//   try {
//     const application = await Application.findById(req.params.applicationId);

//     if (!application) {
//       return res.status(404).json({
//         message: "الطلب غير موجود",
//       });
//     }

//     const isOwner =
//       application.userId.toString() === req.user.userId.toString();

//     const isAdmin = req.user.role === "admin";

//     // Owner OR Admin can view files
//     if (!isOwner && !isAdmin) {
//       return res.status(403).json({
//         message: "ليس لديك صلاحية للوصول إلى ملفات هذا الطلب",
//       });
//     }

//     const files = await ApplicationFile.find({
//       applicationId: application._id,
//     }).populate("requirementId");

//     return res.json({
//       files,
//     });
//   } catch (error) {
//     console.error(error);

//     return res.status(500).json({
//       message: "حدث خطأ أثناء جلب الملفات",
//     });
//   }
// });

// // =====================================================
// // Delete File
// // =====================================================

// router.delete("/:fileId", authenticate, async (req, res) => {
//   try {
//     const file = await ApplicationFile.findById(req.params.fileId).populate({
//       path: "applicationId",
//       populate: {
//         path: "userId",
//         select: "_id",
//       },
//     });

//     if (!file) {
//       return res.status(404).json({
//         message: "الملف غير موجود",
//       });
//     }

//     const application = file.applicationId;

//     const isOwner =
//       application.userId._id.toString() === req.user.userId.toString();

//     // Owner only can delete
//     if (!isOwner) {
//       return res.status(403).json({
//         message: "ليس لديك صلاحية لحذف هذا الملف",
//       });
//     }

//     // ==========================================
//     // Check Application Status
//     // ==========================================

//     if (
//       application.status !== "draft" &&
//       application.status !== "needs_correction"
//     ) {
//       return res.status(400).json({
//         message: "لا يمكن حذف الملفات بعد إرسال الطلب",
//       });
//     }

//     // ==========================================
//     // Delete Physical File
//     // ==========================================

//     if (file.filePath) {
//       const filePath = path.isAbsolute(file.filePath)
//         ? file.filePath
//         : path.join(__dirname, "..", file.filePath);

//       if (fs.existsSync(filePath)) {
//         fs.unlinkSync(filePath);
//       }
//     }

//     // ==========================================
//     // Delete Database Record
//     // ==========================================

//     await ApplicationFile.findByIdAndDelete(file._id);

//     return res.json({
//       message: "تم حذف الملف بنجاح",
//     });
//   } catch (error) {
//     console.error(error);

//     return res.status(500).json({
//       message: "حدث خطأ أثناء حذف الملف",
//     });
//   }
// });

// // =====================================================
// // View / Download File
// // =====================================================

// router.get("/file/:fileId", authenticate, async (req, res) => {
//   try {
//     const file = await ApplicationFile.findById(req.params.fileId).populate({
//       path: "applicationId",
//       populate: {
//         path: "userId",
//         select: "_id",
//       },
//     });

//     if (!file) {
//       return res.status(404).json({
//         message: "الملف غير موجود",
//       });
//     }

//     const application = file.applicationId;

//     const isOwner =
//       application.userId._id.toString() === req.user.userId.toString();

//     const isAdmin = req.user.role === "admin";

//     // Owner OR Admin can view/download
//     if (!isOwner && !isAdmin) {
//       return res.status(403).json({
//         message: "ليس لديك صلاحية للوصول إلى هذا الملف",
//       });
//     }

//     // ==========================================
//     // Check Physical File
//     // ==========================================

//     const filePath = path.isAbsolute(file.filePath)
//       ? file.filePath
//       : path.join(__dirname, "..", file.filePath);

//     if (!fs.existsSync(filePath)) {
//       return res.status(404).json({
//         message: "الملف غير موجود على الخادم",
//       });
//     }

//     // ==========================================
//     // Download
//     // ==========================================

//     if (req.query.download === "true") {
//       return res.download(filePath, file.originalName);
//     }

//     // ==========================================
//     // View
//     // ==========================================

//     return res.sendFile(path.resolve(filePath));
//   } catch (error) {
//     console.error(error);

//     return res.status(500).json({
//       message: "حدث خطأ أثناء فتح الملف",
//     });
//   }
// });

// module.exports = router;

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
    fileSize: 10 * 1024 * 1024, // 10 MB
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
// ============================================================

router.post(
  "/:applicationId/:requirementId",

  authenticate,

  // ----------------------------------------------------------
  // Pre-validation before Multer
  // ----------------------------------------------------------

  async (req, res, next) => {
    try {
      const { applicationId, requirementId } = req.params;

      const application = await Application.findById(applicationId);

      if (!application) {
        return res.status(404).json({
          message: "الطلب غير موجود",
        });
      }

      // ------------------------------------------------------
      // Owner check
      // ------------------------------------------------------

      const isOwner =
        application.userId.toString() === req.user.userId.toString();

      if (!isOwner) {
        return res.status(403).json({
          message: "ليس لديك صلاحية لإضافة ملفات لهذا الطلب",
        });
      }

      // ------------------------------------------------------
      // Application status
      // ------------------------------------------------------

      if (
        application.status !== "draft" &&
        application.status !== "needs_correction"
      ) {
        return res.status(400).json({
          message: "لا يمكن رفع ملفات على طلب في حالته الحالية",
        });
      }

      // ------------------------------------------------------
      // Requirement must belong to this service
      // ------------------------------------------------------

      const requirement = await ServiceRequirement.findOne({
        _id: requirementId,
        serviceId: application.serviceId,
      });

      if (!requirement) {
        return res.status(404).json({
          message: "المستند المحدد غير موجود ضمن متطلبات الخدمة",
        });
      }

      // ------------------------------------------------------
      // Requirement must actually accept uploaded files
      // ------------------------------------------------------

      if (
        requirement.type === "info" ||
        requirement.type === "text" ||
        requirement.requiresUpload === false
      ) {
        return res.status(400).json({
          message: "هذا المتطلب لا يحتاج إلى رفع ملفات",
        });
      }

      // ------------------------------------------------------
      // IMPORTANT:
      // If application needs correction, the user can only
      // upload to a requirement that has a pending correction.
      // ------------------------------------------------------

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

  // ----------------------------------------------------------
  // Multer
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // Save Files
  // ----------------------------------------------------------

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

      // ------------------------------------------------------
      // Existing files
      // ------------------------------------------------------

      const existingFiles = await ApplicationFile.find({
        applicationId: application._id,
        requirementId: requirement._id,
      });

      // ------------------------------------------------------
      // Maximum allowed files
      // ------------------------------------------------------

      const maxFiles =
        requirement.allowMultiple === true ? requirement.maxFiles || 1 : 1;

      // ------------------------------------------------------
      // For correction:
      // The old file will be replaced.
      // Therefore existing files don't count against the
      // new upload.
      // ------------------------------------------------------

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

      // ------------------------------------------------------
      // Correction:
      // Delete old files for this requirement
      // ------------------------------------------------------

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

      // ------------------------------------------------------
      // Save uploaded files
      // ------------------------------------------------------

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

      // ------------------------------------------------------
      // Resolve matching correction
      // ------------------------------------------------------

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

      // ------------------------------------------------------
      // Cleanup uploaded files if something goes wrong
      // ------------------------------------------------------

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

    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
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
// Open / Download File
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

    const isOwner =
      application.userId._id.toString() === req.user.userId.toString();

    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
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
