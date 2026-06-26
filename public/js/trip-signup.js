// js/trip-signup.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  startAt,
  endAt,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase App Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCFKOGoBQ6KXRwFhfD2K8L4qeGpX42fSsQ",
  authDomain: "carina-mens-shed.firebaseapp.com",
  projectId: "carina-mens-shed",
  storageBucket: "carina-mens-shed.firebasestorage.app",
  messagingSenderId: "547280065983",
  appId: "1:547280065983:web:beeb8009c3c34a2d2e3d0a",
};

// Initialize Firebase App & Firestore Instance
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
  loadLiveTrips();
});

/**
 * Fetches dynamic trip information from the Firestore "trips" collection
 */
async function loadLiveTrips() {
  const tripList = document.getElementById("tripList");
  const tripStatus = document.getElementById("tripListStatus");

  if (!tripList) return;

  try {
    const tripsSnapshot = await getDocs(collection(db, "trips"));

    if (tripStatus) tripStatus.style.display = "none";
    tripList.innerHTML = "";

    if (tripsSnapshot.empty) {
      tripList.innerHTML = `<li style="color: #627085; padding: 10px;">No upcoming trips listed at this time.</li>`;
      return;
    }

    tripsSnapshot.forEach((doc) => {
      const trip = doc.data();

      if (trip.action && trip.action.toLowerCase() === "delete") {
        return;
      }

      const li = document.createElement("li");
      li.style.marginBottom = "15px";

      li.innerHTML = `
        <div class="trip-card" style="padding: 12px; border: 1px solid #e6e8ee; border-radius: 8px; cursor: pointer; background: #fff; transition: transform 0.2s, box-shadow 0.2s;">
          <strong style="display: block; color: #154d88; font-size: 1.1rem;">${trip.tripName}</strong>
          <p style="font-size: 0.9rem; margin: 5px 0 8px 0; color: #1b1f23;">${trip.tripDescription}</p>
          <div style="font-size: 0.85rem; color: #627085; display: flex; justify-content: space-between; align-items: center;">
            <span><strong>Start Date:</strong> ${trip.tripDateStart || "N/A"}</span>
            <span><strong>Cost:</strong> $${Number(trip.tripCost).toFixed(2)}</span>
          </div>
          ${
            trip.comments
              ? `
            <div style="margin-top: 8px; font-size: 0.8rem; color: #828a99; font-style: italic;">
              Comments: ${trip.comments}
            </div>
          `
              : ""
          }
        </div>
      `;

      li.querySelector(".trip-card").addEventListener("click", () => {
        initiateSignupFlow(trip);
      });

      tripList.appendChild(li);
    });
  } catch (error) {
    console.error("Failed to load trips from Firestore:", error);
    if (tripStatus) {
      tripStatus.textContent =
        "Error loading upcoming trips. Please try again later.";
    }
  }
}

/**
 * Step 1: Route attendee selection pathway
 */
function initiateSignupFlow(trip) {
  const tripList = document.getElementById("tripList");

  tripList.innerHTML = `
    <div class="signup-flow-container" style="padding: 12px; background: #ffffff; border: 1px solid #e6e8ee; border-radius: 8px; box-shadow: var(--shadow);">
      <h3 style="font-size: 1.1rem; margin-bottom: 5px; color: var(--text);">Registering for:</h3>
      <p style="margin-bottom: 15px; font-weight: 600; color: #154d88;">${trip.tripName}</p>
      
      <p style="margin-bottom: 15px; color: var(--muted);">Are you a member or a visitor?</p>
      <button id="btnMember" style="width: 100%; padding: 10px; margin-bottom: 10px; background-color: #154d88; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">I am a Member</button>
      <button id="btnVisitor" style="width: 100%; padding: 10px; margin-bottom: 15px; background-color: #627085; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
        I am a Visitor
      </button>
      
      <button id="btnCancelFlow" style="background: none; border: none; color: #627085; text-decoration: underline; cursor: pointer; width: 100%; text-align: center; font-size: 0.9rem;">Cancel and Go Back</button>
    </div>
  `;

  document
    .getElementById("btnCancelFlow")
    .addEventListener("click", loadLiveTrips);
  document
    .getElementById("btnMember")
    .addEventListener("click", () => showPinEntry(trip));
  document
    .getElementById("btnVisitor")
    .addEventListener("click", () => showVisitorForm(trip));
}

/**
 * Step 2a: Member Security Verification Point
 */
