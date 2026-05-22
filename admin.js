import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig, isConfigured, PRICE, ADMIN_PASSWORD } from "./config.js";

/* ----- Password gate ----- */
const lock = document.getElementById("lock");
const lockForm = document.getElementById("lock-form");
const passwordInput = document.getElementById("password");
const lockError = document.getElementById("lock-error");
const adminEl = document.getElementById("admin");
const SESSION_KEY = "brAdminUnlocked";

function unlock() {
  lock.hidden = true;
  adminEl.hidden = false;
  start();
}

if (sessionStorage.getItem(SESSION_KEY) === "1") {
  unlock();
}

lockForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (passwordInput.value === ADMIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, "1");
    unlock();
  } else {
    lockError.hidden = false;
    passwordInput.value = "";
  }
});

/* ----- Date helpers ----- */
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatRunDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${DAY_NAMES[date.getDay()]}, ${MONTHS[m - 1]} ${d}`;
}

/* ----- Admin app ----- */
const runsAdminEl = document.getElementById("runs-admin");
let db = null;
let busy = new Set();

function start() {
  if (!isConfigured) {
    document.getElementById("config-banner").hidden = false;
    runsAdminEl.innerHTML = '<p class="loading">Configure Firebase to load signups.</p>';
    return;
  }
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  onSnapshot(
    collection(db, "signups"),
    (snap) => {
      const signups = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      render(signups);
    },
    (err) => {
      console.error("Admin listener error:", err);
      runsAdminEl.innerHTML = '<p class="loading">Could not load signups. Check your Firestore rules.</p>';
    }
  );
}

function render(signups) {
  /* Stats */
  const paid = signups.filter((s) => s.paid).length;
  document.getElementById("stat-players").textContent = signups.length;
  document.getElementById("stat-paid").textContent = paid;
  document.getElementById("stat-collected").textContent = `$${paid * PRICE}`;
  document.getElementById("stat-due").textContent = `$${(signups.length - paid) * PRICE}`;

  /* Group by run date */
  const byRun = new Map();
  for (const s of signups) {
    if (!byRun.has(s.runDate)) byRun.set(s.runDate, []);
    byRun.get(s.runDate).push(s);
  }

  if (byRun.size === 0) {
    runsAdminEl.innerHTML = '<div class="card"><p class="loading">No signups yet.</p></div>';
    return;
  }

  const runKeys = [...byRun.keys()].sort();
  runsAdminEl.innerHTML = "";

  for (const key of runKeys) {
    const people = byRun
      .get(key)
      .sort((a, b) => (a.createdAt?.seconds ?? Infinity) - (b.createdAt?.seconds ?? Infinity));
    const paidCount = people.filter((p) => p.paid).length;

    const card = document.createElement("section");
    card.className = "card";
    card.innerHTML = `
      <div class="run-head">
        <h2>${formatRunDate(key)}</h2>
        <span class="run-pill">${paidCount}/${people.length} paid</span>
      </div>
      <ul class="player-list"></ul>
    `;
    const list = card.querySelector(".player-list");

    for (const p of people) {
      const li = document.createElement("li");
      li.className = "player" + (p.paid ? " is-paid" : "");
      const phone = p.phone
        ? `<a class="player-phone" href="tel:${p.phone}">${p.phone}</a>`
        : '<span class="player-phone muted">no phone</span>';
      li.innerHTML = `
        <div class="player-info">
          <span class="player-name">${escapeHtml(p.name)}</span>
          ${phone}
        </div>
        <button type="button" class="paid-btn">${p.paid ? "✓ Paid" : "Mark paid"}</button>
      `;
      const btn = li.querySelector(".paid-btn");
      btn.disabled = busy.has(p.id);
      btn.addEventListener("click", () => togglePaid(p, btn));
      list.appendChild(li);
    }
    runsAdminEl.appendChild(card);
  }
}

async function togglePaid(person, btn) {
  if (busy.has(person.id)) return;
  busy.add(person.id);
  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    await updateDoc(doc(db, "signups", person.id), { paid: !person.paid });
  } catch (err) {
    console.error("Could not update paid status:", err);
    alert("Couldn't save that change. Please try again.");
    btn.disabled = false;
  } finally {
    busy.delete(person.id);
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
