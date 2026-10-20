const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const RecoveryAttempt = require("../models/RecoveryAttempt");
const User = require("../models/User");
const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from environment variables.");
}

const RECOVERY_WINDOW_MS = 15 * 60 * 1000;
const MAX_RECOVERY_ATTEMPTS = 5;
const RESET_TOKEN_LIFETIME_MS = 5 * 60 * 1000;

const normalizePhrase = (phrase) =>
  typeof phrase === "string" ? phrase.trim().toLowerCase() : "";

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  nationalId: user.nationalId,
  phoneNumber: user.phoneNumber,
  email: user.email || "",
  role: user.role,
  isActive: user.isActive,
});

const getAttemptKey = (req, nationalId) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";

  return crypto
    .createHash("sha256")
    .update(`${ip}:${nationalId}`)
    .digest("hex");
};

// MongoDB-based rate limiting
const consumeRecoveryAttempt = async (key) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + RECOVERY_WINDOW_MS);

  try {
    await RecoveryAttempt.updateOne(
      { key },
      {
        $setOnInsert: {
          count: 0,
          windowExpiresAt: now,
          expiresAt,
        },
      },
      { upsert: true },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }

  const result = await RecoveryAttempt.findOneAndUpdate(
    { key },
    [
      {
        $set: {
          count: {
            $cond: [
              { $lte: ["$windowExpiresAt", "$$NOW"] },
              1,
              { $add: ["$count", 1] },
            ],
          },
          windowExpiresAt: {
            $cond: [
              { $lte: ["$windowExpiresAt", "$$NOW"] },
              {
                $dateAdd: {
                  startDate: "$$NOW",
                  unit: "minute",
                  amount: 15,
                },
              },
              "$windowExpiresAt",
            ],
          },
          expiresAt: {
            $cond: [
              { $lte: ["$windowExpiresAt", "$$NOW"] },
              {
                $dateAdd: {
                  startDate: "$$NOW",
                  unit: "minute",
                  amount: 15,
                },
              },
              "$expiresAt",
            ],
          },
        },
      },
    ],
    { new: true, updatePipeline: true },
  );

  return Boolean(result && result.count <= MAX_RECOVERY_ATTEMPTS);
};

// Register
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      nationalId,
      phoneNumber,
      email,
      password,
      recoveryPhrase,
      confirmRecoveryPhrase,
    } = req.body;

    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanNationalId =
      typeof nationalId === "string" ? nationalId.trim() : "";
    const cleanPhone =
      typeof phoneNumber === "string" ? phoneNumber.trim() : "";
    const cleanEmail =
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
        message: "من فضلك أكمل جميع الحقول المطلوبة.",
      });
    }

    if (!/^\d{14}$/.test(cleanNationalId)) {
      return res.status(400).json({
        message: "الرقم القومي يجب أن يتكون من 14 رقمًا.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "كلمة المرور يجب ألا تقل عن 8 أحرف.",
      });
    }

    if (phrase.length < 12 || phrase.length > 200) {
      return res.status(400).json({
        message: "العبارة السرية يجب أن تكون بين 12 و200 حرف.",
      });
    }

    if (phrase !== phraseConfirmation) {
      return res.status(400).json({
        message: "تأكيد العبارة السرية غير مطابق.",
      });
    }

    const existingUser = await User.findOne({
      nationalId: cleanNationalId,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "يوجد حساب مسجل بهذا الرقم القومي بالفعل.",
      });
    }

    const user = await User.create({
      name: cleanName,
      nationalId: cleanNationalId,
      phoneNumber: cleanPhone,
      email: cleanEmail || undefined,
      password: await bcrypt.hash(password, 12),
      recoveryPhraseHash: await bcrypt.hash(phrase, 12),
    });

    return res.status(201).json({
      message: "تم إنشاء الحساب بنجاح.",
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "الرقم القومي أو البريد الإلكتروني مسجل بالفعل.",
      });
    }

    console.error("Register error:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء إنشاء الحساب.",
    });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { nationalId, password } = req.body;

    const cleanNationalId =
      typeof nationalId === "string" ? nationalId.trim() : "";

    if (!cleanNationalId || typeof password !== "string" || !password) {
      return res.status(400).json({
        message: "أدخل الرقم القومي وكلمة المرور.",
      });
    }

    const user = await User.findOne({
      nationalId: cleanNationalId,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "الرقم القومي أو كلمة المرور غير صحيحة.",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        message: "هذا الحساب غير نشط.",
      });
    }

    const matches = await bcrypt.compare(password, user.password);

    if (!matches) {
      return res.status(401).json({
        message: "الرقم القومي أو كلمة المرور غير صحيحة.",
      });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.json({
      message: "تم تسجيل الدخول بنجاح.",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء تسجيل الدخول.",
    });
  }
});

