const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

// ==========================================
// Register
// ==========================================

router.post("/register", async (req, res) => {
  try {
    const { name, nationalId, phoneNumber, email, password } = req.body;

    const cleanName = name?.trim();
    const cleanNationalId = nationalId?.trim();
    const cleanPhoneNumber = phoneNumber?.trim();
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanName || !cleanNationalId || !cleanPhoneNumber || !password) {
      return res.status(400).json({
        message: "من فضلك أدخل جميع البيانات المطلوبة",
      });
    }

    if (!/^\d{14}$/.test(cleanNationalId)) {
      return res.status(400).json({
        message: "الرقم القومي يجب أن يتكون من 14 رقمًا",
      });
    }

    const existingUser = await User.findOne({
      nationalId: cleanNationalId,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "هذا الرقم القومي مسجل بالفعل",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: cleanName,
      nationalId: cleanNationalId,
      phoneNumber: cleanPhoneNumber,
      email: cleanEmail || undefined,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "تم إنشاء الحساب بنجاح",

      user: {
        id: user._id,
        name: user.name,
        nationalId: user.nationalId,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء إنشاء الحساب",
    });
  }
});

// ==========================================
// Login
// ==========================================

router.post("/login", async (req, res) => {
  try {
    const { nationalId, password } = req.body;

    const cleanNationalId = nationalId?.trim();

    if (!cleanNationalId || !password) {
      return res.status(400).json({
        message: "من فضلك أدخل الرقم القومي وكلمة المرور",
      });
    }

    const user = await User.findOne({
      nationalId: cleanNationalId,
    });

    if (!user) {
      return res.status(401).json({
        message: "بيانات الدخول غير صحيحة",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "بيانات الدخول غير صحيحة",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    res.json({
      message: "تم تسجيل الدخول بنجاح",
      token,

      user: {
        id: user._id,
        name: user.name,
        nationalId: user.nationalId,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء تسجيل الدخول",
    });
  }
});

// ==========================================
// Current User
// ==========================================

router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "المستخدم غير موجود",
      });
    }

    res.json(user);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ",
    });
  }
});

module.exports = router;
