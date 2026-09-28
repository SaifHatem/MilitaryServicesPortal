const mongoose = require("mongoose");

const Service = require("./models/Service");
const ServiceRequirement = require("./models/ServiceRequirement");

const services = [
  {
    name: "البطاقات العلاجية",
    description: "خدمة التقديم على البطاقات العلاجية",
  },
  {
    name: "الحج والعمرة لأسر الشهداء",
    description: "خدمة التقديم للحج والعمرة لأسر الشهداء",
  },
  {
    name: "التماس العلاج",
    description: "خدمة تقديم التماس للعلاج",
  },
  {
    name: "الحج والعمرة",
    description: "خدمة إجراءات الحج والعمرة",
  },
  {
    name: "ترخيص السلاح",
    description: "خدمة التقديم على ترخيص السلاح",
  },
  {
    name: "كارنيهات النوادي",
    description: "خدمة استخراج كارنيهات النوادي",
  },
  {
    name: "كارنيهات جمعية المحاربين القدامى",
    description: "خدمة استخراج كارنيهات جمعية المحاربين القدامى",
  },
  {
    name: "طلب اصطحاب أسرة بالخارج",
    description: "خدمة طلب اصطحاب الأسرة بالخارج",
  },
  {
    name: "تكريم المتفوقين دراسيًا من أسر الضباط",
    description: "خدمة ترشيح وتكريم المتفوقين دراسيًا من أسر الضباط",
  },
];

