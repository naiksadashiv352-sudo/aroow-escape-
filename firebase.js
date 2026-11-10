import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, getCountFromServer, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const configured = firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("PASTE_")
  && firebaseConfig.projectId && !firebaseConfig.projectId.startsWith("YOUR_")
  && firebaseConfig.appId && !firebaseConfig.appId.startsWith("YOUR_");

let auth = null, db = null, currentUser = null, saveTimer = null;
const listeners = new Set();
const emit = () => listeners.forEach(fn => { try { fn(currentUser); } catch (e) { console.error(e); } });

if (configured) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    onAuthStateChanged(auth, async user => {
      currentUser = user;
      emit();
      if (user) {
        try {
          await setDoc(doc(db, "gamePlayers", user.uid), {
            displayName: (user.displayName || "Player").slice(0, 18),
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp()
          }, { merge: true });
        } catch (error) { console.warn("Player count registration:", error); }
        try {
          const ref = doc(db, "users", user.uid);
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            await setDoc(ref, {
              displayName: user.displayName || "Player",
              email: user.email || null,
              level: 1,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            }, { merge: true });
          }
          const restored = await window.ArrowFirebase?.restoreProgress?.();
          // First-time account linking uploads the guest save instead of leaving it stranded locally.
          if (!restored && window.S) {
            await saveProgress(window.S);
            await publishScore(window.S);
          }
        } catch (error) { console.warn("Firebase profile/progress sync:", error); }
      }
    });
    getRedirectResult(auth).catch(error => console.warn("Google sign-in redirect:", error));
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

