const express = require("express");
const Service = require("../models/Service");
const ServiceRequirement = require("../models/ServiceRequirement");

const router = express.Router();

router.get("/:serviceId", async (req, res) => {
  try {
    const service = await Service.findOne({
      _id: req.params.serviceId,
      isActive: true,
    });

    if (!service) {
      return res.status(404).json({
        message: "الخدمة غير موجودة",
      });
    }

    const requirements = await ServiceRequirement.find({
      serviceId: service._id,
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
