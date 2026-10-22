const express = require("express");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const User = require("../models/User");
const Application = require("../models/Application");
const ApplicationFile = require("../models/ApplicationFile");

const authenticate = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

router.use(authenticate, adminOnly);

const normalizePhrase = (phrase) =>
  typeof phrase === "string" ? phrase.trim().toLowerCase() : "";

// عرض الحسابات دون كلمات المرور أو بيانات استعادة الحساب.
router.get("/", async (req, res) => {
  try {
    const users = await User.find()
      .select("_id name nationalId phoneNumber email role isActive createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ users });
  } catch (error) {
    console.error("List users error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء تحميل الحسابات",
    });
  }
});

// إنشاء حساب جديد مع حفظ العبارة السرية بصورة آمنة.
router.post("/", async (req, res) => {
  try {
    const {
      name,
      nationalId,
      phoneNumber,
      email,
      password,
      recoveryPhrase,
      confirmRecoveryPhrase,
      role,
    } = req.body;

    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanNationalId =
      typeof nationalId === "string" ? nationalId.trim() : "";
    const cleanPhone =
      typeof phoneNumber === "string" ? phoneNumber.trim() : "";
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    const phrase = normalizePhrase(recoveryPhrase);
    const phraseConfirmation = normalizePhrase(confirmRecoveryPhrase);

    if (
      !cleanName ||
      !cleanNationalId ||
      !cleanPhone ||
      typeof password !== "string" ||
      !password ||
      !phrase ||
      !phraseConfirmation
    ) {
      return res.status(400).json({
        message:
          "الاسم والرقم القومي ورقم الهاتف وكلمة المرور والعبارة السرية وتأكيدها حقول مطلوبة",
      });
    }

    if (!/^\d{14}$/.test(cleanNationalId)) {
      return res.status(400).json({
        message: "الرقم القومي يجب أن يتكون من 14 رقمًا",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "كلمة المرور يجب ألا تقل عن 8 أحرف",
      });
    }

    if (phrase.length < 12 || phrase.length > 200) {
      return res.status(400).json({
        message: "العبارة السرية يجب أن تكون بين 12 و200 حرف",
      });
    }

    if (phrase !== phraseConfirmation) {
      return res.status(400).json({
        message: "تأكيد العبارة السرية غير مطابق",
      });
    }

    const allowedRoles = ["user", "reviewer", "admin"];
    const accountRole = role || "user";

    if (!allowedRoles.includes(accountRole)) {
      return res.status(400).json({
        message: "نوع الحساب غير صحيح",
      });
    }

    const duplicateConditions = [{ nationalId: cleanNationalId }];

    if (normalizedEmail) {
      duplicateConditions.push({ email: normalizedEmail });
    }

    const existingUser = await User.findOne({
      $or: duplicateConditions,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "الرقم القومي أو البريد الإلكتروني مستخدم بالفعل",
      });
    }

    const userData = {
      name: cleanName,
      nationalId: cleanNationalId,
      phoneNumber: cleanPhone,
      password: await bcrypt.hash(password, 12),
      recoveryPhraseHash: await bcrypt.hash(phrase, 12),
      role: accountRole,
      isActive: true,
    };

    if (normalizedEmail) {
      userData.email = normalizedEmail;
    }

    const user = await User.create(userData);

    return res.status(201).json({
      message: "تم إنشاء الحساب بنجاح",
      user: {
        _id: user._id,
        name: user.name,
        nationalId: user.nationalId,
        phoneNumber: user.phoneNumber,
        email: user.email || "",
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "الرقم القومي أو البريد الإلكتروني مستخدم بالفعل",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "بيانات الحساب غير صحيحة",
      });
    }

    return res.status(500).json({
      message: "حدث خطأ أثناء إنشاء الحساب",
    });
  }
});

// حذف الحساب نهائيًا مع طلباته وسجلات مستنداته وملفاته.
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({
        message: "معرّف الحساب غير صحيح",
      });
    }

    if (String(req.user.userId) === id) {
      return res.status(400).json({
        message: "لا يمكنك حذف حسابك الحالي",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "الحساب غير موجود",
      });
    }

    if (user.role === "admin" && user.isActive !== false) {
      const activeAdminsCount = await User.countDocuments({
        role: "admin",
        isActive: { $ne: false },
      });

      if (activeAdminsCount <= 1) {
        return res.status(400).json({
          message: "لا يمكن حذف آخر حساب Admin نشط",
        });
      }
    }

    // جلب طلبات الحساب.
    const applications = await Application.find({
      userId: user._id,
    })
      .select("_id")
      .lean();

    const applicationIds = applications.map((application) => application._id);

    // جلب سجلات الملفات المرتبطة بهذه الطلبات.
    const files = applicationIds.length
      ? await ApplicationFile.find({
          applicationId: { $in: applicationIds },
        })
          .select("_id filePath")
          .lean()
      : [];

    // حذف سجلات المستندات والطلبات من قاعدة البيانات.
    if (applicationIds.length > 0) {
      await ApplicationFile.deleteMany({
        applicationId: { $in: applicationIds },
      });

      await Application.deleteMany({
        userId: user._id,
      });
    }

    // حذف الملفات الفعلية من مجلد uploads.
    for (const file of files) {
      if (!file.filePath) continue;

      const filePath = path.isAbsolute(file.filePath)
        ? file.filePath
        : path.join(__dirname, "..", file.filePath);

      try {
        await fs.promises.unlink(filePath);
      } catch (fileError) {
        if (fileError.code !== "ENOENT") {
          console.error(
            `Could not delete uploaded file ${filePath}:`,
            fileError,
          );
        }
      }
    }

    // حذف الحساب نفسه.
    await User.findByIdAndDelete(user._id);

    return res.json({
      message: "تم حذف الحساب وبيانات طلباته المرتبطة بنجاح",
      deletedUserId: String(user._id),
    });
  } catch (error) {
    console.error("Delete user error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء حذف الحساب",
    });
  }
});

module.exports = router;