// Current user
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "الحساب غير موجود.",
      });
    }

    return res.json(publicUser(user));
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء تحميل بيانات الحساب.",
    });
  }
});

// Update profile
router.patch("/me", authenticate, async (req, res) => {
  try {
    const { name, phoneNumber, email } = req.body;

    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanPhone =
      typeof phoneNumber === "string" ? phoneNumber.trim() : "";
    const cleanEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!cleanName || !cleanPhone) {
      return res.status(400).json({
        message: "الاسم ورقم الهاتف مطلوبان.",
      });
    }

    if (cleanEmail) {
      const existingEmail = await User.findOne({
        email: cleanEmail,
        _id: { $ne: req.user.userId },
      });

      if (existingEmail) {
        return res.status(409).json({
          message: "البريد الإلكتروني مستخدم بالفعل.",
        });
      }
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "الحساب غير موجود.",
      });
    }

    user.name = cleanName;
    user.phoneNumber = cleanPhone;
    user.email = cleanEmail || undefined;

    await user.save();

    return res.json({
      message: "تم تحديث بيانات الحساب بنجاح.",
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "البريد الإلكتروني مستخدم بالفعل.",
      });
    }

    console.error("Update profile error:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء تحديث بيانات الحساب.",
    });
  }
});

// Change password while logged in
router.patch("/change-password", authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string"
    ) {
      return res.status(400).json({
        message: "من فضلك أكمل جميع حقول كلمة المرور.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "تأكيد كلمة المرور غير مطابق.",
      });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({
        message: "كلمة المرور الجديدة يجب أن تختلف عن الحالية.",
      });
    }

    const user = await User.findById(req.user.userId).select("+password");

    if (!user) {
      return res.status(404).json({
        message: "الحساب غير موجود.",
      });
    }

    const matches = await bcrypt.compare(currentPassword, user.password);

    if (!matches) {
      return res.status(400).json({
        message: "كلمة المرور الحالية غير صحيحة.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.json({
      message: "تم تغيير كلمة المرور بنجاح.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء تغيير كلمة المرور.",
    });
  }
});

// Set/update recovery phrase
router.patch("/recovery-phrase", authenticate, async (req, res) => {
  try {
    const { currentPassword, recoveryPhrase, confirmRecoveryPhrase } = req.body;

    if (
      typeof currentPassword !== "string" ||
      typeof recoveryPhrase !== "string" ||
      typeof confirmRecoveryPhrase !== "string"
    ) {
      return res.status(400).json({
        message: "من فضلك أكمل جميع الحقول المطلوبة.",
      });
    }

    const phrase = normalizePhrase(recoveryPhrase);
    const confirmation = normalizePhrase(confirmRecoveryPhrase);

    if (phrase.length < 12 || phrase.length > 200) {
      return res.status(400).json({
        message: "العبارة السرية يجب أن تكون بين 12 و200 حرف.",
      });
    }

    if (phrase !== confirmation) {
      return res.status(400).json({
        message: "تأكيد العبارة السرية غير مطابق.",
      });
    }

    const user = await User.findById(req.user.userId).select("+password");

    if (!user) {
      return res.status(404).json({
        message: "الحساب غير موجود.",
      });
    }

    const matches = await bcrypt.compare(currentPassword, user.password);

    if (!matches) {
      return res.status(400).json({
        message: "كلمة المرور الحالية غير صحيحة.",
      });
    }

    user.recoveryPhraseHash = await bcrypt.hash(phrase, 12);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;

    await user.save();

    return res.json({
      message: "تم حفظ العبارة السرية بنجاح.",
    });
  } catch (error) {
    console.error("Set recovery phrase error:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء حفظ العبارة السرية.",
    });
  }
});

