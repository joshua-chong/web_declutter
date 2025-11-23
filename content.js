// content.js

// Simple always-on flags
const SETTINGS = {
  blockAds: true,
  useMoodFilter: true,
  useSummary: true
};

let moodProcessed = new WeakSet();
let observer = null;

function init() {
  if (!document.body) {
    document.addEventListener("DOMContentLoaded", init, { once: true });
    return;
  }

  applyAll();

  observer = new MutationObserver(() => {
    applyAll();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function applyAll() {
  if (SETTINGS.blockAds) {
    applyAdBlocking();
  }
  if (SETTINGS.useMoodFilter) {
    applyMoodFilter();
  }
  if (SETTINGS.useSummary) {
    applySummary();
  }
}

// ---------- 1. Ad / video declutter ----------

function applyAdBlocking() {
  const host = location.hostname;
  if (host !== "music.youtube.com") return;

  // Remove ad-specific elements
  const adSelectors = [
    "ytmusic-player-ads-renderer",
    "ytmusic-music-video-ads-renderer",
    ".ytp-ad-player-overlay",
    ".ytp-ad-image-overlay",
    ".ytp-ad-text-overlay",
    ".ytp-ad-module",
    "iframe[src*='doubleclick']"
  ];

  adSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => el.remove());
  });

  // Replace video area with album art (audio-only feel)
  const art = document.querySelector("ytmusic-player-bar img.image");
  const container = document.querySelector("#song-media-window");

  if (art && container && !container.querySelector(".nf-audio-cover")) {
    container.innerHTML = "";
    const img = document.createElement("img");
    img.src = art.src;
    img.className = "nf-audio-cover";
    container.appendChild(img);
  }
}

// ---------- 2. Mood filter ----------

function applyMoodFilter() {
  if (location.hostname !== "music.youtube.com") return;

  const tiles = findMusicTiles();
  if (!tiles.length) return;

  console.log("Mood filter running on tiles:", tiles.length);

  tiles.forEach(tile => {
    if (moodProcessed.has(tile.el)) return;
    moodProcessed.add(tile.el);

    const text =
      [tile.title, tile.description].filter(Boolean).join(" – ") || "";
    if (!text.trim()) return;

    chrome.runtime.sendMessage(
      { type: "CLASSIFY_MOOD", text },
      res => {
        if (!res || !res.emotion) return;
        const emotion = res.emotion.toLowerCase();
        if (emotion === "sadness") {
          blurTile(tile.el, emotion);
        }
      }
    );
  });
}

function findMusicTiles() {
  const tiles = [];
  document
    .querySelectorAll(
      "ytmusic-responsive-list-item-renderer, ytmusic-two-row-item-renderer"
    )
    .forEach(el => {
      const title =
        el.querySelector(".title")?.textContent?.trim() ||
        el.querySelector("#title")?.textContent?.trim() ||
        "";
      const subtitle =
        el.querySelector(".subtitle")?.textContent?.trim() ||
        el.querySelector("#subtitle")?.textContent?.trim() ||
        "";
      if (title) tiles.push({ el, title, description: subtitle });
    });
  return tiles;
}

function blurTile(el, emotion) {
  el.classList.add("nf-blurred-tile");

  if (!el.querySelector(".nf-mood-chip")) {
    const chip = document.createElement("div");
    chip.className = "nf-mood-chip";
    chip.textContent = `Filtered for: ${emotion}`;
    el.appendChild(chip);
  }

  const onClick = () => {
    el.classList.remove("nf-blurred-tile");
    el.removeEventListener("click", onClick);
  };
  el.addEventListener("click", onClick);
}

// ---------- 3. Summary ----------

let summaryInjected = false;

function applySummary() {
  if (summaryInjected) return;
  if (location.hostname !== "music.youtube.com") return;

  const header =
    document.querySelector("ytmusic-detail-header-renderer") ||
    document.querySelector("ytmusic-header-renderer");

  if (!header) return;

  const text = collectSummaryText();
  if (!text) return;

  chrome.runtime.sendMessage(
    { type: "SUMMARISE_TEXT", text },
    res => {
      if (!res || !res.summary) return;
      injectSummaryBox(header, res.summary);
      summaryInjected = true;
    }
  );
}

function collectSummaryText() {
  const pieces = [];

  const header = document.querySelector("ytmusic-detail-header-renderer");
  if (header) {
    const title = header.querySelector("#title")?.textContent?.trim() || "";
    const subtitle = header.querySelector("#subtitle")?.textContent?.trim() || "";
    const description =
      header.querySelector("#description")?.textContent?.trim() || "";
    pieces.push(title, subtitle, description);
  }

  document
    .querySelectorAll(
      "ytmusic-responsive-list-item-renderer .title, ytmusic-responsive-list-item-renderer .subtitle"
    )
    .forEach((el, idx) => {
      if (idx > 50) return;
      const t = el.textContent.trim();
      if (t) pieces.push(t);
    });

  return pieces
    .filter(Boolean)
    .join(" • ")
    .slice(0, 2000);
}

function injectSummaryBox(container, summaryText) {
  if (container.querySelector(".nf-summary-box")) return;
  const box = document.createElement("div");
  box.className = "nf-summary-box";
  box.textContent = summaryText;
  container.insertBefore(box, container.firstChild || null);
}

// ---------- Boot ----------

init();
