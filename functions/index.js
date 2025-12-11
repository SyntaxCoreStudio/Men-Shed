const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const nodemailer = require("nodemailer");
const cors = require("cors")({ origin: true });

// Secrets from `firebase functions:secrets:set ...`
const EMAIL_HOST = defineSecret("EMAIL_HOST");
const EMAIL_PORT = defineSecret("EMAIL_PORT");
const EMAIL_USER = defineSecret("EMAIL_USER");
const EMAIL_PASS = defineSecret("EMAIL_PASS");

exports.sendContactEmail = onRequest(
  {
    region: "australia-southeast1",
    secrets: [EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS],
  },
  async (req, res) => {
    // Handle CORS
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).send("Method not allowed");
      }

      const { name, email, subject, message } = req.body || {};

      if (!name || !email || !subject || !message) {
        return res.status(400).json({
          ok: false,
          error: "Missing required fields",
        });
      }

      const transporter = nodemailer.createTransport({
        host: EMAIL_HOST.value(),
        port: parseInt(EMAIL_PORT.value(), 10),
        secure: EMAIL_PORT.value() === "465",
        auth: {
          user: EMAIL_USER.value(),
          pass: EMAIL_PASS.value(),
        },
      });

      const mailOptions = {
        from: `"Carina Men's Shed" <${EMAIL_USER.value()}>`,
        to: EMAIL_USER.value(),
        replyTo: email,
        subject: `New enquiry: ${subject}`,
        text: `Name: ${name}
Email: ${email}

Message:
${message}`,
      };

      try {
        await transporter.sendMail(mailOptions);
        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error("Email error:", err);
        return res.status(500).json({
          ok: false,
          error: "Failed to send email",
        });
      }
    });
  }
);
