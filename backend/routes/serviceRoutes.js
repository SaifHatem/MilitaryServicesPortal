const express = require("express");
const Service = require("../models/Service");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const services = await Service.find({ isActive: true });

    res.json(services);
  } catch (error) {
    res.status(500).json({
      message: "حدث خطأ أثناء جلب الخدمات",
    });
  }
});

module.exports = router;
