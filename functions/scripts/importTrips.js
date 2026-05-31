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

  // Keep empty lines intact so our 8-line record block indexing remains aligned
  const lines = fileContent.split(/\r?\n/).map((line) => line.trim());

  let importedCount = 0;
  const activeTripIds = [];

  // Loop through lines utilizing a strict 8-line record stride
  for (let i = 0; i < lines.length; i += 8) {
    // If we hit the explicit end-of-file symbol, break immediately
    if (lines[i] === "|") {
      console.log("Encountered EOF symbol '|'. Stopping processing.");
      break;
    }

    // Ensure we have a complete 8-line block available to parse safely
    if (i + 7 >= lines.length) break;

    // Mapping exactly to your specified field layout:
    const tripId = Number(lines[i]);
    const tripName = lines[i + 1];
    const tripCost = Number(lines[i + 2]) || 0;
    const start = lines[i + 3];
    const end = lines[i + 4];
    const action = lines[i + 5];
    const notes = lines[i + 6];
    const comments = lines[i + 7];

    // Basic structural validation
    if (!tripId || !tripName) {
      console.log(
        `Skipping invalid or incomplete sequence block starting at line ${i + 1}`,
      );
      continue;
    }

    activeTripIds.push(tripId);

    // Save or merge straight into your Firestore "trips" collection
    await db
      .collection("trips")
      .doc(String(tripId))
      .set(
        {
          tripId,
          tripName,
          tripCost,
          tripDateStart: start, // mapping "start" to frontend display
          tripDateEnd: end, // mapping "end" to frontend display
          action: action || "",
          tripDesc: notes || "", // mapping "notes" field to your frontend description container
          comments: comments || "",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    importedCount++;
    console.log(`Imported Trip: ${tripId} - ${tripName}`);
  }

  console.log(`Import complete. ${importedCount} trips successfully updated.`);

  // Clean away stale entries no longer active in the Access export file
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