// Verify recovery phrase
router.post("/forgot-password/verify", async (req, res) => {
  try {
    const { nationalId, recoveryPhrase } = req.body;

    const cleanNationalId =
      typeof nationalId === "string" ? nationalId.trim() : "";
    const phrase = normalizePhrase(recoveryPhrase);

    if (!cleanNationalId || !phrase) {
      return res.status(400).json({
        message: "راجع الرقم القومي والعبارة السرية.",
      });
    }

    const allowed = await consumeRecoveryAttempt(
      getAttemptKey(req, cleanNationalId),
    );

    if (!allowed) {
      return res.status(429).json({
        message: "محاولات كثيرة. حاول مرة أخرى بعد 15 دقيقة.",
      });
    }

    const user = await User.findOne({
      nationalId: cleanNationalId,
      isActive: { $ne: false },
    }).select("+recoveryPhraseHash");

    const matches =
      user?.recoveryPhraseHash &&
      (await bcrypt.compare(phrase, user.recoveryPhraseHash));

    if (!user || !matches) {
      return res.status(400).json({
        message: "تعذر التحقق من البيانات. راجع الرقم القومي والعبارة السرية.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.passwordResetTokenHash = hashResetToken(resetToken);
    user.passwordResetExpiresAt = new Date(
      Date.now() + RESET_TOKEN_LIFETIME_MS,
    );

    await user.save();

    return res.json({
      message: "تم التحقق بنجاح. يمكنك تعيين كلمة مرور جديدة.",
      resetToken,
    });
  } catch (error) {
    console.error("Verify recovery phrase error:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء التحقق. حاول مرة أخرى.",
    });
  }
});

// Reset password using a one-time token
router.post("/forgot-password/reset", async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (
      typeof resetToken !== "string" ||
      !resetToken ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string"
    ) {
      return res.status(400).json({
        message: "من فضلك أكمل جميع الحقول المطلوبة.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "تأكيد كلمة المرور غير مطابق.",
      });
    }

    const user = await User.findOneAndUpdate(
      {
        passwordResetTokenHash: hashResetToken(resetToken),
        passwordResetExpiresAt: { $gt: new Date() },
        isActive: { $ne: false },
      },
      {
        $unset: {
          passwordResetTokenHash: 1,
          passwordResetExpiresAt: 1,
        },
      },
      { new: false },
    );

    if (!user) {
      return res.status(400).json({
        message: "رمز الاستعادة غير صالح أو انتهت صلاحيته. ابدأ من جديد.",
      });
    }

    // The token is consumed before the password is saved.
    const updated = await User.updateOne(
      {
        _id: user._id,
        passwordResetTokenHash: { $exists: false },
        passwordResetExpiresAt: { $exists: false },
      },
      {
        $set: {
          password: await bcrypt.hash(newPassword, 12),
        },
      },
    );

    if (updated.modifiedCount !== 1) {
      return res.status(400).json({
        message: "تعذر تغيير كلمة المرور. ابدأ عملية الاستعادة من جديد.",
      });
    }

    return res.json({
      message: "تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء إعادة تعيين كلمة المرور.",
    });
  }
});

// Deactivate account
router.delete("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "الحساب غير موجود.",
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        message: "لا يمكن تعطيل حساب المدير من هذه الصفحة.",
      });
    }

    user.isActive = false;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;

    await user.save();

    return res.json({
      message: "تم تعطيل الحساب بنجاح.",
    });
  } catch (error) {
    console.error("Deactivate account error:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء تعطيل الحساب.",
    });
  }
});

module.exports = router;