const seedDatabase = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/military_services");

    console.log("MongoDB connected");

    await ServiceRequirement.deleteMany({});
    await Service.deleteMany({});

    const createdServices = await Service.insertMany(services);

    const serviceMap = {};

    createdServices.forEach((service) => {
      serviceMap[service.name] = service._id;
    });

    const requirements = [
      // =========================
      // البطاقات العلاجية
      // =========================

      {
        serviceId: serviceMap["البطاقات العلاجية"],
        name: "التسجيل على موقع إدارة شئون ضباط ق.م",
        description: "",
        type: "info",
        required: true,
        requiresUpload: false,
        minFiles: 0,
        maxFiles: 0,
        allowMultiple: false,
        order: 0,
      },

      {
        serviceId: serviceMap["البطاقات العلاجية"],
        name: "تحقيق الشخصية العسكرية للضابط",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 1,
      },

      {
        serviceId: serviceMap["البطاقات العلاجية"],
        name: "بطاقة الزوجة",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 2,
      },

      {
        serviceId: serviceMap["البطاقات العلاجية"],
        name: "قسيمة الزواج",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 3,
      },

      {
        serviceId: serviceMap["البطاقات العلاجية"],
        name: "شهادات ميلاد الأبناء",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 50,
        allowMultiple: true,
        order: 4,
      },

      {
        serviceId: serviceMap["البطاقات العلاجية"],
        name: "صورتين 4×6 للمدرجين بالبطاقة العلاجية",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 50,
        allowMultiple: true,
        order: 5,
      },

      // =========================
      // الحج والعمرة لأسر الشهداء
      // =========================

      {
        serviceId: serviceMap["الحج والعمرة لأسر الشهداء"],
        name: "أصل + 2 صورة من استمارة ملئ البيانات لقرعة الحج عن العام الجاري",
        description: "أصل + صورتين",
        type: "image",
        required: true,
        minFiles: 3,
        maxFiles: 3,
        allowMultiple: true,
        order: 1,
      },

      {
        serviceId: serviceMap["الحج والعمرة لأسر الشهداء"],
        name: "البطاقة",
        description: "عدد 2 صورة",
        type: "image",
        required: true,
        minFiles: 2,
        maxFiles: 2,
        allowMultiple: true,
        order: 2,
      },

      {
        serviceId: serviceMap["الحج والعمرة لأسر الشهداء"],
        name: "أصل + صورة بيان مستحقى المعاش من إدارة التأمين والمعاشات للقوات المسلحة",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 5,
        allowMultiple: true,
        order: 3,
      },

      {
        serviceId: serviceMap["الحج والعمرة لأسر الشهداء"],
        name: "أصل + صورة شهادة تحركات من الإدارة العامة للجوازات والهجرة والجنسية عن خمس سنوات سابقة",
        description: "أصل + صورة",
        type: "image",
        required: true,
        minFiles: 2,
        maxFiles: 2,
        allowMultiple: true,
        order: 4,
      },

      // =========================
      // التماس العلاج
      // =========================

      {
        serviceId: serviceMap["التماس العلاج"],
        name: "تقرير كفاءة الضابط عن العمل المكلف به",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 1,
      },

      {
        serviceId: serviceMap["التماس العلاج"],
        name: "نموذج بيانات",
        type: "document",
        required: true,
        minFiles: 1,
        maxFiles: 5,
        allowMultiple: true,
        order: 2,
      },

      // =========================
      // الحج والعمرة
      // =========================

      {
        serviceId: serviceMap["الحج والعمرة"],
        name: "نموذج 64 ش ش",
        type: "document",
        required: true,
        minFiles: 1,
        maxFiles: 5,
        allowMultiple: true,
        order: 1,
      },

      {
        serviceId: serviceMap["الحج والعمرة"],
        name: "خطاب شركة السياحة بالسفر",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 2,
      },

      {
        serviceId: serviceMap["الحج والعمرة"],
        name: "شهادات السلاح",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 20,
        allowMultiple: true,
        order: 3,
      },

      {
        serviceId: serviceMap["الحج والعمرة"],
        name: "استيفاء النموذج من جهاز الأمن الحربي والتصديق من السيد رئيس الهيئة",
        type: "info",
        required: true,
        requiresUpload: false,
        order: 4,
      },

      {
        serviceId: serviceMap["الحج والعمرة"],
        name: "تسليم نموذج 64 ش ش إلى إدارة شئون ضباط ق.م - فرع الشئون الشخصية",
        type: "info",
        required: true,
        requiresUpload: false,
        order: 5,
      },

      // =========================
      // ترخيص السلاح
      // =========================

      {
        serviceId: serviceMap["ترخيص السلاح"],
        name: "تحقيق الشخصية العسكرية",
        description: "عدد 2 صورة معتمدة ومختومة بخاتم الشعار",
        type: "image",
        required: true,
        minFiles: 2,
        maxFiles: 2,
        allowMultiple: true,
        order: 1,
      },

      {
        serviceId: serviceMap["ترخيص السلاح"],
        name: "رقم الهاتف",
        type: "text",
        required: true,
        requiresUpload: false,
        minFiles: 0,
        maxFiles: 0,
        allowMultiple: false,
        order: 2,
      },

      {
        serviceId: serviceMap["ترخيص السلاح"],
        name: "البطاقة الشخصية",
        description: "عدد 2 صورة معتمدة ومختومة ختم النسر",
        type: "image",
        required: true,
        minFiles: 2,
        maxFiles: 2,
        allowMultiple: true,
        order: 3,
      },

      {
        serviceId: serviceMap["ترخيص السلاح"],
        name: "التماس موجه للسيد مدير أمن المحافظة التابع لها الضابط معتمد ومختوم خاتم الشعار",
        type: "form",
        required: true,
        downloadableTemplate: true,
        requiresReupload: true,
        requiresUpload: true,
        minFiles: 1,
        maxFiles: 1,
        allowMultiple: false,
        order: 4,
      },

      {
        serviceId: serviceMap["ترخيص السلاح"],
        name: "إقرار بعدم استخراج ترخيص إضافة بحمل وإحراز سلاح من قبل",
        type: "form",
        required: true,
        downloadableTemplate: true,
        requiresReupload: true,
        minFiles: 1,
        maxFiles: 1,
        order: 5,
      },

      {
        serviceId: serviceMap["ترخيص السلاح"],
        name: "إقرار بالعنوان المدني معتمد ومختوم بخاتم الشعار (مرفق للإقرار يتم تحميله ثم ملئه وإعادة تحميله بعد الملء)",
        type: "form",
        required: true,
        downloadableTemplate: true,
        requiresReupload: true,
        minFiles: 1,
        maxFiles: 1,
        allowMultiple: false,
        order: 6,
      },

      {
        serviceId: serviceMap["ترخيص السلاح"],
        name: "شهادة من إدارة شئون ضباط ق.م لترخيص السلاح",
        description: "يجب أن تكون الشهادة سارية لمدة 15 يوم من تاريخ إصدارها",
        type: "document",
        required: true,
        requiresUpload: true,
        minFiles: 1,
        maxFiles: 1,
        allowMultiple: false,
        order: 7,
      },

      {
        serviceId: serviceMap["ترخيص السلاح"],
        name: "صورة توريد مبلغ 105 جنيه",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 5,
        allowMultiple: true,
        order: 8,
      },

      {
        serviceId: serviceMap["ترخيص السلاح"],
        name: "صورة شهادة إعفاء السلاح المرخص من قبل",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 5,
        allowMultiple: true,
        order: 9,
      },

      // =========================
      // كارنيهات النوادي
      // =========================

      {
        serviceId: serviceMap["كارنيهات النوادي"],
        name: "صورة البطاقة العلاجية",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 1,
      },

      {
        serviceId: serviceMap["كارنيهات النوادي"],
        name: "صورة تحقيق الشخصية العسكرية للضابط",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 2,
      },

      {
        serviceId: serviceMap["كارنيهات النوادي"],
        name: "صور 4×6 للمدرجين بالبطاقة العلاجية",
        type: "image",
        required: true,
        minFiles: 2,
        maxFiles: 50,
        allowMultiple: true,
        order: 3,
      },

      {
        serviceId: serviceMap["كارنيهات النوادي"],
        name: "صورة البطاقة الشخصية",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 4,
      },

      {
        serviceId: serviceMap["كارنيهات النوادي"],
        name: "شهادات ميلاد الأعضاء",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 50,
        allowMultiple: true,
        order: 5,
      },

      // =========================
      // جمعية المحاربين القدامى
      // =========================

      {
        serviceId: serviceMap["كارنيهات جمعية المحاربين القدامى"],
        name: "صورة تحقيق الشخصية العسكرية",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 1,
      },

      {
        serviceId: serviceMap["كارنيهات جمعية المحاربين القدامى"],
        name: "بطاقة الرقم القومي للضابط",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 2,
      },

      {
        serviceId: serviceMap["كارنيهات جمعية المحاربين القدامى"],
        name: "خطاب من إدارة شئون ضباط ق.م موجه إلى جمعية المحاربين القدامى",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 3,
      },

      // =========================
      // اصطحاب أسرة بالخارج
      // =========================

      {
        serviceId: serviceMap["طلب اصطحاب أسرة بالخارج"],
        name: "إقرار المرض",
        type: "document",
        required: true,
        minFiles: 1,
        maxFiles: 5,
        allowMultiple: true,
        order: 1,
      },

      {
        serviceId: serviceMap["طلب اصطحاب أسرة بالخارج"],
        name: "طلب اصطحاب الأسرة",
        type: "form",
        required: true,
        downloadableTemplate: true,
        requiresReupload: true,
        minFiles: 1,
        maxFiles: 1,
        order: 2,
      },

      {
        serviceId: serviceMap["طلب اصطحاب أسرة بالخارج"],
        name: "خطاب من إدارة الخدمات الطبية بالكشف الطبي على الزوجة والأولاد",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 3,
      },

      {
        serviceId: serviceMap["طلب اصطحاب أسرة بالخارج"],
        name: "طلب اصطحاب الأسرة (مرفق للإقرار يتم تحميله ثم ملئه وإعادة تحميله بعد الملء)",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 4,
      },

      {
        serviceId: serviceMap["طلب اصطحاب أسرة بالخارج"],
        name: "صورة قسيمة الزواج",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 5,
      },

      {
        serviceId: serviceMap["طلب اصطحاب أسرة بالخارج"],
        name: "صورة البطاقة الشخصية للزوجة",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 6,
      },

      {
        serviceId: serviceMap["طلب اصطحاب أسرة بالخارج"],
        name: "صور شهادات الميلاد للأبناء",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 50,
        allowMultiple: true,
        order: 7,
      },

      {
        serviceId: serviceMap["طلب اصطحاب أسرة بالخارج"],
        name: "نموذج 121 ش ض",
        description: "معتمد ومختوم من شئون الضباط",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 8,
      },

      {
        serviceId: serviceMap["طلب اصطحاب أسرة بالخارج"],
        name: "خطاب من هيئة ق.م",
        description: "في حالة البعثة بأمريكا",
        type: "image",
        required: false,
        minFiles: 0,
        maxFiles: 10,
        allowMultiple: true,
        order: 9,
      },

      {
        serviceId: serviceMap["طلب اصطحاب أسرة بالخارج"],
        name: "صورة التصديق النهائي من الأمانة العامة لوزارة الدفاع",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 10,
      },

      // =========================
      // تكريم المتفوقين
      // =========================

      {
        serviceId: serviceMap["تكريم المتفوقين دراسيًا من أسر الضباط"],
        name: "استمارة التكريم المرفقة عن كل عام",
        type: "form",
        required: true,
        downloadableTemplate: true,
        requiresReupload: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 1,
      },

      {
        serviceId: serviceMap["تكريم المتفوقين دراسيًا من أسر الضباط"],
        name: "تحقيق الشخصية العسكرية لولي أمر المرشح",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 2,
      },

      {
        serviceId: serviceMap["تكريم المتفوقين دراسيًا من أسر الضباط"],
        name: "بطاقة الرقم القومي للمرشح",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 3,
      },

      {
        serviceId: serviceMap["تكريم المتفوقين دراسيًا من أسر الضباط"],
        name: "شهادة ميلاد المرشح",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 4,
      },

      {
        serviceId: serviceMap["تكريم المتفوقين دراسيًا من أسر الضباط"],
        name: "بطاقة الرقم القومي للزوجة وقسيمة الزواج",
        description: "في حالة ترشيح الزوجة",
        type: "image",
        required: false,
        minFiles: 0,
        maxFiles: 10,
        allowMultiple: true,
        order: 5,
      },

      {
        serviceId: serviceMap["تكريم المتفوقين دراسيًا من أسر الضباط"],
        name: "ما يفيد الاستشهاد أو الإصابة",
        description: "بالنسبة لأبناء الشهداء أو المصابين",
        type: "image",
        required: false,
        minFiles: 0,
        maxFiles: 10,
        allowMultiple: true,
        order: 6,
      },

      {
        serviceId: serviceMap["تكريم المتفوقين دراسيًا من أسر الضباط"],
        name: "أصل بيان أو مستخرج النجاح الرسمي",
        description:
          "صادر من الإدارة التعليمية وموضح به الدرجات لكل مادة ومعتمد ومختوم",
        type: "image",
        required: true,
        minFiles: 1,
        maxFiles: 10,
        allowMultiple: true,
        order: 7,
      },

      {
        serviceId: serviceMap["تكريم المتفوقين دراسيًا من أسر الضباط"],
        name: "بالنسبة للحاصلين على الشهادة الجامعية يتم تقديم أصل + صورة من الشهادة المؤقتة للإطلاع عليها معتمدة ومختوم بختم الشعار",
        //description: "للحاصلين على الشهادة الجامعية: أصل + صورة للاطلاع",
        type: "image",
        required: false,
        minFiles: 0,
        maxFiles: 10,
        allowMultiple: true,
        order: 8,
      },
    ];

    await ServiceRequirement.insertMany(requirements);

    console.log("Services added successfully");
    console.log("Requirements added successfully");

    await mongoose.connection.close();

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

seedDatabase();
