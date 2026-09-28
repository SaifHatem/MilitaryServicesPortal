const express = require("express");
const ServiceRequirement = require("../models/ServiceRequirement");

const router = express.Router();

router.get("/:serviceId", async (req, res) => {
  try {
    const requirements = await ServiceRequirement.find({
      serviceId: req.params.serviceId,
    }).sort({ order: 1 });

    res.json(requirements);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء جلب متطلبات الخدمة",
    });
  }
});

module.exports = router;
