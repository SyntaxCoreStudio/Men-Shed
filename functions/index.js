// index.js

const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const Client = require("ssh2-sftp-client");
const cors = require("cors")({ origin: true });

if (!admin.apps.length) {
  const serviceAccount = require("./serviceAccountKey.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

const EMAIL_HOST = defineSecret("EMAIL_HOST");
const EMAIL_PORT = defineSecret("EMAIL_PORT");
const EMAIL_USER = defineSecret("EMAIL_USER");
const EMAIL_PASS = defineSecret("EMAIL_PASS");

const getSftpConfig = () => {
  const keyPath = path.join(__dirname, "mens_shed_sftp_rsa");
  return {
    host: "20.40.80.70",
    port: 22,
    username: "sftpwebsite",
    privateKey: fs.readFileSync(keyPath, "utf8"),
  };
};

/**
 * HELPER: Universal cleaner for string parsing
 */
const cleanContent = (rawStr) => {
  return rawStr
    .replace(/\r\n/g, "\n")
    .replace(/[\u00A0\xa0]/g, "")
    .trim();
};

/**
 * PIPELINE: Public Contact Page Email Handler
 */
exports.sendContactEmail = onRequest(
  {
    region: "australia-southeast1",
    secrets: [EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS],
  },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST")
        return res.status(405).send("Method not allowed");
      const { name, email, subject, message } = req.body || {};
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ ok: false, error: "Missing fields" });
      }

      const transporter = nodemailer.createTransport({
        host: EMAIL_HOST.value(),
        port: parseInt(EMAIL_PORT.value(), 10),
        secure: EMAIL_PORT.value() === "465",
        auth: { user: EMAIL_USER.value(), pass: EMAIL_PASS.value() },
      });

      try {
        await transporter.sendMail({
          from: `"Carina Men's Shed" <${EMAIL_USER.value()}>`,
          to: EMAIL_USER.value(),
          replyTo: email,
          subject: `New enquiry: ${subject}`,
          text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        });
        return res.status(200).json({ ok: true });
      } catch (err) {
        logger.error("Email processing failed:", err);
        return res
          .status(500)
          .json({ ok: false, error: "Failed to send email" });
      }
    });
  },
);

/**
 * AUTOMATION: Runs every night at 8:00 PM (Brisbane time)
 * Web Interface Inbound Processing Loop (Steps 1-4 of Spec Sheet)
 */
