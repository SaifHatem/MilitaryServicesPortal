const express = require("express");
const fs = require("fs");
const path = require("path");

const Application = require("../models/Application");
const Service = require("../models/Service");
const ServiceRequirement = require("../models/ServiceRequirement");
const ApplicationFile = require("../models/ApplicationFile");
const User = require("../models/User");

const authenticate = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

// ============================================================
// Create application
// ============================================================

router.post("/", authenticate, async (req, res) => {
  try {
    const { serviceId, textResponses } = req.body;

    if (!serviceId) {
      return res.status(400).json({
        message: "الخدمة غير محددة",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "المستخدم غير موجود",
      });
    }

    if (!user.name || !user.nationalId || !user.phoneNumber) {
      return res.status(400).json({
        message: "بيانات المستخدم غير مكتملة",
      });
    }

    const service = await Service.findById(serviceId);

    if (!service || !service.isActive) {
      return res.status(404).json({
        message: "الخدمة غير موجودة",
      });
    }

    // Validate text responses against service requirements
    const requirements = await ServiceRequirement.find({
      serviceId,
      type: "text",
    });

    const incomingTextResponses = Array.isArray(textResponses)
      ? textResponses
      : [];

    const validTextResponses = [];

    for (const response of incomingTextResponses) {
      const requirement = requirements.find(
        (item) => item._id.toString() === response.requirementId?.toString(),
      );

      if (!requirement) {
        continue;
      }

      if (!response.value?.trim()) {
        continue;
      }

      validTextResponses.push({
        requirementId: requirement._id,
        value: response.value.trim(),
      });
    }

    // Check required text requirements
    const missingTextRequirements = requirements.filter((requirement) => {
      if (!requirement.required) {
        return false;
      }

      return !validTextResponses.some(
        (response) =>
          response.requirementId.toString() === requirement._id.toString(),
      );
    });

    if (missingTextRequirements.length > 0) {
      return res.status(400).json({
        message: "من فضلك أدخل جميع البيانات النصية المطلوبة",
        missingRequirements: missingTextRequirements.map((requirement) => ({
          requirementId: requirement._id,
          name: requirement.name,
        })),
      });
    }

    const application = await Application.create({
      userId: user._id,
      serviceId,
      applicantName: user.name,
      nationalId: user.nationalId,
      phoneNumber: user.phoneNumber,
      textResponses: validTextResponses,
    });

    res.status(201).json({
      message: "تم إنشاء الطلب بنجاح",
      application,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء إنشاء الطلب",
    });
  }
});

// ============================================================
// My applications
// ============================================================

router.get("/my", authenticate, async (req, res) => {
  try {
    const applications = await Application.find({
      userId: req.user.userId,
    })
      .populate("serviceId")
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء جلب طلباتك",
    });
  }
});

// ============================================================
// All applications - admin only, no drafts
// ============================================================

router.get("/all", authenticate, adminOnly, async (req, res) => {
  try {
    const applications = await Application.find({
      status: { $ne: "draft" },
    })
      .populate("serviceId")
      .populate("userId", "-password")
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء جلب الطلبات",
    });
  }
});

// ============================================================
// Add correction - admin only
// ============================================================

router.post("/:id/corrections", authenticate, adminOnly, async (req, res) => {
  try {
    const { requirementId, message } = req.body;

    if (!requirementId || !message?.trim()) {
      return res.status(400).json({
        message: "من فضلك اختر المستند واكتب سبب التصحيح",
      });
    }

    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        message: "الطلب غير موجود",
      });
    }

    if (application.status !== "under_review") {
      return res.status(400).json({
        message: "لا يمكن طلب تصحيح إلا للطلب قيد المراجعة",
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
        message: "لا يمكن طلب تصحيح لهذا المتطلب",
      });
    }

    const existingCorrection = application.corrections.find(
      (correction) =>
        correction.requirementId.toString() === requirementId.toString() &&
        correction.status === "pending",
    );

    if (existingCorrection) {
      existingCorrection.message = message.trim();
      existingCorrection.createdAt = new Date();
    } else {
      application.corrections.push({
        requirementId,
        message: message.trim(),
        status: "pending",
        createdAt: new Date(),
        resolvedAt: null,
      });
    }

    application.status = "needs_correction";

    await application.save();

    const updatedApplication = await Application.findById(application._id)
      .populate("serviceId")
      .populate("corrections.requirementId");

    res.json({
      message: "تم إضافة ملاحظة التصحيح بنجاح",
      application: updatedApplication,
    });
  } catch (error) {
    console.error("Add correction error:", error);

    res.status(500).json({
      message: "حدث خطأ أثناء إضافة ملاحظة التصحيح",
    });
  }
});

// ============================================================
// Delete application
// ============================================================

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        message: "الطلب غير موجود",
      });
    }

    const isOwner =
      application.userId.toString() === req.user.userId.toString();

    if (!isOwner) {
      return res.status(403).json({
        message: "ليس لديك صلاحية لحذف هذا الطلب",
      });
    }

    if (application.status !== "draft") {
      return res.status(400).json({
        message: "لا يمكن حذف الطلب بعد إرساله",
      });
    }

    const applicationFiles = await ApplicationFile.find({
      applicationId: application._id,
    });

    for (const file of applicationFiles) {
      try {
        if (file.filePath) {
          const filePath = path.isAbsolute(file.filePath)
            ? file.filePath
            : path.join(__dirname, "..", file.filePath);

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      } catch (fileError) {
        console.error("Error deleting file:", file.filePath, fileError);
      }
    }

    await ApplicationFile.deleteMany({
      applicationId: application._id,
    });

    await Application.findByIdAndDelete(application._id);

    res.json({
      message: "تم حذف الطلب بنجاح",
    });
  } catch (error) {
    console.error("Delete application error:", error);

    res.status(500).json({
      message: "حدث خطأ أثناء حذف الطلب",
    });
  }
});