function showPinEntry(trip) {
  const tripList = document.getElementById("tripList");
  tripList.innerHTML = `
    <div style="padding: 12px; background: #ffffff; border: 1px solid #e6e8ee; border-radius: 8px;">
      <h3 style="font-size: 1.1rem; margin-bottom: 15px; color: var(--text);">Enter Member PIN</h3>
      <input type="password" id="memberPin" maxlength="4" inputmode="numeric" pattern="[0-9]*" placeholder="4-digit PIN" style="width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #e6e8ee; border-radius: 4px; text-align: center; font-size: 1.2rem; letter-spacing: 5px;" />
      <p id="pinError" style="color: #dc3545; font-size: 0.9rem; display: none; margin-bottom: 10px;">Please enter a valid 4-digit numerical pin setup.</p>
      <button id="btnVerifyPin" style="width: 100%; padding: 10px; background-color: #154d88; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Verify PIN</button>
      <button id="btnBackFlow" style="background: none; border: none; color: #627085; text-decoration: underline; cursor: pointer; width: 100%; text-align: center; margin-top: 15px; font-size: 0.9rem;">Go Back</button>
    </div>
  `;

  document
    .getElementById("btnBackFlow")
    .addEventListener("click", () => initiateSignupFlow(trip));

  document.getElementById("btnVerifyPin").addEventListener("click", () => {
    const pinInput = document.getElementById("memberPin").value.trim();

    if (/^\d{4}$/.test(pinInput)) {
      showMemberTypeAhead(trip);
    } else {
      document.getElementById("pinError").style.display = "block";
    }
  });
}

/**
 * Step 3a: Real-Time Database Query and Type-Ahead Selection
 */
function showMemberTypeAhead(trip) {
  const tripList = document.getElementById("tripList");
  tripList.innerHTML = `
    <div style="padding: 12px; background: #ffffff; border: 1px solid #e6e8ee; border-radius: 8px; position: relative;">
      <h3 style="font-size: 1.1rem; margin-bottom: 10px; color: var(--text);">Find Your Member Name</h3>
      <input type="text" id="typeAheadSearch" placeholder="Type first name (e.g. Schrute)..." style="width: 100%; padding: 10px; border: 1px solid #e6e8ee; border-radius: 4px;" autocomplete="off" />
      <div id="typeAheadResults" style="background: white; border: 1px solid #e6e8ee; border-top: none; max-height: 150px; overflow-y: auto; display: none; position: absolute; width: calc(100% - 24px); z-index: 10; box-shadow: var(--shadow);"></div>
      
      <div id="selectedMemberConfirmation" style="margin-top: 20px; display: none; padding: 10px; background: var(--bg); border-radius: 6px; border: 1px solid #e6e8ee;">
        <p style="margin: 0 0 10px 0; font-size: 0.95rem;">Confirming registration for:<br><strong id="confirmedName" style="color: #154d88; font-size: 1.1rem;"></strong></p>
        
        <label style="display:block; margin-bottom:4px; font-size:0.85rem; font-weight:bold;">Note for organizers:</label>
        <input type="text" id="memberComment" placeholder="Dietary needs, carpooling notes..." style="width:100%; padding:6px; margin-bottom:12px; border:1px solid #e6e8ee; border-radius:4px; font-size:0.9rem;" />

        <button id="btnSubmitMemberSignup" style="width: 100%; padding: 10px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Confirm & Book Trip</button>
      </div>
      
      <button id="btnBackFlow" style="background: none; border: none; color: #627085; text-decoration: underline; cursor: pointer; width: 100%; text-align: center; margin-top: 25px; font-size: 0.9rem;">Cancel</button>
    </div>
  `;

  document
    .getElementById("btnBackFlow")
    .addEventListener("click", loadLiveTrips);

  const searchInput = document.getElementById("typeAheadSearch");
  const resultsContainer = document.getElementById("typeAheadResults");
  const confirmationDiv = document.getElementById("selectedMemberConfirmation");
  const confirmedNameSpan = document.getElementById("confirmedName");

  let selectedPersonId = null;
  let selectedPersonName = "";

  searchInput.addEventListener("input", async (e) => {
    const searchText = e.target.value.trim().toLowerCase();
    resultsContainer.innerHTML = "";

    if (searchText.length < 2) {
      resultsContainer.style.display = "none";
      return;
    }

    try {
      const peopleRef = collection(db, "people");
      const q = query(
        peopleRef,
        orderBy("searchName"),
        startAt(searchText),
        endAt(searchText + "\uf8ff"),
        limit(10),
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        snapshot.forEach((doc) => {
          const person = doc.data();

          const resultRow = document.createElement("div");
          resultRow.style.padding = "10px";
          resultRow.style.cursor = "pointer";
          resultRow.style.borderBottom = "1px solid #e6e8ee";
          resultRow.textContent = person.name;

          resultRow.addEventListener(
            "mouseover",
            () => (resultRow.style.backgroundColor = "#f7f8fc"),
          );
          resultRow.addEventListener(
            "mouseout",
            () => (resultRow.style.backgroundColor = "#fff"),
          );

          resultRow.addEventListener("click", () => {
            searchInput.value = person.name;
            selectedPersonId = person.personId;
            selectedPersonName = person.name;
            resultsContainer.style.display = "none";

            confirmedNameSpan.textContent = person.name;
            confirmationDiv.style.display = "block";
          });

          resultsContainer.appendChild(resultRow);
        });
        resultsContainer.style.display = "block";
      } else {
        resultsContainer.style.display = "none";
      }
    } catch (err) {
      console.error("Type-ahead database error: ", err);
    }
  });

  // Action: Save Member Registration matching the 7-field layout from image_809402.jpg
  document
    .getElementById("btnSubmitMemberSignup")
    .addEventListener("click", async () => {
      const commentInput = document
        .getElementById("memberComment")
        .value.trim();
      try {
        await addDoc(collection(db, "web_registrations_staging"), {
          EOF: "",
          TripID: Number(trip.tripId || trip.TripID),
          PersonID: Number(selectedPersonId),
          PaidAmount: 0.0,
          PaidDate: "",
          PaidMethod: "Pending",
          Comments: commentInput || "None",
        });

        alert(`Success! ${selectedPersonName} has been recorded.`);
        loadLiveTrips();
      } catch (error) {
        console.error("Booking staging save error:", error);
      }
    });
}

