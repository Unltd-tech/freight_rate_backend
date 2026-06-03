require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { getData, getOptions, reloadExcel } = require("./services/excelService");
const { calculateEstimate } = require("./services/calculator");
const { sendEstimateEmails } = require("./services/emailService");
const multer = require("multer");

const app = express();

app.use(
  cors({
    origin: "https://calculator.qbh.qa",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
const PORT = process.env.PORT || 5000;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "data/");
  },

  filename: function (req, file, cb) {
    cb(null, "freight_rates.xlsx");
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.originalname.endsWith(".xlsx")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only .xlsx files are allowed"));
    }
  },
});

const relocationUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB each
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

app.get("/", (req, res) => {
  res.send("QBH Calculator API running 🚀");
});

app.get("/api/options", async (req, res) => {
  try {
    const options = await getOptions();
    res.json(options);
  } catch (err) {
    res.status(500).json({ message: "Error loading options" });
  }
});

app.post("/api/upload-pricing", upload.single("file"), async (req, res) => {
  try {
    const { password } = req.body;

    if (password !== process.env.UPLOAD_PASSWORD) {
      return res.status(401).json({
        success: false,
        message: "Invalid upload password",
      });
    }

    reloadExcel();

    res.json({
      success: true,
      message: "freight rates Excel uploaded successfully",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Upload failed",
    });
  }
});

app.post("/api/estimate", async (req, res) => {
  try {
    const { freightType, details, customerInfo } = req.body;

    const data = await getData();
    if (!customerInfo?.name || !customerInfo?.email || !customerInfo?.phone) {
      return res.status(400).json({
        success: false,
        message: "Customer details are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(customerInfo.email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }
    const estimate = calculateEstimate(freightType, details, data);

    if (estimate === null || Number.isNaN(estimate)) {
      return res.json({
        success: true,
        freightType,
        estimate: "Quote Pending",
        currency: "QAR",
        message: "Our team will contact you with the best available rate.",
        disclaimer:
          "Final pricing may vary based on handling, customs, fuel surcharge, availability, and operational conditions.",
      });
    }

    sendEstimateEmails({
      freightType,
      details,
      customerInfo,
      estimate,
    }).catch((err) => {
      console.error("Email sending failed:", err);
    });

    res.json({
      success: true,
      freightType,
      estimate,
      currency: "QAR",
      customerInfo: customerInfo || null,
      disclaimer:
        "Final pricing may vary based on handling, customs, fuel surcharge, availability, and operational conditions.",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Calculation failed",
    });
  }
});

app.post(
  "/api/relocation-enquiry",
  relocationUpload.array("images", 5),
  async (req, res) => {
    try {
      const { from, to, name, email, phone } = req.body;

      if (!from || !to || !name || !email || !phone) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email address",
        });
      }
      sendEstimateEmails({
        freightType: "Relocation",
        details: { from, to },
        customerInfo: { name, email, phone },
        estimate: "Quote Pending",
        attachments: req.files,
      }).catch((err) => {
        console.error("Relocation email sending failed:", err);
      });

      res.json({
        success: true,
        estimate: "Quote Pending",
        currency: "QAR",
        message:
          "Your relocation enquiry has been submitted. Our team will contact you.",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: "Relocation enquiry failed",
      });
    }
  },
);


app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
