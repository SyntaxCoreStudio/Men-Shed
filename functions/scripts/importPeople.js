const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const filePath = path.join(__dirname, "../../dummy-data/WebExpPrsn.txt");

async function importPeople() {
  const fileContent = fs.readFileSync(filePath, "utf8");

  // Keep the structure intact; only trim whitespace from lines
  const lines = fileContent.split(/\r?\n/).map((line) => line.trim());

  let importedCount = 0;
  let currentId = null;

  for (const line of lines) {
    if (line === "|") break; // Stop if separator is hit
    if (line === "") continue; // Skip the blank lines safely

    if (currentId === null) {
      // If we don't have an ID yet, this line must be the ID
      currentId = Number(line);
      if (isNaN(currentId)) {
        console.log(`Skipping invalid ID: "${line}"`);
        currentId = null; // Reset
      }
    } else {
      // If we already have an ID, this line must be the Name
      const personName = line;

      await db.collection("people").doc(String(currentId)).set(
        {
          personId: currentId,
          name: personName,
          searchName: personName.toLowerCase(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      importedCount++;
      console.log(`Imported: ${currentId} - ${personName}`);

      // Reset ID tracker for the next person
      currentId = null;
    }
  }

  console.log(`Import complete. ${importedCount} people imported.`);
}

importPeople().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
