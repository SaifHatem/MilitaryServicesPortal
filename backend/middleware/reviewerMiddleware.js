const reviewerOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "غير مصرح لك بالدخول",
    });
  }

  if (!["admin", "reviewer"].includes(req.user.role)) {
    return res.status(403).json({
      message: "ليس لديك صلاحية لمراجعة الطلبات",
    });
  }

  next();
};

module.exports = reviewerOnly;
