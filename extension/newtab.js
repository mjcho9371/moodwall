// Update this once the repo is pushed to GitHub -- keep in sync with
// Sources/Moodwall/AppConfig.swift on the macOS app side.
const MANIFEST_URL =
  "https://raw.githubusercontent.com/mjcho9371/moodwall/main/curation/manifest.json";

const CACHE_KEY = "moodwall_manifest_cache";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MOOD_KEY = "moodwall_selected_mood";
const FONT_KEY = "moodwall_selected_font";
const SERIF_FONTS = new Set([
  "Playfair Display",
  "Lora",
  "Merriweather",
  "EB Garamond",
  "Noto Serif KR",
  "Nanum Myeongjo"
]);
const WEIGHT_KEY = "moodwall_selected_weight";
const SHOW_SECONDS_KEY = "moodwall_show_seconds";
const LAYOUT_KEY = "moodwall_layout";
const SHOW_QUOTE_KEY = "moodwall_show_quote";

let showSeconds = true;

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

async function loadManifest(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = await storageGet("local", CACHE_KEY);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.manifest;
    }
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
  const pad = (n) => String(n).padStart(2, "0");
  const base = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return showSeconds ? `${base}:${pad(date.getSeconds())}` : base;
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

function applyLayout(layout) {
  document.body.classList.toggle("layout-corner", layout === "corner");
}

function showRandomQuote() {
  const quotes = typeof QUOTES !== "undefined" ? QUOTES : [];
  if (quotes.length === 0) return;
  const { text } = quotes[Math.floor(Math.random() * quotes.length)];
  document.getElementById("quoteText").textContent = text;
}

async function applyQuoteVisibility(enabled) {
  const quote = document.getElementById("quote");
  quote.hidden = !enabled;
  if (enabled) showRandomQuote();
}

function applyTypography(fontName, weight) {
  const panel = document.getElementById("panel");
  const clock = document.getElementById("clock");
  let link = document.getElementById("googleFontLink");

  clock.style.fontWeight = weight;

  if (!fontName || fontName === "system") {
    if (link) link.remove();
    panel.style.fontFamily = "";
    return;
  }

  const familyParam = fontName.replace(/ /g, "+");
  const href = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weight}&display=swap`;

  if (!link) {
    link = document.createElement("link");
    link.id = "googleFontLink";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = href;
  const fallback = SERIF_FONTS.has(fontName) ? "serif" : "-apple-system, sans-serif";
  panel.style.fontFamily = `'${fontName}', ${fallback}`;
}

const MAX_BOOKMARKS = 10;

function getBookmarkTree() {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getTree((tree) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(tree);
      }
    });
  });
}

async function loadBookmarks() {
  if (typeof chrome === "undefined" || !chrome.bookmarks) {
    console.warn("Moodwall: chrome.bookmarks unavailable (not running as an installed extension, or permission missing).");
    return [];
  }

  const tree = await getBookmarkTree();
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
  const zone = document.getElementById("bookmarksZone");
  zone.hidden = bookmarks.length === 0;
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

const CALENDAR_ENABLED_KEY = "moodwall_show_calendar";
const GMAIL_ENABLED_KEY = "moodwall_show_gmail";

function getAuthToken(interactive) {
  return new Promise((resolve, reject) => {
    if (typeof chrome === "undefined" || !chrome.identity) {
      reject(new Error("chrome.identity unavailable"));
      return;
    }
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError?.message || "no token"));
      } else {
        resolve(token);
      }
    });
  });
}

function removeCachedAuthToken(token) {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => resolve());
  });
}

async function googleFetch(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`request failed: ${res.status}`);
  return res.json();
}

async function fetchNextEvents(token, maxResults = 3) {
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", new Date().toISOString());
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  const data = await googleFetch(url, token);
  return (data.items || []).map((event) => ({
    title: event.summary || "(제목 없음)",
    start: event.start?.dateTime || event.start?.date || null,
    allDay: !event.start?.dateTime
  }));
}

async function fetchUnreadGmail(token, maxResults = 5) {
  const labelData = await googleFetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/labels/UNREAD",
    token
  );
  const unreadCount = labelData.messagesUnread || 0;

  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("q", "is:unread");
  listUrl.searchParams.set("maxResults", String(maxResults));
  const listData = await googleFetch(listUrl, token);
  const ids = (listData.messages || []).map((m) => m.id);

  const messages = await Promise.all(
    ids.map(async (id) => {
      const msgUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`);
      msgUrl.searchParams.set("format", "metadata");
      msgUrl.searchParams.append("metadataHeaders", "Subject");
      msgUrl.searchParams.append("metadataHeaders", "From");
      try {
        const data = await googleFetch(msgUrl, token);
        const headers = data.payload?.headers || [];
        const get = (name) => headers.find((h) => h.name === name)?.value || "";
        return {
          subject: get("Subject") || "(제목 없음)",
          from: get("From").replace(/<[^>]*>/, "").replace(/"/g, "").trim(),
          date: Number(data.internalDate) || 0
        };
      } catch {
        return null;
      }
    })
  );

  return {
    unreadCount,
    messages: messages.filter(Boolean).sort((a, b) => b.date - a.date)
  };
}

