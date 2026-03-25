import { db, storage, auth } from "../firebase-init.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  ref as sRef,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

/* ==========================================
   1. GLOBAL SELECTORS
   ========================================== */
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebar = document.querySelector(".sidebar");
const navLinks = document.querySelectorAll(".nav-item");
const dashboardView = document.querySelector(".grid-container");
const dashboardHeader = document.querySelector(".dashboard-header h1");
const fileManagerView = document.getElementById("fileManagerSection");

/* ==========================================
   2. NAVIGATION & MOBILE LOGIC
   ========================================== */

// Mobile Menu Toggle
if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });
}

// Unified Navigation Logic
navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();

    // UI Update: Active Tab
    navLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");

    // Toggle Visibility
    if (link.innerText.includes("All Files")) {
      dashboardView.style.display = "none";
      fileManagerView.style.display = "block";
      dashboardHeader.textContent = "All Files Management";
      loadFilesForManagement("nutsAndBoltsIssues"); // Default tab
    } else {
      dashboardView.style.display = "grid";
      fileManagerView.style.display = "none";
      dashboardHeader.textContent = "Dashboard Overview";
    }

    // CLOSE SIDEBAR ON MOBILE AFTER CLICK
    if (window.innerWidth <= 768) {
      sidebar.classList.remove("active");
    }
  });
});

/* ==========================================
   3. UPLOAD LOGIC
   ========================================== */
async function handleUpload({
  titleId,
  numberId,
  fileInputId,
  statusId,
  uploadBtnId,
  storageFolder,
  firestoreCol,
}) {
  const titleInput = document.getElementById(titleId);
  const numberInput = document.getElementById(numberId);
  const fileInput = document.getElementById(fileInputId);
  const statusText = document.getElementById(statusId);
  const uploadBtn = document.getElementById(uploadBtnId);
  const selectedFile = fileInput.files[0];

  try {
    const title = titleInput.value.trim();
    const issueNumber = Number(numberInput.value);

    if (!title || !issueNumber || !selectedFile) {
      throw new Error("Please fill in all fields and select a PDF.");
    }

    if (uploadBtn) uploadBtn.disabled = true;
    statusText.textContent = "Uploading...";

    const safeFileName = `${Date.now()}-${selectedFile.name.replace(/\s+/g, "-")}`;
    const storagePath = `${storageFolder}/${safeFileName}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, selectedFile, {
      contentType: "application/pdf",
    });
    const fileUrl = await getDownloadURL(storageRef);

    await addDoc(collection(db, firestoreCol), {
      title,
      issueNumber,
      fileName: selectedFile.name,
      fileUrl,
      storagePath,
      createdAt: serverTimestamp(),
    });

    statusText.textContent = "Success! Upload complete.";

    titleInput.value = "";
    numberInput.value = "";
    fileInput.value = "";
    const selectedTextElem = document.getElementById(
      fileInputId.replace("File", "Selected"),
    );
    if (selectedTextElem) selectedTextElem.textContent = "";
  } catch (error) {
    statusText.textContent = `Error: ${error.message}`;
    console.error(error);
    if (uploadBtn) uploadBtn.disabled = false;
  }
}

function setupFileSelect(btnId, inputId, textId, uploadBtnId) {
  const btn = document.getElementById(btnId);
  const input = document.getElementById(inputId);
  const text = document.getElementById(textId);
  const uploadBtn = document.getElementById(uploadBtnId);

  if (!btn || !input) return;

  btn.addEventListener("click", () => input.click());
  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (text) text.textContent = file ? `Selected: ${file.name}` : "";
    if (uploadBtn) uploadBtn.disabled = !file;
  });
}

setupFileSelect(
  "selectNutsBoltsBtn",
  "nutsBoltsFile",
  "nutsBoltsSelected",
  "uploadNutsBoltsBtn",
);
setupFileSelect(
  "selectMondayBtn",
  "mondayFile",
  "mondaySelected",
  "uploadMondayBtn",
);

document.getElementById("uploadNutsBoltsBtn").addEventListener("click", () => {
  handleUpload({
    titleId: "issueTitle",
    numberId: "issueNumber",
    fileInputId: "nutsBoltsFile",
    statusId: "nutsBoltsStatus",
    uploadBtnId: "uploadNutsBoltsBtn",
    storageFolder: "nuts-and-bolts",
    firestoreCol: "nutsAndBoltsIssues",
  });
});

document.getElementById("uploadMondayBtn").addEventListener("click", () => {
  handleUpload({
    titleId: "meetingTitle",
    numberId: "meetingNumber",
    fileInputId: "mondayFile",
    statusId: "mondayStatus",
    uploadBtnId: "uploadMondayBtn",
    storageFolder: "monday-meetings",
    firestoreCol: "mondayMeetings",
  });
});

/* ==========================================
   4. FILE MANAGEMENT
   ========================================== */
async function loadFilesForManagement(colName) {
  const tbody = document.getElementById("fileListBody");
  const status = document.getElementById("fileManagerStatus");
  if (!tbody) return;

  tbody.innerHTML = "";
  status.textContent = "Loading files...";

  try {
    const q = query(collection(db, colName), orderBy("issueNumber", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      status.textContent = "No files found.";
      return;
    }

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${data.title}</td>
        <td>#${data.issueNumber}</td>
        <td>${data.createdAt?.toDate().toLocaleDateString() || "N/A"}</td>
        <td>
          <button class="delete-btn" data-id="${docSnap.id}" data-path="${data.storagePath}" data-col="${colName}">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        deleteFile(btn.dataset.col, btn.dataset.id, btn.dataset.path),
      );
    });

    status.textContent = "";
  } catch (error) {
    status.textContent = "Error loading files.";
  }
}

async function deleteFile(colName, docId, storagePath) {
  if (!confirm("Are you sure? This will delete the PDF forever.")) return;
  try {
    const fileRef = sRef(storage, storagePath);
    await deleteObject(fileRef);
    await deleteDoc(doc(db, colName, docId));
    alert("Deleted successfully.");
    loadFilesForManagement(colName);
  } catch (error) {
    alert("Could not delete. Check console.");
  }
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    loadFilesForManagement(btn.dataset.col);
  });
});

/* ==========================================
   5. AUTH & LOGOUT
   ========================================== */
onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = "../index.html";
});

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "../index.html";
    } catch (error) {
      alert("Logout failed.");
    }
  });
}
