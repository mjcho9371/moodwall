// Update this once the repo is pushed to GitHub -- keep in sync with
// Sources/Moodwall/AppConfig.swift on the macOS app side.
const MANIFEST_URL =
  "https://raw.githubusercontent.com/mjcho9371/moodwall/main/curation/manifest.json";

const CACHE_KEY = "moodwall_manifest_cache";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MOOD_KEY = "moodwall_selected_mood";

const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

async function storageGet(area, key) {
  if (!hasChromeStorage) return undefined;
  const result = await chrome.storage[area].get(key);
  return result[key];
}

async function storageSet(area, key, value) {
  if (!hasChromeStorage) return;
  await chrome.storage[area].set({ [key]: value });
}

async function loadManifest() {
  const cached = await storageGet("local", CACHE_KEY);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.manifest;
  }

  const response = await fetch(MANIFEST_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`manifest fetch failed: ${response.status}`);
  const manifest = await response.json();

  await storageSet("local", CACHE_KEY, { manifest, fetchedAt: Date.now() });
  return manifest;
}

function pickPhoto(manifest, mood) {
  const pool =
    mood === "random"
      ? Object.values(manifest.moods || {}).flat()
      : manifest.moods?.[mood] || [];
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function withUtm(url) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}utm_source=moodwall&utm_medium=referral`;
}

function applyBackground(photo) {
  const background = document.getElementById("background");
  const credit = document.getElementById("credit");
  credit.replaceChildren();

  if (!photo) {
    background.style.backgroundImage = "";
    credit.textContent = "";
    return;
  }

  const image = new Image();
  image.onload = () => {
    background.style.backgroundImage = `url("${photo.imageURL}")`;
  };
  image.src = photo.imageURL;

  const photographerLink = document.createElement("a");
  photographerLink.href = withUtm(photo.photographerURL);
  photographerLink.textContent = photo.photographer;
  photographerLink.target = "_blank";
  photographerLink.rel = "noopener noreferrer";

  const unsplashLink = document.createElement("a");
  unsplashLink.href = withUtm("https://unsplash.com");
  unsplashLink.textContent = "Unsplash";
  unsplashLink.target = "_blank";
  unsplashLink.rel = "noopener noreferrer";

  credit.append("Photo by ", photographerLink, " on ", unsplashLink);
}

function formatTime(date) {
  const hours24 = date.getHours();
  const period = hours24 < 12 ? "AM" : "PM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(hours12)}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${period}`;
}

function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent = formatTime(now);
  document.getElementById("date").textContent = now.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  });
}

const MAX_BOOKMARKS = 10;

async function loadBookmarks() {
  if (typeof chrome === "undefined" || !chrome.bookmarks) return [];

  const tree = await chrome.bookmarks.getTree();
  const flat = [];

  function walk(nodes) {
    for (const node of nodes) {
      if (flat.length >= MAX_BOOKMARKS) return;
      if (node.url) {
        flat.push({ title: node.title || node.url, url: node.url });
      } else if (node.children) {
        walk(node.children);
      }
      if (flat.length >= MAX_BOOKMARKS) return;
    }
  }

  walk(tree);
  return flat;
}

function faviconURL(pageUrl) {
  const url = new URL(chrome.runtime.getURL("/_favicon/"));
  url.searchParams.set("pageUrl", pageUrl);
  url.searchParams.set("size", "32");
  return url.toString();
}

function renderBookmarks(bookmarks) {
  const container = document.getElementById("bookmarks");
  container.replaceChildren();

  for (const bookmark of bookmarks) {
    const link = document.createElement("a");
    link.className = "bookmark-item";
    link.href = bookmark.url;
    link.title = bookmark.title;

    const icon = document.createElement("img");
    icon.className = "bookmark-favicon";
    icon.alt = "";
    icon.src = faviconURL(bookmark.url);

    const label = document.createElement("span");
    label.className = "bookmark-label";
    label.textContent = bookmark.title;

    link.append(icon, label);
    container.append(link);
  }
}

async function applyMood(mood, manifest) {
  if (!manifest) {
    applyBackground(null);
    return;
  }
  applyBackground(pickPhoto(manifest, mood));
}

async function init() {
  const select = document.getElementById("moodSelect");
  const storedMood = (await storageGet("sync", MOOD_KEY)) || "random";
  select.value = storedMood;

  let manifest = null;
  try {
    manifest = await loadManifest();
  } catch (err) {
    console.warn("Moodwall: could not load curated manifest yet.", err);
  }

  await applyMood(storedMood, manifest);

  select.addEventListener("change", async () => {
    await storageSet("sync", MOOD_KEY, select.value);
    await applyMood(select.value, manifest);
  });

  const bookmarks = await loadBookmarks().catch((err) => {
    console.warn("Moodwall: could not load bookmarks.", err);
    return [];
  });
  renderBookmarks(bookmarks);

  updateClock();
  setInterval(updateClock, 1000);
}

document.addEventListener("DOMContentLoaded", init);
