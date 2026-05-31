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

  const lines = fileContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");

  let importedCount = 0;

  for (let i = 0; i < lines.length; i += 2) {
    if (lines[i] === "|") break;

    const personId = Number(lines[i]);
    const personName = lines[i + 1];

    if (!personId || !personName) {
      console.log(`Skipping invalid record at line ${i + 1}`);
      continue;
    }

    await db.collection("people").doc(String(personId)).set(
      {
        personId,
        name: personName,
        searchName: personName.toLowerCase(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    importedCount++;
    console.log(`Imported: ${personId} - ${personName}`);
  }

  console.log(`Import complete. ${importedCount} people imported.`);
}

importPeople().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
