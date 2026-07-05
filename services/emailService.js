require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_HOST_USER,
    pass: process.env.EMAIL_HOST_PASSWORD,
  },
});

const emailFooter = `
<hr style="margin:30px 0;border:none;border-top:1px solid #ddd;">

<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333;line-height:1.7;">

  <p><strong>Best Regards,</strong></p>

  <p>
    <strong>QBH Logistics®</strong><br>
    P.O. Box: 18930, C101, Gate No-5,<br>
    Floor No-1, Street No-900,<br>
    Safwa Building, The Commercial Avenue,<br>
    Doha, Qatar
  </p>

  <p>
    📧 <a href="mailto:sales02@qbh.qa">sales02@qbh.qa</a><br>
    🌐 <a href="https://www.qbh.qa">www.qbh.qa</a><br>
    ☎ +974 6634 2244 | +974 4442 7474
  </p>

  <p style="color:#b71c1c;font-weight:bold;">
    Important Notice
  </p>

  <p style="color:#b71c1c;">
    Emergency War Risk Surcharge applies to all shipments to/from Qatar,
    including shipments in transit and new bookings.
    ETD/ETA is subject to change without prior notice.
    All shipments are subject to the respective shipping line's
    terms and conditions.
  </p>

  <p style="color:#b71c1c;">
    Effective August 01, 2023, all shipments must be properly palletized
    before being submitted for Qatar customs clearance.
    Non-compliance may result in delays and penalties.
  </p>

  <p style="color:#b71c1c;">
    Due to ongoing regional circumstances, there may be unexpected delays
    beyond the control of QBH Logistics or the booking agents.
    We appreciate your understanding.
  </p>

  <div style="margin-top:25px;text-align:center;">
    <img
      src="https://api.qbh.qa/images/qbh-email-footer.jpeg"
      alt="QBH Logistics"
      style="max-width:100%;height:auto;border:0;"
    />
  </div>

</div>
`;

async function sendEstimateEmails({
  freightType,
  details,
  customerInfo,
  estimate,
  attachments = [],
}) {
  const opsEmail = process.env.OPS_EMAIL;

  const customerHtml = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#333;line-height:1.7;">

      <h2 style="color:#0B1F3A;">Thank you for your enquiry</h2>

      <p>Hi <strong>${customerInfo.name}</strong>,</p>

      <p>
        Thank you for contacting QBH Logistics.
        Your estimate request has been received successfully.
      </p>

      <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td><strong>Freight Type</strong></td>
          <td>${freightType}</td>
        </tr>

        <tr>
          <td><strong>${
            freightType === "Relocation" ? "Status" : "Estimated Price"
          }</strong></td>

          <td>
            ${
              freightType === "Relocation" ? "Quote Pending" : `${estimate} QAR`
            }
          </td>
        </tr>
      </table>

      <p>
        ${
          freightType === "Relocation"
            ? "Our operations team will contact you shortly regarding your relocation enquiry."
            : "Our team will review your request and get back to you with the final quotation."
        }
      </p>

      <p style="font-size:13px;color:#666;">
        Final pricing may vary depending on handling charges,
        customs requirements, fuel surcharge, availability,
        and operational conditions.
      </p>

      ${emailFooter}

    </div>
  `;

  const opsHtml = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#333;line-height:1.7;">

      <h2 style="color:#0B1F3A;">New Estimate Enquiry</h2>

      <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td><strong>Name</strong></td>
          <td>${customerInfo.name}</td>
        </tr>

        <tr>
          <td><strong>Email</strong></td>
          <td>${customerInfo.email}</td>
        </tr>

        <tr>
          <td><strong>Phone</strong></td>
          <td>${customerInfo.phone}</td>
        </tr>

        <tr>
          <td><strong>Freight Type</strong></td>
          <td>${freightType}</td>
        </tr>

        <tr>
          <td><strong>Estimate</strong></td>
          <td>${estimate === "Quote Pending" ? estimate : `${estimate} QAR`}</td>
        </tr>
      </table>

      <h3>Request Details</h3>

      <pre style="background:#f5f5f5;padding:15px;border-radius:8px;">
${JSON.stringify(details, null, 2)}
      </pre>

      ${emailFooter}

    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_HOST_USER,
    to: customerInfo.email,
    subject: "Your QBH Freight Estimate Request",
    html: customerHtml,
  });

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
