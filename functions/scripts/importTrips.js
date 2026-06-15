// scripts/importTrips.js
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  const serviceAccount = require("../serviceAccountKey.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const filePath = path.join(__dirname, "../../dummy-data/WebExpTrip.txt");

async function importTrips() {
  if (!fs.existsSync(filePath)) {
    console.error(
      `[Sync Error] Import file missing at ${filePath}. Postponing run.`,
    );
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath, "utf8");

  // 1. Normalize line endings, strip out hidden non-breaking space garbage, then split by clean double-newlines
  const normalizedContent = fileContent
    .replace(/\r\n/g, "\n")
    .replace(/[\u00A0\xa0]/g, ""); // Clean the file globally before splitting blocks!

  const tripBlocks = normalizedContent
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter((block) => block !== "");

  let importedCount = 0;
  const activeTripIds = [];

  for (const block of tripBlocks) {
    // If we hit the explicit end-of-file symbol, stop immediately
    if (block === "|") {
      console.log("Encountered EOF symbol '|'. Stopping processing.");
      break;
    }

    // 2. Split this specific block into its individual lines
    const lines = block.split("\n").map((line) => line.trim());

    // Ensure we don't process a stray separator or broken fragment
    if (lines.length < 2) continue;

    // 3. Map the fields. If a line doesn't exist or is empty, it falls back gracefully.
    const tripId = Number(lines[0]);
    const tripName = lines[1];
    const tripDescription = lines[2];
    const start = lines[3] || "";
    const end = lines[4] || "";
    const tripCost = lines[5] ? Number(lines[5].replace(/[^0-9.]/g, "")) : 0;
    const membersOnly = lines[6] || "";
    const comments = lines[7] || "";

    // Basic structural validation
    if (isNaN(tripId) || !tripName) {
      console.log(
        `Skipping invalid sequence block: ID "${lines[0]}", Name "${lines[1]}"`,
      );
      continue;
    }

    activeTripIds.push(tripId);

    // Save or merge straight into your Firestore "trips" collection
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

    importedCount++;
    console.log(`Imported Trip: ${tripId} - ${tripName}`);
  }

  console.log(`Import complete. ${importedCount} trips successfully updated.`);

  if (activeTripIds.length > 0) {
    await clearStaleTrips(activeTripIds);
  }
}

async function clearStaleTrips(activeTripIds) {
  try {
    const tripsRef = db.collection("trips");
    const snapshot = await tripsRef.get();

    let deleteCount = 0;
    const batch = db.batch();

    snapshot.forEach((doc) => {
      const dbTripId = doc.data().tripId;
      if (!activeTripIds.includes(dbTripId)) {
        batch.delete(doc.ref);
        deleteCount++;
      }
    });

    if (deleteCount > 0) {
      await batch.commit();
      console.log(`Cleaned up ${deleteCount} old trips from Firestore.`);
    }
  } catch (error) {
    console.error("Error cleaning up stale records:", error);
  }
}

importTrips()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  });
