import { db, storage, auth } from "../firebase-init.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const titleInput = document.getElementById("issueTitle");
const issueNumberInput = document.getElementById("issueNumber");

const fileInput = document.getElementById("nutsBoltsFile");
const selectBtn = document.getElementById("selectNutsBoltsBtn");
const uploadBtn = document.getElementById("uploadNutsBoltsBtn");
const selectedText = document.getElementById("nutsBoltsSelected");
const statusText = document.getElementById("nutsBoltsStatus");

let selectedFile = null;

selectBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", (e) => {
  selectedFile = e.target.files[0] || null;

  if (!selectedFile) {
    selectedText.textContent = "";
    uploadBtn.disabled = true;
    return;
  }

  const isPdf =
    selectedFile.type === "application/pdf" ||
    selectedFile.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    selectedText.textContent = "Please choose a PDF file.";
    selectedFile = null;
    fileInput.value = "";
    uploadBtn.disabled = true;
    return;
  }

  selectedText.textContent = `Selected: ${selectedFile.name}`;
  uploadBtn.disabled = false;
});

uploadBtn.addEventListener("click", async () => {
  try {
    const title = titleInput.value.trim();
    const issueNumber = Number(issueNumberInput.value);

    if (!title) throw new Error("Please enter an issue title.");
    if (!issueNumber) throw new Error("Please enter an issue number.");
    if (!selectedFile) throw new Error("Please select a PDF file.");

    uploadBtn.disabled = true;
    statusText.textContent = "Uploading issue...";

    const safeFileName = selectedFile.name.replace(/\s+/g, "-");
    const storagePath = `nuts-and-bolts/${safeFileName}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, selectedFile, {
      contentType: "application/pdf",
    });

    const fileUrl = await getDownloadURL(storageRef);

    await addDoc(collection(db, "nutsAndBoltsIssues"), {
      title,
      issueNumber,
      fileName: selectedFile.name,
      fileUrl,
      storagePath,
      createdAt: serverTimestamp(),
    });

    statusText.textContent = "Issue uploaded successfully.";

    titleInput.value = "";
    issueNumberInput.value = "";
    fileInput.value = "";
    selectedText.textContent = "";
    selectedFile = null;
    uploadBtn.disabled = true;
  } catch (error) {
    statusText.textContent = `Error: ${error.message}`;
    uploadBtn.disabled = false;
  }
});

const logoutBtn = document.getElementById("logoutBtn");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "../members.html";
    return;
  }

  console.log("Logged in as:", user.email);
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "../members.html";
    } catch (error) {
      console.error("Logout error:", error);
      alert("Failed to log out. Please try again.");
    }
  });
}