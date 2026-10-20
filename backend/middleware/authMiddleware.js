const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "غير مصرح لك بالدخول",
      });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        message: "صيغة التوكن غير صحيحة",
      });
    }

    const token = parts[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.userId).select(
      "_id name nationalId phoneNumber email role isActive",
    );

    if (!user) {
      return res.status(401).json({
        message: "المستخدم غير موجود",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        message: "هذا الحساب غير نشط",
      });
    }

    req.user = {
      userId: user._id.toString(),
      role: user.role,
    };

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        message: "التوكن غير صالح أو منتهي الصلاحية",
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "حدث خطأ أثناء التحقق من الحساب",
    });
  }
};

module.exports = authenticate;
