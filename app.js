import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  firebaseConfig,
  isConfigured,
  VENMO_HANDLE,
  PRICE,
  RUN_TIME,
  RUN_WEEKDAYS,
  RUNS_TO_SHOW,
} from "./config.js";

let db = null;
if (isConfigured) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} else {
  document.getElementById("config-banner").hidden = false;
}

/* ----- DOM ----- */
const runsEl = document.getElementById("runs");
const form = document.getElementById("signup-form");
const nameInput = document.getElementById("name");
const phoneInput = document.getElementById("phone");
const submitBtn = document.getElementById("submit-btn");
const formError = document.getElementById("form-error");
const overlay = document.getElementById("pay-overlay");
const paySummary = document.getElementById("pay-summary");
const venmoBtn = document.getElementById("venmo-btn");
const qrEl = document.getElementById("qr");

let selectedRun = null;

/* ----- Date helpers ----- */
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function upcomingRuns() {
  const runs = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 28 && runs.length < RUNS_TO_SHOW; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (RUN_WEEKDAYS.includes(d.getDay())) runs.push(d);
  }
  return runs;
}

/* ----- Render run cards ----- */
function renderRuns() {
  const runs = upcomingRuns();
  runsEl.innerHTML = "";
  runs.forEach((d) => {
    const key = dateKey(d);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "run";
    card.dataset.key = key;
    card.innerHTML = `
      <div class="run-day">${DAY_NAMES[d.getDay()]}</div>
      <div class="run-date">${MONTHS[d.getMonth()]} ${d.getDate()}</div>
      <div class="run-time">${RUN_TIME}</div>
      <div class="run-count" data-count>👥 <strong>0</strong> signed up</div>
      <div class="run-roster" data-roster></div>
    `;
    card.addEventListener("click", () => selectRun(d, card));
    runsEl.appendChild(card);
    if (db) watchRoster(key, card);
  });
}

function selectRun(d, card) {
  selectedRun = { date: d, key: dateKey(d), label: `${DAY_NAMES[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}` };
  document.querySelectorAll(".run").forEach((c) => c.classList.remove("selected"));
  card.classList.add("selected");
  updateSubmitState();
  document.getElementById("signup-card").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ----- Live roster per run ----- */
function watchRoster(key, card) {
  // Single equality filter — needs no composite index. Sorted client-side.
  const q = query(collection(db, "signups"), where("runDate", "==", key));
  onSnapshot(
    q,
    (snap) => {
      const names = snap.docs
        .map((doc) => doc.data())
        .sort((a, b) => (a.createdAt?.seconds ?? Infinity) - (b.createdAt?.seconds ?? Infinity))
        .map((d) => d.name)
        .filter(Boolean);
      const countEl = card.querySelector("[data-count] strong");
      const rosterEl = card.querySelector("[data-roster]");
      countEl.textContent = names.length;
      rosterEl.textContent = names.length ? names.join(", ") : "";
    },
    (err) => console.error("Roster listener error:", err)
  );
}

/* ----- Form ----- */
function updateSubmitState() {
  submitBtn.disabled = !selectedRun || !nameInput.value.trim() || !isConfigured;
}
nameInput.addEventListener("input", updateSubmitState);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.hidden = true;

  if (!selectedRun) {
    showError("Pick a run above first.");
    return;
  }
  const name = nameInput.value.trim();
  if (!name) {
    showError("Please enter your name.");
    return;
  }
  if (!db) {
    showError("Signups aren't available — Firebase isn't configured.");
    return;
  }

  const run = selectedRun;
  submitBtn.disabled = true;
  submitBtn.textContent = "Signing up…";
  try {
    await addDoc(collection(db, "signups"), {
      name,
      phone: phoneInput.value.trim() || null,
      runDate: run.key,
      createdAt: serverTimestamp(),
      paid: false,
    });
    showPayment(name, run.label);
    form.reset();
    selectedRun = null;
    document.querySelectorAll(".run").forEach((c) => c.classList.remove("selected"));
  } catch (err) {
    console.error("Signup failed:", err);
    showError("Something went wrong saving your signup. Please try again.");
  } finally {
    submitBtn.textContent = "Sign up";
    updateSubmitState();
  }
});

function showError(msg) {
  formError.textContent = msg;
  formError.hidden = false;
}

/* ----- Payment modal ----- */
function venmoLink(note) {
  return `https://venmo.com/${VENMO_HANDLE}?txn=pay&amount=${PRICE}&note=${encodeURIComponent(note)}`;
}

function showPayment(name, runLabel) {
  const note = `Basketball Run — ${runLabel}`;
  paySummary.textContent = `${name} — ${runLabel}`;
  const link = venmoLink(note);
  venmoBtn.href = link;

  // QR rendered by an image service so it works without a JS library.
  qrEl.src =
    "https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=" +
    encodeURIComponent(link);

  overlay.hidden = false;
}

function closeModal() {
  overlay.hidden = true;
}
document.getElementById("pay-close").addEventListener("click", closeModal);
document.getElementById("pay-done").addEventListener("click", closeModal);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !overlay.hidden) closeModal();
});

/* ----- Init ----- */
renderRuns();
updateSubmitState();