async function saveProgress(progress) {
  if (!db || !currentUser || !progress) return;
  const safeProgress = JSON.parse(JSON.stringify(progress));
  await setDoc(doc(db, "users", currentUser.uid), {
    progress: safeProgress,
    level: Math.max(1, Number(safeProgress.lvl) || 1),
    coins: Math.max(0, Number(safeProgress.coins) || 0),
    displayName: currentUser.displayName || safeProgress.name || "Player",
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function restoreProgress() {
  if (!db || !currentUser) return false;
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const cloud = snap.exists() ? snap.data().progress : null;
  if (!cloud || typeof cloud !== "object") return false;
  // Merge cloud progress over this browser's local save after successful sign-in.
  const local = JSON.parse(localStorage.getItem("arrowEscape") || "{}");
  // Preserve guest progress when it is ahead of the cloud copy, and combine records.
  const merged = {
    ...cloud, ...local,
    lvl: Math.max(1, Number(local.lvl) || 1, Number(cloud.lvl) || 1),
    coins: Math.max(0, Number(local.coins) || 0, Number(cloud.coins) || 0),
    hints: Math.max(0, Number(local.hints) || 0, Number(cloud.hints) || 0),
    best: { ...(cloud.best || {}), ...(local.best || {}) },
    stars: { ...(cloud.stars || {}), ...(local.stars || {}) },
    daily: { ...(cloud.daily || {}), ...(local.daily || {}) },
    own: [...new Set([...(cloud.own || [0]), ...(local.own || [0])])],
    streak: Math.max(Number(local.streak) || 0, Number(cloud.streak) || 0)
  };
  localStorage.setItem("arrowEscape", JSON.stringify(merged));
  if (window.S) Object.assign(window.S, merged);
  window.dispatchEvent(new CustomEvent("arrowescape:cloud-restored", { detail: merged }));
  await saveProgress(merged).catch(error => console.warn("Merged cloud save:", error));
  await publishScore(merged).catch(error => console.warn("Leaderboard restore publish:", error));
  return true;
}

async function publishScore(progress) {
  if (!db || !currentUser) return;
  const cleared = Object.keys(progress.best || {}).length;
  const totalTime = Object.values(progress.best || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
  await setDoc(doc(db, "leaderboard", currentUser.uid), {
    uid: currentUser.uid,
    displayName: (currentUser.displayName || progress.name || "Player").slice(0, 18),
    levelsCleared: cleared,
    totalTime,
    stars: Object.values(progress.stars || {}).reduce((sum, n) => sum + (Number(n) || 0), 0),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function getPlayerCount() {
  if (!db) throw new Error("Firebase is not configured yet.");
  const result = await getCountFromServer(collection(db, "gamePlayers"));
  return result.data().count;
}

async function getLeaderboard() {
  if (!db) throw new Error("Firebase is not configured yet.");
  const q = query(collection(db, "leaderboard"), orderBy("levelsCleared", "desc"), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => (b.levelsCleared || 0) - (a.levelsCleared || 0) || (a.totalTime || 0) - (b.totalTime || 0))
    .slice(0, 100);
}

async function signInGoogle() {
  if (!auth) throw new Error("Add your Firebase web configuration first.");
  const provider = new GoogleAuthProvider();
  try { await signInWithPopup(auth, provider); }
  catch (error) {
    if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(error.code)) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
}

async function signInEmail(email, password, create = false) {
  if (!auth) throw new Error("Add your Firebase web configuration first.");
  return create
    ? createUserWithEmailAndPassword(auth, email, password)
    : signInWithEmailAndPassword(auth, email, password);
}

async function setNickname(name) {
  if (!auth || !currentUser) throw new Error("Sign in first.");
  const displayName = String(name || "").trim().slice(0, 18);
  if (!displayName) throw new Error("Enter a nickname.");
  await updateProfile(currentUser, { displayName });
  await setDoc(doc(db, "users", currentUser.uid), { displayName, updatedAt: serverTimestamp() }, { merge: true });
  currentUser = auth.currentUser;
  emit();
}

function scheduleSave(progress) {
  if (!currentUser || !db) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveProgress(progress).then(() => publishScore(progress)).catch(error => console.warn("Cloud save failed:", error));
  }, 900);
}

window.ArrowFirebase = {
  configured, get user() { return currentUser; },
  onAuthChanged(fn) { listeners.add(fn); fn(currentUser); return () => listeners.delete(fn); },
  signInGoogle, signInEmail, signOut: () => auth ? signOut(auth) : Promise.reject(new Error("Firebase is not configured.")),
  setNickname, saveProgress, restoreProgress, publishScore, getLeaderboard, getPlayerCount,
  scheduleSave,
  status: () => !configured ? "Firebase setup required" : auth ? "Firebase ready" : "Firebase initialization error"
};

// Small account panel; the original game and its offline/local save continue to work without Firebase.
function mountAccountPanel() {
  if (document.getElementById("firebase-account")) return;
  const panel = document.createElement("section");
  panel.id = "firebase-account";
  panel.style.cssText = "width:100%;max-width:560px;margin:0 auto 8px;padding:8px 10px;border:1px solid #b8c9bf;border-radius:14px;background:#fbfdf9;color:#14262b;font:13px system-ui;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap";
  panel.innerHTML = '<span id="firebase-account-status">Offline progress · Firebase setup required</span><span style="display:flex;gap:6px"><button id="firebase-google" type="button" style="border:0;border-radius:9px;padding:7px 10px;background:#14262b;color:white;font-weight:700">Google sign in</button><button id="firebase-email" type="button" style="border:1px solid #14262b;border-radius:9px;padding:7px 10px;background:white;color:#14262b;font-weight:700">Email</button><button id="firebase-logout" type="button" hidden style="border:1px solid #14262b;border-radius:9px;padding:7px 10px;background:white;color:#14262b">Log out</button></span>';
  document.body.insertBefore(panel, document.getElementById("board"));
  const status = panel.querySelector("#firebase-account-status");
  const message = error => { status.textContent = error?.message || "Something went wrong."; };
  panel.querySelector("#firebase-google").onclick = () => signInGoogle().catch(message);
  panel.querySelector("#firebase-email").onclick = async () => {
    const email = prompt("Enter your email address");
    if (!email) return;
    const password = prompt("Enter your password (at least 6 characters)");
    if (!password) return;
    const create = confirm("Create a new account? Choose Cancel to sign in to an existing account.");
    try { await signInEmail(email.trim(), password, create); }
    catch (error) { message(error); }
  };
  panel.querySelector("#firebase-logout").onclick = () => signOut(auth).catch(message);
  if (!configured) {
    panel.querySelector("#firebase-google").disabled = true;
    panel.querySelector("#firebase-email").disabled = true;
    panel.querySelector("#firebase-google").style.opacity = ".45";
    panel.querySelector("#firebase-email").style.opacity = ".45";
  }
  window.ArrowFirebase.onAuthChanged(user => {
    status.textContent = user ? "Signed in · " + (user.displayName || user.email || "Player") + " · cloud save on" : (configured ? "Guest mode · progress saved on this device" : "Offline progress · add Firebase settings to enable accounts");
    panel.querySelector("#firebase-google").hidden = !!user;
    panel.querySelector("#firebase-email").hidden = !!user;
    panel.querySelector("#firebase-logout").hidden = !user;
  });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountAccountPanel);
else mountAccountPanel();
