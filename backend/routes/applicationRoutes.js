const express = require("express");

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
// ======================================================

router.get("/all", authenticate, adminOnly, async (req, res) => {
  try {
    const applications = await Application.find()
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
// جلب طلب معين
// ======================================================

router.get("/:id", authenticate, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).populate(
      "serviceId",
    );

    if (!application) {
      return res.status(404).json({
        message: "الطلب غير موجود",
      });
    }

    // المستخدم يشوف طلبه فقط
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
      message: "حدث خطأ أثناء جلب الطلب",
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
      "draft",
      "submitted",
      "under_review",
      "approved",
      "rejected",
      "needs_correction",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "حالة الطلب غير صحيحة",
      });
    }

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );

    if (!application) {
      return res.status(404).json({
        message: "الطلب غير موجود",
      });
    }

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
// إرسال الطلب
// ======================================================

router.post("/:id/submit", authenticate, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        message: "الطلب غير موجود",
      });
    }

    // الطلب لازم يكون بتاع المستخدم
    if (
      req.user.role !== "admin" &&
      application.userId.toString() !== req.user.userId.toString()
    ) {
      return res.status(403).json({
        message: "ليس لديك صلاحية لإرسال هذا الطلب",
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
