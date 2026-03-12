import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCFKOGoBQ6KXRwFhfD2K8L4qeGpX42fSsQ",

  authDomain: "carina-mens-shed.firebaseapp.com",

  projectId: "carina-mens-shed",

  storageBucket: "carina-mens-shed.firebasestorage.app",

  messagingSenderId: "547280065983",

  appId: "1:547280065983:web:beeb8009c3c34a2d2e3d0a",
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
