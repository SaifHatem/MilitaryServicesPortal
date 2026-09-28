const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
// ==========================================
// Register
// ==========================================

router.post("/register", async (req, res) => {
  try {
    const { name, nationalId, phoneNumber, email, password } = req.body;

    if (!name || !nationalId || !phoneNumber || !password) {
      return res.status(400).json({
        message: "من فضلك أدخل جميع البيانات المطلوبة",
      });
    }

    const existingUser = await User.findOne({ nationalId });

    if (existingUser) {
      return res.status(400).json({
        message: "هذا الرقم القومي مسجل بالفعل",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      nationalId,
      phoneNumber,
      email,
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

    if (!nationalId || !password) {
      return res.status(400).json({
        message: "من فضلك أدخل الرقم القومي وكلمة المرور",
      });
    }

    const user = await User.findOne({ nationalId });

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
