import { db, storage, auth } from "../firebase-init.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
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
const membersManagerSection = document.getElementById("membersManagerSection");

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
      membersManagerSection.style.display = "none";
      dashboardHeader.textContent = "All Files Management";
      loadFilesForManagement("nutsAndBoltsIssues");
      } else if (link.classList.contains("members") || link.innerText.includes("Members")) {
      dashboardView.style.display = "none";
      fileManagerView.style.display = "none";
      membersManagerSection.style.display = "block"; // Show members view
      dashboardHeader.textContent = "Manage Committee Members";
      loadCommitteeMembers();
    } else {
      dashboardView.style.display = "grid";
      fileManagerView.style.display = "none";
      membersManagerSection.style.display = "none";
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
    autoFillNextNumbers();
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
  if (!user) { window.location.href = "../index.html";
} else {
  autoFillNextNumbers();
}
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


/* ==========================================
   6. AUTO-INCREMENT SETUP
   ========================================== */
async function autoFillNextNumbers() {
  try {
    // 1. Fetch latest Nuts & Bolts Issue Number
    const nutsQuery = query(collection(db, "nutsAndBoltsIssues"), orderBy("issueNumber", "desc"));
    const nutsSnapshot = await getDocs(nutsQuery);
    if (!nutsSnapshot.empty) {
      const highestNuts = nutsSnapshot.docs[0].data().issueNumber;
      const nextNutsNum = Number(highestNuts) + 1;
      
      const issueNumberInput = document.getElementById("issueNumber");
      if (issueNumberInput && !issueNumberInput.value) {
        issueNumberInput.value = nextNutsNum;
        issueNumberInput.placeholder = nextNutsNum;
      }
    }

    // 2. Fetch latest Monday Meeting Number
    const meetingQuery = query(collection(db, "mondayMeetings"), orderBy("issueNumber", "desc"));
    const meetingSnapshot = await getDocs(meetingQuery);
    if (!meetingSnapshot.empty) {
      const highestMeeting = meetingSnapshot.docs[0].data().issueNumber;
      const nextMeetingNum = Number(highestMeeting) + 1;
      
      const meetingNumberInput = document.getElementById("meetingNumber");
      if (meetingNumberInput && !meetingNumberInput.value) {
        meetingNumberInput.value = nextMeetingNum;
        meetingNumberInput.placeholder = nextMeetingNum;
      }
    }
  } catch (error) {
    console.error("Error fetching next auto-increment numbers:", error);
  }
}

/* ==========================================
   7. COMMITTEE MEMBERS MANAGEMENT
   ========================================== */
let cachedCommitteeMembers = [];

async function loadCommitteeMembers() {
  const tbody = document.getElementById("memberListBody");
  if (!tbody) return;

  tbody.innerHTML = "<tr><td colspan='3' style='text-align: center;'>Loading members...</td></tr>";

  try {
    // Query sorted by the 'order' field
    const q = query(collection(db, "committeeMembers"), orderBy("order", "asc"));
    const snapshot = await getDocs(q);

    tbody.innerHTML = "";
    cachedCommitteeMembers = [];

    if (snapshot.empty) {
      tbody.innerHTML = "<tr><td colspan='3' style='text-align: center;'>No members found.</td></tr>";
      return;
    }

    snapshot.forEach((docSnap) => {
      cachedCommitteeMembers.push({ id: docSnap.id, ...docSnap.data() });
    });

    cachedCommitteeMembers.forEach((data, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${data.role}</td>
        <td>${data.name}</td>
        <td>
          <button class="move-btn" data-index="${index}" data-direction="up" ${index === 0 ? "disabled" : ""}>⬆️</button>
          <button class="move-btn" data-index="${index}" data-direction="down" ${index === cachedCommitteeMembers.length - 1 ? "disabled" : ""}>⬇️</button>
          <button class="delete-btn" data-id="${data.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Attach event listeners for move buttons
    tbody.querySelectorAll(".move-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = parseInt(btn.dataset.index);
        const direction = btn.dataset.direction;
        moveMemberOrder(index, direction);
      });
    });

    // Attach delete events
    tbody.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => deleteCommitteeMember(btn.dataset.id));
    });
  } catch (error) {
    console.error("Error loading members:", error);
    tbody.innerHTML = "<tr><td colspan='3' style='text-align: center;'>Error loading members.</td></tr>";
  }
}

// Function to swap orders in Firestore
async function moveMemberOrder(index, direction) {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= cachedCommitteeMembers.length) return;

  const currentMember = cachedCommitteeMembers[index];
  const targetMember = cachedCommitteeMembers[targetIndex];

  try {
    // Swap their order values in Firestore
    const currentRef = doc(db, "committeeMembers", currentMember.id);
    const targetRef = doc(db, "committeeMembers", targetMember.id);

    // Import updateDoc from firebase-firestore at the top of your file if not already imported
    await updateDoc(currentRef, { order: targetMember.order });
    await updateDoc(targetRef, { order: currentMember.order });

    // Reload list to reflect new order
    loadCommitteeMembers();
  } catch (error) {
    console.error("Error reordering members:", error);
    alert("Could not reorder members.");
  }
}

async function handleAddMember() {
  const roleInput = document.getElementById("memberRole");
  const nameInput = document.getElementById("memberName");
  const statusText = document.getElementById("memberStatus");

  const role = roleInput.value.trim();
  const name = nameInput.value.trim();

  if (!role || !name) {
    statusText.textContent = "Please fill in both fields.";
    return;
  }

  try {
    statusText.textContent = "Adding member...";
    
    // Get current count to determine the next order index
    const snapshot = await getDocs(collection(db, "committeeMembers"));
    const nextOrder = snapshot.size;

    await addDoc(collection(db, "committeeMembers"), {
      role,
      name,
      order: nextOrder, // Assign sequential order
      createdAt: serverTimestamp(),
    });

    statusText.textContent = "Member added successfully!";
    roleInput.value = "";
    nameInput.value = "";
    loadCommitteeMembers();
  } catch (error) {
    statusText.textContent = `Error: ${error.message}`;
    console.error(error);
  }
}

async function deleteCommitteeMember(docId) {
  if (!confirm("Are you sure you want to remove this member?")) return;
  try {
    await deleteDoc(doc(db, "committeeMembers", docId));
    loadCommitteeMembers();
  } catch (error) {
    alert("Could not delete member.");
    console.error(error);
  }
}

const addMemberBtn = document.getElementById("addMemberBtn");
if (addMemberBtn) {
  addMemberBtn.addEventListener("click", handleAddMember);
}