// ============================================================
// Get single application
// ============================================================

router.get("/:id", authenticate, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate("serviceId")
      .populate("corrections.requirementId")
      .populate("textResponses.requirementId");

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
        message: "ليس لديك صلاحية للوصول إلى هذا الطلب",
      });
    }

    res.json(application);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء جلب تفاصيل الطلب",
    });
  }
});

// ============================================================
// Change status - admin only
// ============================================================

router.patch("/:id/status", authenticate, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "submitted",
      "under_review",
      "approved",
      "rejected",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "الحالة المطلوبة غير صحيحة",
      });
    }

    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        message: "الطلب غير موجود",
      });
    }

    const currentStatus = application.status;

    // ========================================================
    // Final statuses cannot be changed
    // ========================================================

    if (currentStatus === "approved" || currentStatus === "rejected") {
      return res.status(400).json({
        message: "لا يمكن تغيير حالة طلب نهائي",
      });
    }

    // ========================================================
    // submitted -> under_review only
    // ========================================================

    if (currentStatus === "submitted") {
      if (status !== "under_review") {
        return res.status(400).json({
          message: "لا يمكن نقل الطلب من تم الإرسال إلى هذه الحالة",
        });
      }
    }

    // ========================================================
    // under_review -> approved / rejected
    // ========================================================

    if (currentStatus === "under_review") {
      if (status !== "approved" && status !== "rejected") {
        return res.status(400).json({
          message: "لا يمكن نقل الطلب قيد المراجعة إلى هذه الحالة",
        });
      }
    }

    // ========================================================
    // needs_correction -> under_review
    //
    // Normally the user should resubmit first, which changes
    // the application back to submitted.
    // This block allows admin to review it again only if needed.
    // ========================================================

    if (currentStatus === "needs_correction") {
      return res.status(400).json({
        message: "يجب إعادة تقديم الطلب من المستخدم أولًا",
      });
    }

    // ========================================================
    // Update status
    // ========================================================

    application.status = status;

    await application.save();

    res.json({
      message: "تم تحديث حالة الطلب بنجاح",
      application,
    });
  } catch (error) {
    console.error("Update application status error:", error);

    res.status(500).json({
      message: "حدث خطأ أثناء تحديث حالة الطلب",
    });
  }
});

// ============================================================
// Submit / Resubmit
// ============================================================

router.post("/:id/submit", authenticate, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        message: "الطلب غير موجود",
      });
    }

    if (application.userId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        message: "ليس لديك صلاحية لإرسال هذا الطلب",
      });
    }

    if (
      application.status !== "draft" &&
      application.status !== "needs_correction"
    ) {
      return res.status(400).json({
        message: "لا يمكن إرسال هذا الطلب في حالته الحالية",
      });
    }

    // Remember whether this is a resubmission
    const isResubmission = application.status === "needs_correction";

    // ========================================================
    // Check pending corrections
    // ========================================================

    const pendingCorrections = application.corrections.filter(
      (correction) => correction.status === "pending",
    );

    if (pendingCorrections.length > 0) {
      return res.status(400).json({
        message: "لا يمكن إعادة تقديم الطلب قبل تصحيح جميع المستندات المطلوبة",
        pendingCorrections,
      });
    }

    // ========================================================
    // Check file requirements
    // ========================================================

    const requirements = await ServiceRequirement.find({
      serviceId: application.serviceId,
      required: true,
      requiresUpload: true,
      type: { $ne: "text" },
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

        continue;
      }

      const maxFiles =
        requirement.allowMultiple === true ? requirement.maxFiles || 1 : 1;

      if (fileCount > maxFiles) {
        return res.status(400).json({
          message: `عدد الملفات المرفوعة للمتطلب "${requirement.name}" أكبر من العدد المسموح`,
          maxFiles,
          uploadedFiles: fileCount,
        });
      }
    }

    // ========================================================
    // Check text requirements
    // ========================================================

    const textRequirements = await ServiceRequirement.find({
      serviceId: application.serviceId,
      required: true,
      type: "text",
    });

    for (const requirement of textRequirements) {
      const response = application.textResponses.find(
        (item) => item.requirementId.toString() === requirement._id.toString(),
      );

      if (!response || !response.value?.trim()) {
        missingRequirements.push({
          requirementId: requirement._id,
          name: requirement.name,
          type: "text",
        });
      }
    }

    // ========================================================
    // Missing requirements
    // ========================================================

    if (missingRequirements.length > 0) {
      return res.status(400).json({
        message: "لا يمكن إرسال الطلب، توجد مستندات أو بيانات ناقصة",
        missingRequirements,
      });
    }

    // ========================================================
    // Submit
    // ========================================================

    application.status = "submitted";

    await application.save();

    res.json({
      message: isResubmission
        ? "تم إعادة إرسال الطلب بنجاح"
        : "تم إرسال الطلب بنجاح",

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
