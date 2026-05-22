/* ===========================================================
   SHARED CONFIG — edit this file only.
   Used by both the signup page (app.js) and admin page (admin.js).
   =========================================================== */

/* Firebase web app config.
   Firebase console → Project settings → General → Your apps. */
export const firebaseConfig = {
  apiKey: "AIzaSyDBGTHf5CAPZ0H-0DrVRmJSwqsS22UQPr4",
  authDomain: "radar-runs.firebaseapp.com",
  projectId: "radar-runs",
  storageBucket: "radar-runs.firebasestorage.app",
  messagingSenderId: "187607289769",
  appId: "1:187607289769:web:e1eac2bdeb19838ec43eb8",
  measurementId: "G-0KCW1EYW44",
};

/* Run + payment settings. */
export const VENMO_HANDLE = "jason-rader-14";
export const PRICE = 5;
export const RUN_TIME = "5:40 AM";
export const RUN_WEEKDAYS = [3, 5]; // 0=Sun … 3=Wed, 5=Fri
export const RUNS_TO_SHOW = 4;

/* Password for the admin page (admin.html).
   CHANGE THIS before sharing the page. It's checked in the browser,
   so it only gates the UI — keep it to something low-stakes. */
export const ADMIN_PASSWORD = "PayJason20$";

/* True once real Firebase values have been pasted in above. */
export const isConfigured = !firebaseConfig.apiKey.startsWith("YOUR_");