function formatEventTime(event) {
  if (!event.start) return "";
  const date = new Date(event.start);
  if (event.allDay) {
    return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  }
  return date.toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function renderCardMessage(listEl, text) {
  listEl.replaceChildren();
  const li = document.createElement("li");
  li.textContent = text;
  listEl.append(li);
}

function renderConnectButton(widgetEl, onClick) {
  const button = document.createElement("button");
  button.className = "card-action";
  button.textContent = "Google 계정 연결";
  button.addEventListener("click", onClick);
  widgetEl.querySelector("ul").replaceChildren();
  widgetEl.querySelector("h3").after(button);
}

async function refreshCalendarWidget() {
  const widget = document.getElementById("calendarWidget");
  const list = document.getElementById("calendarList");
  const enabled = (await storageGet("sync", CALENDAR_ENABLED_KEY)) ?? false;
  widget.hidden = !enabled;
  if (!enabled) return;

  widget.querySelectorAll(".card-action").forEach((btn) => btn.remove());
  renderCardMessage(list, "불러오는 중…");

  try {
    const token = await getAuthToken(false);
    const events = await fetchNextEvents(token);
    if (events.length === 0) {
      renderCardMessage(list, "예정된 일정 없음");
      return;
    }
    list.replaceChildren();
    for (const event of events) {
      const li = document.createElement("li");
      li.textContent = `${formatEventTime(event)} · ${event.title}`;
      list.append(li);
    }
  } catch (err) {
    console.warn("Moodwall: calendar fetch failed.", err);
    renderConnectButton(widget, () => connectGoogle());
    renderCardMessage(list, "Google 계정 연결이 필요해요");
  }
}

async function refreshGmailWidget() {
  const widget = document.getElementById("gmailWidget");
  const list = document.getElementById("gmailList");
  const countEl = document.getElementById("unreadCount");
  const enabled = (await storageGet("sync", GMAIL_ENABLED_KEY)) ?? false;
  widget.hidden = !enabled;
  if (!enabled) return;

  widget.querySelectorAll(".card-action").forEach((btn) => btn.remove());
  countEl.textContent = "";
  renderCardMessage(list, "불러오는 중…");

  try {
    const token = await getAuthToken(false);
    const { unreadCount, messages } = await fetchUnreadGmail(token);
    countEl.textContent = `(${unreadCount})`;
    if (messages.length === 0) {
      renderCardMessage(list, "읽지 않은 메일 없음");
      return;
    }
    list.replaceChildren();
    for (const msg of messages) {
      const li = document.createElement("li");
      const from = document.createElement("span");
      from.className = "gmail-from";
      from.textContent = msg.from;
      const subject = document.createElement("span");
      subject.className = "gmail-subject";
      subject.textContent = ` — ${msg.subject}`;
      li.append(from, subject);
      list.append(li);
    }
  } catch (err) {
    console.warn("Moodwall: gmail fetch failed.", err);
    renderConnectButton(widget, () => connectGoogle());
    renderCardMessage(list, "Google 계정 연결이 필요해요");
  }
}

async function connectGoogle() {
  try {
    await getAuthToken(true);
    await Promise.all([refreshCalendarWidget(), refreshGmailWidget()]);
  } catch (err) {
    console.warn("Moodwall: Google sign-in failed.", err);
  }
}

async function disconnectGoogle() {
  try {
    const token = await getAuthToken(false);
    await removeCachedAuthToken(token);
    await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`, { mode: "no-cors" });
  } catch {
    // already signed out
  }
  await Promise.all([refreshCalendarWidget(), refreshGmailWidget()]);
}

async function hasGoogleAuth() {
  try {
    await getAuthToken(false);
    return true;
  } catch {
    return false;
  }
}

async function updateGoogleAuthButtons(signInButton, signOutButton) {
  const connected = await hasGoogleAuth();
  signInButton.hidden = connected;
  signOutButton.hidden = !connected;
}

async function initGoogleWidgets() {
  const toggleCalendar = document.getElementById("toggleCalendar");
  const toggleGmail = document.getElementById("toggleGmail");
  const settingsButton = document.getElementById("settingsButton");
  const settingsPanel = document.getElementById("settingsPanel");
  const signInButton = document.getElementById("googleSignInButton");
  const signOutButton = document.getElementById("googleSignOutButton");

  toggleCalendar.checked = (await storageGet("sync", CALENDAR_ENABLED_KEY)) ?? false;
  toggleGmail.checked = (await storageGet("sync", GMAIL_ENABLED_KEY)) ?? false;

  settingsButton.addEventListener("click", () => {
    settingsPanel.hidden = !settingsPanel.hidden;
  });

  toggleCalendar.addEventListener("change", async () => {
    await storageSet("sync", CALENDAR_ENABLED_KEY, toggleCalendar.checked);
    await refreshCalendarWidget();
  });

  toggleGmail.addEventListener("change", async () => {
    await storageSet("sync", GMAIL_ENABLED_KEY, toggleGmail.checked);
    await refreshGmailWidget();
  });

  await updateGoogleAuthButtons(signInButton, signOutButton);
  signInButton.addEventListener("click", async () => {
    await connectGoogle();
    await updateGoogleAuthButtons(signInButton, signOutButton);
  });
  signOutButton.addEventListener("click", async () => {
    await disconnectGoogle();
    await updateGoogleAuthButtons(signInButton, signOutButton);
  });

  await Promise.all([refreshCalendarWidget(), refreshGmailWidget()]);
}

async function applyMood(mood, manifest) {
  let photo = manifest ? pickPhoto(manifest, mood) : null;

  // The cached manifest may predate this mood (e.g. a mood added after the
  // last fetch) -- bypass the cache once before giving up on it.
  if (!photo && mood !== "random") {
    try {
      manifest = await loadManifest(true);
      photo = pickPhoto(manifest, mood);
    } catch (err) {
      console.warn("Moodwall: could not refresh manifest for mood.", err);
    }
  }

  applyBackground(photo);
  return manifest;
}

async function init() {
  const fontSelect = document.getElementById("fontSelect");
  const weightSelect = document.getElementById("weightSelect");
  const storedFont = (await storageGet("sync", FONT_KEY)) || "system";
  const storedWeight = (await storageGet("sync", WEIGHT_KEY)) || "800";
  fontSelect.value = storedFont;
  weightSelect.value = storedWeight;
  applyTypography(storedFont, storedWeight);

  fontSelect.addEventListener("change", async () => {
    await storageSet("sync", FONT_KEY, fontSelect.value);
    applyTypography(fontSelect.value, weightSelect.value);
  });

  weightSelect.addEventListener("change", async () => {
    await storageSet("sync", WEIGHT_KEY, weightSelect.value);
    applyTypography(fontSelect.value, weightSelect.value);
  });

  const toggleSeconds = document.getElementById("toggleSeconds");
  showSeconds = (await storageGet("sync", SHOW_SECONDS_KEY)) ?? true;
  toggleSeconds.checked = showSeconds;

  toggleSeconds.addEventListener("change", async () => {
    showSeconds = toggleSeconds.checked;
    await storageSet("sync", SHOW_SECONDS_KEY, showSeconds);
    updateClock();
  });

  const toggleQuote = document.getElementById("toggleQuote");
  const showQuote = (await storageGet("sync", SHOW_QUOTE_KEY)) ?? true;
  toggleQuote.checked = showQuote;
  await applyQuoteVisibility(showQuote);

  toggleQuote.addEventListener("change", async () => {
    await storageSet("sync", SHOW_QUOTE_KEY, toggleQuote.checked);
    await applyQuoteVisibility(toggleQuote.checked);
  });

  const layoutSelect = document.getElementById("layoutSelect");
  const storedLayout = (await storageGet("sync", LAYOUT_KEY)) || "center";
  layoutSelect.value = storedLayout;
  applyLayout(storedLayout);

  layoutSelect.addEventListener("change", async () => {
    await storageSet("sync", LAYOUT_KEY, layoutSelect.value);
    applyLayout(layoutSelect.value);
  });

  const select = document.getElementById("moodSelect");
  const storedMood = (await storageGet("sync", MOOD_KEY)) || "random";
  select.value = storedMood;

  let manifest = null;
  try {
    manifest = await loadManifest();
  } catch (err) {
    console.warn("Moodwall: could not load curated manifest yet.", err);
  }

  manifest = (await applyMood(storedMood, manifest)) ?? manifest;

  select.addEventListener("change", async () => {
    await storageSet("sync", MOOD_KEY, select.value);
    manifest = (await applyMood(select.value, manifest)) ?? manifest;
  });

  const bookmarks = await loadBookmarks().catch((err) => {
    console.warn("Moodwall: could not load bookmarks.", err);
    return [];
  });
  console.log(`Moodwall: loaded ${bookmarks.length} bookmark(s).`);
  renderBookmarks(bookmarks);

  await initGoogleWidgets();

  updateClock();
  setInterval(updateClock, 1000);
}

document.addEventListener("DOMContentLoaded", init);
