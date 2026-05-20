require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_HOST_USER,
    pass: process.env.EMAIL_HOST_PASSWORD,
  },
});

async function sendEstimateEmails({
  freightType,
  details,
  customerInfo,
  estimate,
  attachments = [],
}) {
  const opsEmail = process.env.OPS_EMAIL;

  const customerHtml = `
    <h2>Thank you for your enquiry</h2>
    <p>Hi ${customerInfo.name},</p>
    <p>Your estimate request has been received.</p>
    <p><strong>Freight Type:</strong> ${freightType}</p>
    <p>
      <strong>
        ${freightType === "Relocation" ? "Status" : "Estimated Price"}:
      </strong>
      ${
        freightType === "Relocation"
          ? " Quote Pending"
          : ` ${estimate} QAR`
      }
    </p>
    <p>
      ${
        freightType === "Relocation"
          ? "Our operations team will connect with you shortly regarding your relocation enquiry."
          : "Our team will contact you with the final best rate."
      }
    </p>
    <p><small>Final pricing may vary based on handling, customs, fuel surcharge, availability, and operational conditions.</small></p>
  `;

  const opsHtml = `
    <h2>New Estimate Enquiry</h2>
    <p><strong>Name:</strong> ${customerInfo.name}</p>
    <p><strong>Email:</strong> ${customerInfo.email}</p>
    <p><strong>Phone:</strong> ${customerInfo.phone}</p>
    <p><strong>Freight Type:</strong> ${freightType}</p>
    <p><strong>Estimate:</strong> ${estimate} QAR</p>
    <h3>Request Details</h3>
    <pre>${JSON.stringify(details, null, 2)}</pre>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_HOST_USER,
    to: customerInfo.email,
    subject: "Your QBH Freight Estimate Request",
    html: customerHtml,
  });

  console.log("Sending ops email to:", opsEmail);

  await transporter.sendMail({
    from: process.env.EMAIL_HOST_USER,
    to: opsEmail,
    subject: "New QBH Estimate Enquiry",
    html: opsHtml,
    attachments: attachments.map((file) => ({
      filename: file.originalname,
      content: file.buffer,
    })),
  });
}

module.exports = { sendEstimateEmails };