exports.nightlySftpSync = onSchedule(
  {
    region: "australia-southeast1",
    schedule: "0 20 * * *",
    timeZone: "Australia/Brisbane",
    timeoutSeconds: 300,
    memory: "512MiB",
    vpcConnector: "sftp-vpc-connector",
    vpcConnectorEgressSettings: "ALL_TRAFFIC",
  },
  async (event) => {
    logger.info("Initializing Nightly Inbound Sync Routine...");
    const sftp = new Client();

    try {
      await sftp.connect(getSftpConfig());
      const remotePath = "ToWebsite";
      const files = await sftp.list(remotePath);
      const fileMap = new Map(files.map((f) => [f.name.toLowerCase(), f.name]));

      // SPEC ITEM: Verify import/export indicators are present
      if (!fileMap.has("webexptrip.txt")) {
        logger.warn(
          "Indicators missing. Database payload not ready. Halting loop.",
        );
        return;
      }

      // 1. PROCESS MEMBERS LIST (WebExpPrsn.txt) -> Updates Type-ahead search index
      if (fileMap.has("webexpprsn.txt")) {
        logger.info("Syncing updated database members list...");
        const buf = await sftp.get(
          `${remotePath}/${fileMap.get("webexpprsn.txt")}`,
        );
        const blocks = cleanContent(buf.toString("utf8")).split(/\n\n+/);

        for (const block of blocks) {
          if (block === "|") break;
          const lines = block.split("\n").map((l) => l.trim());
          if (lines.length < 2) continue;

          const personId = Number(lines[0]);
          const name = lines[1];
          if (isNaN(personId) || !name) continue;

          await db.collection("people").doc(String(personId)).set(
            {
              personId,
              name,
              searchName: name.toLowerCase(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        }
        await sftp.delete(`${remotePath}/${fileMap.get("webexpprsn.txt")}`);
      }

      // 2. MATCH-BACK NEW PERSON IDs FOR VISITORS & AUTO-PROMOTE TO MEMBERS (WebExpVisNew.txt)
      if (fileMap.has("webexpvisnew.txt")) {
        logger.info("Processing assigned Person IDs for new visitors...");
        const buf = await sftp.get(
          `${remotePath}/${fileMap.get("webexpvisnew.txt")}`,
        );
        const blocks = cleanContent(buf.toString("utf8")).split(/\n\n+/);

        for (const block of blocks) {
          if (block === "|") break;
          const lines = block.split("\n").map((l) => l.trim());
          if (lines.length < 3) continue;

          const visitorId = Number(lines[0]);
          const assignedPersonId = Number(lines[1]);
          const visitorName = lines[2] || "Converted Visitor";

          if (!isNaN(visitorId) && !isNaN(assignedPersonId)) {
            // Write mapping audit log
            await db
              .collection("visitor_id_mapping")
              .doc(String(visitorId))
              .set({
                visitorId,
                personId: assignedPersonId,
                mappedAt: admin.firestore.FieldValue.serverTimestamp(),
              });

            // Promote directly into Type-ahead searchable directory
            await db.collection("people").doc(String(assignedPersonId)).set(
              {
                personId: assignedPersonId,
                name: visitorName,
                searchName: visitorName.toLowerCase(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
          }
        }
        await sftp.delete(`${remotePath}/${fileMap.get("webexpvisnew.txt")}`);
      }

      // 3. REFRESH ACTIVE TRIPS DATABASE WITH ALIGNED INDEXES (WebExpTrip.txt)
      if (fileMap.has("webexptrip.txt")) {
        logger.info("Processing fresh incoming trip definitions...");
        const buf = await sftp.get(
          `${remotePath}/${fileMap.get("webexptrip.txt")}`,
        );
        const blocks = cleanContent(buf.toString("utf8")).split(/\n\n+/);
        const activeTripIds = [];

        for (const block of blocks) {
          if (block === "|") break;
          const lines = block.split("\n").map((l) => l.trim());
          if (lines.length < 4) continue;

          // Shifted indexes to gracefully absorb line 0's Access action directive
          const action = lines[0] || "";
          const tripId = Number(lines[1]);
          const tripName = lines[2];
          const tripDescription = lines[3];
          const start = lines[4] || "";
          const end = lines[5] || "";
          const tripCost = Number(lines[6]) || 0;
          const membersOnly = lines[7] || "";
          const comments = lines[8] || "";

          if (isNaN(tripId) || !tripName) continue;

          if (action.toLowerCase() === "delete") {
            await db.collection("trips").doc(String(tripId)).delete();
            continue;
          }

          activeTripIds.push(tripId);

          await db.collection("trips").doc(String(tripId)).set(
            {
              tripId,
              tripName,
              tripDescription,
              tripDateStart: start,
              tripDateEnd: end,
              tripCost,
              membersOnly,
              comments,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        }

        if (activeTripIds.length > 0) {
          const tripsSnapshot = await db.collection("trips").get();
          const batch = db.batch();
          let deleteCount = 0;
          tripsSnapshot.forEach((doc) => {
            if (!activeTripIds.includes(doc.data().tripId)) {
              batch.delete(doc.ref);
              deleteCount++;
            }
          });
          if (deleteCount > 0) await batch.commit();
        }
        await sftp.delete(`${remotePath}/${fileMap.get("webexptrip.txt")}`);
      }

      logger.info("Nightly structural database ingest completed successfully.");
    } catch (err) {
      logger.error("Nightly SFTP Inbound Task Failed:", err);
    } finally {
      await sftp.end();
    }
  },
);

/**
 * AUTOMATION: Runs every night at 8:15 PM (Brisbane time)
 * Web Interface Outbound Processing Loop (Steps 5-7 of Spec Sheet)
 */
exports.nightlyDatabaseSync = onSchedule(
  {
    region: "australia-southeast1",
    schedule: "15 20 * * *",
    timeZone: "Australia/Brisbane",
    timeoutSeconds: 300,
    memory: "256MiB",
    vpcConnector: "sftp-vpc-connector",
    vpcConnectorEgressSettings: "ALL_TRAFFIC",
  },
  async (event) => {
    logger.info("Initializing Nightly Outbound Sync Routine...");
    const regsSnapshot = await db.collection("web_registrations_staging").get();
    const visitorsSnapshot = await db.collection("web_visitors_staging").get();

    if (regsSnapshot.empty && visitorsSnapshot.empty) {
      logger.info("Outbound data queues are clean. No records to export.");
      return;
    }

    const sftp = new Client();
    try {
      await sftp.connect(getSftpConfig());

      // 1. WRITE OUTBOUND NEW VISITORS (WebImpVisNew.txt) -> Strict 7-Line Block
      if (!visitorsSnapshot.empty) {
        let visPayload = "";
        visitorsSnapshot.forEach((doc) => {
          const data = doc.data();

          // Formats exactly matching Web New Visitor Import structure (7 lines)
          visPayload += `${data.EOF || ""}\r\n`;
          visPayload += `${data.FamilyName || ""}\r\n`;
          visPayload += `${data.OtherNames || ""}\r\n`;
          visPayload += `${data.Gender || ""}\r\n`;
          visPayload += `${data.VisitorID || ""}\r\n`;
          visPayload += `${data.Email || ""}\r\n`;
          visPayload += `${data.Phone || ""}\r\n`;
        });

        visPayload += "|\r\n"; // End of file structural boundary marker
        await sftp.put(
          Buffer.from(visPayload, "utf8"),
          "ToDatabase/WebImpVisNew.txt",
        );
        logger.info(
          `Exported ${visitorsSnapshot.size} new visitors to WebImpVisNew.txt`,
        );
      }

      // 2. WRITE OUTBOUND TRIP BOOKINGS (WebImpReg.txt) -> Strict 8-Line Block matching image_9f7766.jpg
      if (!regsSnapshot.empty) {
        let regPayload = "";
        regsSnapshot.forEach((doc) => {
          const data = doc.data();

          // Separate regular Member IDs from 6-digit temporary Visitor IDs (100000+)
          const isVisitor = data.PersonID && data.PersonID >= 100000;
          const personIdField = isVisitor ? 0 : data.PersonID || 0;
          const visitorIdField = isVisitor ? data.PersonID : 0;

          // Formats exactly matching the 8-line Web Trip Registrations Import schema
          regPayload += `${data.EOF || ""}\r\n`;
          regPayload += `${personIdField}\r\n`;
          regPayload += `${visitorIdField}\r\n`;
          regPayload += `${data.TripID || ""}\r\n`;
          regPayload += `Add\r\n`;
          regPayload += `${typeof data.PaidAmount === "number" ? data.PaidAmount.toFixed(2) : "0.00"}\r\n`;
          regPayload += `${data.PaidDate || ""}\r\n`;
          regPayload += `${data.Comments || "None Specified"}\r\n`;
        });

        regPayload += "|\r\n"; // End of file structural boundary marker
        await sftp.put(
          Buffer.from(regPayload, "utf8"),
          "ToDatabase/WebImpReg.txt",
        );
        logger.info(
          `Exported ${regsSnapshot.size} trip bookings to WebImpReg.txt`,
        );
      }

      // Wipe staging logs clean atomically to avoid duplicate export records tomorrow
      const cleanupBatch = db.batch();
      regsSnapshot.forEach((doc) => cleanupBatch.delete(doc.ref));
      visitorsSnapshot.forEach((doc) => cleanupBatch.delete(doc.ref));
      await cleanupBatch.commit();

      logger.info("Staging environments successfully cleared.");
    } catch (err) {
      logger.error("Nightly Database Outbound Sync Failed:", err);
    } finally {
      await sftp.end();
    }
  },
);
