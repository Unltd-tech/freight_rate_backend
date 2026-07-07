require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const { getData, getOptions, reloadExcel } = require("./services/excelService");
const { calculateEstimate } = require("./services/calculator");
const { sendEstimateEmails } = require("./services/emailService");

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://calculator.qbh.qa",
];

app.use(express.static(path.join(__dirname, "public")));

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

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
    fileSize: 5 * 1024 * 1024,
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
    console.error("Options loading failed:", err);
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

    await reloadExcel();

    res.json({
      success: true,
      message: "Freight rates Excel uploaded successfully",
    });
  } catch (err) {
    console.error("Upload failed:", err);

    res.status(500).json({
      success: false,
      message: "Upload failed",
    });
  }
});

app.post("/api/estimate", async (req, res) => {
  try {
    const { freightType, details, customerInfo } = req.body;

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
    const phoneRegex = /^\+[1-9]\d{7,14}$/;

    if (!phoneRegex.test(customerInfo.phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mobile number",
      });
    }

    const data = await getData();
    const estimate = calculateEstimate(freightType, details, data);

    if (estimate === null || Number.isNaN(estimate)) {
      sendEstimateEmails({
        freightType,
        details,
        customerInfo,
        estimate: "Quote Pending",
      }).catch((err) => {
        console.error("Quote pending email failed:", err);
      });

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
      customerInfo,
      disclaimer:
        "Final pricing may vary based on handling, customs, fuel surcharge, availability, and operational conditions.",
    });
  } catch (err) {
    console.error("Calculation failed:", err);

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
      const phoneRegex = /^\+[1-9]\d{7,14}$/;

      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Invalid mobile number",
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
      console.error("Relocation enquiry failed:", err);

      res.status(500).json({
        success: false,
        message: "Relocation enquiry failed",
      });
    }
  },
);

app.use((err, req, res, next) => {
  console.error("Server error:", err.message);

  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