/**
 * Step 2b: Visitor Registration Form mapped to visitor data schemas
 */
function showVisitorForm(trip) {
  const tripList = document.getElementById("tripList");
  tripList.innerHTML = `
    <div style="padding: 12px; background: #ffffff; border: 1px solid #e6e8ee; border-radius: 8px;">
      <h3 style="font-size: 1.1rem; margin-bottom: 10px; color: var(--text);">Visitor Registration</h3>
      <form id="visitorForm">
        <label style="display: block; margin-bottom: 4px; font-size: 0.85rem; font-weight: bold; color: var(--text);">Family Name (Last Name)</label>
        <input type="text" required id="visFamilyName" placeholder="e.g. Smith" style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #e6e8ee; border-radius: 4px;" />

        <label style="display: block; margin-bottom: 4px; font-size: 0.85rem; font-weight: bold; color: var(--text);">Other Names (First Name)</label>
        <input type="text" required id="visOtherNames" placeholder="e.g. Harvey" style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #e6e8ee; border-radius: 4px;" />

        <label style="display: block; margin-bottom: 4px; font-size: 0.85rem; font-weight: bold; color: var(--text);">Gender</label>
        <select id="visGender" style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #e6e8ee; border-radius: 4px; background: white;">
          <option value="">Unspecified</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
        </select>

        <label style="display: block; margin-bottom: 4px; font-size: 0.85rem; font-weight: bold; color: var(--text);">Email Address</label>
        <input type="email" required id="visEmail" placeholder="e.g. harvey@example.com" style="width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #e6e8ee; border-radius: 4px;" />
        
        <label style="display: block; margin-bottom: 4px; font-size: 0.85rem; font-weight: bold; color: var(--text);">Phone Number</label>
        <input type="tel" required id="visPhone" placeholder="e.g. 0412345678" style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #e6e8ee; border-radius: 4px;" />

        <label style="display: block; margin-bottom: 4px; font-size: 0.85rem; font-weight: bold; color: var(--text);">Comments</label>
        <input type="text" id="visComment" placeholder="Meal Choice ect" style="width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #e6e8ee; border-radius: 4px;" />
        
        <button type="submit" style="width: 100%; padding: 10px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Submit Details</button>
      </form>
      <button id="btnBackFlow" style="background: none; border: none; color: #627085; text-decoration: underline; cursor: pointer; width: 100%; text-align: center; margin-top: 15px; font-size: 0.9rem;">Cancel</button>
    </div>
  `;

  document
    .getElementById("btnBackFlow")
    .addEventListener("click", () => initiateSignupFlow(trip));

  document
    .getElementById("visitorForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const familyName = document.getElementById("visFamilyName").value.trim();
      const otherNames = document.getElementById("visOtherNames").value.trim();
      const gender = document.getElementById("visGender").value || "U";
      const phone = document.getElementById("visPhone").value.trim();
      const email = document.getElementById("visEmail").value.trim();
      const mealComment = document.getElementById("visComment").value.trim();

      const temporaryVisitorId = Math.floor(100000 + Math.random() * 900000);

      try {
        // 1. Log Visitor Profile matching the exact 7-field structure
        await addDoc(collection(db, "web_visitors_staging"), {
          EOF: "",
          FamilyName: familyName,
          OtherNames: otherNames,
          Gender: gender,
          VisitorID: temporaryVisitorId,
          Email: email,
          Phone: phone,
        });

        // 2. Log Registration parameters
        await addDoc(collection(db, "web_registrations_staging"), {
          EOF: "",
          TripID: Number(trip.tripId || trip.TripID),
          PersonID: temporaryVisitorId,
          PaidAmount: 0.0,
          PaidDate: "",
          PaidMethod: "Pending",
          Comments: mealComment || "None Specified",
        });

        alert(`Thank you! Visitor registration processed successfully.`);
        loadLiveTrips();
      } catch (error) {
        console.error("Visitor submission handling error:", error);
      }
    });
}
