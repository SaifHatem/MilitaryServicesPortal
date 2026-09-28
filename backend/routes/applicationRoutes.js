const express = require("express");
const fs = require("fs");
const path = require("path");

const Application = require("../models/Application");
const Service = require("../models/Service");
const ServiceRequirement = require("../models/ServiceRequirement");
const ApplicationFile = require("../models/ApplicationFile");

const authenticate = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

// ======================================================
// إنشاء طلب جديد
// ======================================================

router.post("/", authenticate, async (req, res) => {
  try {
    const { serviceId, applicantName, nationalId, phoneNumber } = req.body;

    if (!serviceId || !applicantName || !nationalId || !phoneNumber) {
      return res.status(400).json({
        message: "من فضلك أدخل جميع البيانات المطلوبة",
      });
    }

    const service = await Service.findById(serviceId);

    if (!service || !service.isActive) {
      return res.status(404).json({
        message: "الخدمة غير موجودة",
      });
    }

    const application = await Application.create({
      userId: req.user.userId,
      serviceId,
      applicantName,
      nationalId,
      phoneNumber,
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

// ======================================================
// طلباتي
// ======================================================

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

// ======================================================
// كل الطلبات - Admin فقط
// لا تظهر المسودات
// ======================================================

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

// ======================================================
// إضافة ملاحظة تصحيح لمستند معين - Admin فقط
// ======================================================

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

    if (
      application.status === "approved" ||
      application.status === "rejected"
    ) {
      return res.status(400).json({
        message: "لا يمكن إضافة تصحيح لطلب نهائي",
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

    // لو فيه ملاحظة قديمة لنفس المستند ما زالت pending
    // نحدثها بدل إضافة ملاحظة مكررة
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

// ======================================================
// حذف طلب - المستخدم صاحب الطلب فقط
// يسمح بحذف المسودة فقط
// ======================================================

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

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

// ======================================================
// جلب طلب معين
// ======================================================

router.get("/:id", authenticate, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate("serviceId")
      .populate("corrections.requirementId");

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

// ======================================================
// تغيير حالة الطلب - Admin فقط
// ======================================================

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
        message: "الحالة المطلوبة لا يمكن تغييرها من هنا",
      });
    }

    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        message: "الطلب غير موجود",
      });
    }

    if (application.status === "draft") {
      return res.status(400).json({
        message: "لا يمكن مراجعة طلب ما زال مسودة",
      });
    }

    if (status === "under_review") {
      if (
        application.status !== "submitted" &&
        application.status !== "needs_correction"
      ) {
        return res.status(400).json({
          message: "لا يمكن نقل الطلب إلى قيد المراجعة من حالته الحالية",
        });
      }
    }

    application.status = status;

    await application.save();

    res.json({
      message: "تم تحديث حالة الطلب",
      application,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء تحديث حالة الطلب",
    });
  }
});

// ======================================================
// إرسال / إعادة إرسال الطلب
// ======================================================

router.post("/:id/submit", authenticate, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

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
        message: "ليس لديك صلاحية لإرسال هذا الطلب",
      });
    }

    // يسمح بالتقديم لأول مرة أو إعادة التقديم بعد التصحيح
    if (
      application.status !== "draft" &&
      application.status !== "needs_correction"
    ) {
      return res.status(400).json({
        message: "لا يمكن إرسال هذا الطلب في حالته الحالية",
      });
    }

    // ======================================================
    // التأكد من عدم وجود ملاحظات تصحيح معلقة
    // ======================================================

    const pendingCorrections = application.corrections.filter(
      (correction) => correction.status === "pending",
    );

    if (pendingCorrections.length > 0) {
      return res.status(400).json({
        message: "لا يمكن إعادة تقديم الطلب قبل تصحيح جميع المستندات المطلوبة",
        pendingCorrections,
      });
    }

    // ======================================================
    // التأكد من وجود جميع المستندات المطلوبة
    // ======================================================

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
      message:
        application.status === "submitted"
          ? "تم إرسال الطلب بنجاح"
          : "تم إعادة إرسال الطلب بنجاح",
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
