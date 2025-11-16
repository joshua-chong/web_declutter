// content.js

// --------------------------
// Defaults & state
// --------------------------

const DEFAULT_SETTINGS = {
  masterEnabled: true,
  hidePromos: true,
  reduceMotion: true,
  minimalLayout: false,
  moodFilterEnabled: false,
  blockedEmotions: ["sadness"],
  moodMethod: "rules",
  showListeningTime: true,
  targetMinutes: 25,
  enableSummary: false
};

let currentSettings = { ...DEFAULT_SETTINGS };
let mutationObserver = null;

// --------------------------
// Settings helpers
// --------------------------

function loadSettings(callback) {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
    currentSettings = { ...DEFAULT_SETTINGS, ...stored };
    if (typeof callback === "function") callback(currentSettings);
  });
}

// --------------------------
// Message listener (from popup & background)
// --------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "APPLY_SETTINGS") {
    currentSettings = { ...currentSettings, ...message.payload };
    if (currentSettings.masterEnabled) {
      applyAll();
    } else {
      removeAllExtensionEffects();
    }
    sendResponse && sendResponse({ ok: true });
    return;
  }

  // You could add more message types here if needed
});

// --------------------------
// Init
// --------------------------

function init() {
  if (!document.body) {
    // In rare cases body isn't ready yet
    document.addEventListener("DOMContentLoaded", init, { once: true });
    return;
  }

  loadSettings((settings) => {
    if (settings.masterEnabled) {
      applyAll();
      startMutationObserver();
    }
  });
}

function startMutationObserver() {
  if (mutationObserver) return;

  mutationObserver = new MutationObserver(() => {
    if (currentSettings && currentSettings.masterEnabled) {
      applyAll();
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// --------------------------
// Host helpers
// --------------------------

function getHostKey() {
  const host = window.location.hostname;
  if (host.endsWith("bandcamp.com")) return "bandcamp.com";
  return host;
}

// --------------------------
// Main apply function
// --------------------------

function applyAll() {
  const hostKey = getHostKey();

  document.body.classList.add(
    "nf-music-active",
    `nf-${hostKey.replace(/\./g, "-")}`
  );

  if (
    currentSettings.hidePromos ||
    currentSettings.reduceMotion ||
    currentSettings.minimalLayout
  ) {
    applyDistractionRemoval(currentSettings);
  }

  if (currentSettings.moodFilterEnabled) {
    applyMoodFilter(currentSettings);
  }

  if (currentSettings.showListeningTime) {
    applyListeningTime(currentSettings);
  }

  if (currentSettings.enableSummary) {
    applySummaryBox(currentSettings);
  }
}

// --------------------------
// Distraction removal
// --------------------------

function applyDistractionRemoval(settings) {
  const host = window.location.hostname;

  // ------------ YouTube Music ------------
  if (host === "music.youtube.com") {
    // Hide upsell banners
    if (settings.hidePromos) {
      document
        .querySelectorAll(
          "ytmusic-upsell-dialog, ytmusic-premium-upsell, .ytmusic-promo-banner"
        )
        .forEach((el) => el.remove());
    }

    // Reduce motion: pause animated thumbnails / visualisers
    if (settings.reduceMotion) {
      document
        .querySelectorAll("video, canvas.animated-artwork")
        .forEach((el) => {
          el.style.animationPlayState = "paused";
          if (el.tagName === "VIDEO") {
            el.pause();
            el.muted = true;
          }
        });

      // Reduce smooth-scrolling motion
      document.documentElement.style.scrollBehavior = "auto";
    }

    // Minimal layout: hide sidebars, carousels, background images
    if (settings.minimalLayout) {
      document.body.classList.add("nf-minimal-layout");

      const toHide = [
        "ytmusic-guide-renderer", // left nav
        "ytmusic-carousel-shelf-renderer", // homepage shelves
        "ytmusic-player-bar-background", // large art
        ".ytmusic-related-panel", // related tracks (if present)
        ".ytmusic-comments-panel" // comments (if present)
      ];

      toHide.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          el.classList.add("nf-hidden-element");
        });
      });
    }
  }

  // ------------ Spotify Web ------------
  if (host === "open.spotify.com") {
    if (settings.hidePromos) {
      const promoSelectors = [
        '[data-testid="upgrade-button"]',
        "[data-testid='banner']",
        ".bd3deb85f7f1b112d1cce9c5b83391c9", // promo/banners (class names may change)
        ".RANLXG3ZfF7MjhZtG8uC" // sometimes used for upsell strips
      ];

      promoSelectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => el.remove());
      });
    }

    if (settings.reduceMotion) {
      document.querySelectorAll("video, canvas").forEach((el) => {
        el.style.animationPlayState = "paused";
        if (el.tagName === "VIDEO") {
          el.pause();
          el.muted = true;
        }
      });
      document.documentElement.style.scrollBehavior = "auto";
    }

    if (settings.minimalLayout) {
      document.body.classList.add("nf-minimal-layout");

      const toHide = [
        "[data-testid='left-sidebar']",
        "[data-testid='right-sidebar']",
        "[data-testid='now-playing-bar-background']",
        "[aria-label='Friend activity']",
        "[data-testid='visualizer']"
      ];

      toHide.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          el.classList.add("nf-hidden-element");
        });
      });
    }
  }

  // ------------ SoundCloud ------------
  if (host === "soundcloud.com") {
    if (settings.hidePromos) {
      const promoSelectors = [
        ".playControls__upsell",
        ".frontHero",
        ".sc-promoted",
        ".upsellDialog"
      ];

      promoSelectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => el.remove());
      });
    }

    if (settings.reduceMotion) {
      document.querySelectorAll("video, canvas").forEach((el) => {
        el.style.animationPlayState = "paused";
        if (el.tagName === "VIDEO") {
          el.pause();
          el.muted = true;
        }
      });
      document.documentElement.style.scrollBehavior = "auto";
    }

    if (settings.minimalLayout) {
      document.body.classList.add("nf-minimal-layout");

      const toHide = [
        ".sidebarRight",
        ".frontHero", // big hero banner
        ".listenEngagement", // related tracks, reposts, etc.
        ".soundActions" // social buttons
      ];

      toHide.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          el.classList.add("nf-hidden-element");
        });
      });
    }
  }

  // ------------ Bandcamp ------------
  if (host.endsWith("bandcamp.com")) {
    if (settings.hidePromos) {
      const promoSelectors = [
        ".merch",
        ".buyFullDigital",
        ".buyItem",
        ".fan-favorites",
        ".recommendations"
      ];

      promoSelectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => el.remove());
      });
    }

    if (settings.reduceMotion) {
      document.querySelectorAll("video, canvas").forEach((el) => {
        el.style.animationPlayState = "paused";
        if (el.tagName === "VIDEO") {
          el.pause();
          el.muted = true;
        }
      });
      document.documentElement.style.scrollBehavior = "auto";
    }

    if (settings.minimalLayout) {
      document.body.classList.add("nf-minimal-layout");

      const toHide = [
        "#band-navbar", // top nav
        ".leftTop",
        ".rightTop",
        ".grid-merch",
        ".recommended" // recommended / more merch
      ];

      toHide.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          el.classList.add("nf-hidden-element");
        });
      });
    }
  }
}

// --------------------------
// Mood filtering
// --------------------------

function applyMoodFilter(settings) {
  const hostKey = getHostKey();
  const tiles = findMusicTiles(hostKey);

  tiles.forEach((tile) => {
    if (tile.el.dataset.nfMoodProcessed === "1") return;
    tile.el.dataset.nfMoodProcessed = "1";

    const text =
      [tile.title, tile.description].filter(Boolean).join(" – ") || "";
    if (!text.trim()) return;

    chrome.runtime.sendMessage(
      {
        type: "CLASSIFY_MOOD",
        payload: {
          text,
          method: settings.moodMethod
        }
      },
      (response) => {
        if (!response || !response.emotion) return;
        const emotion = response.emotion.toLowerCase();

        if (settings.blockedEmotions.includes(emotion)) {
          blurTile(tile.el, emotion);
        }
      }
    );
  });
}

function findMusicTiles(hostKey) {
  const tiles = [];

  if (hostKey === "music.youtube.com") {
    // Playlist / album / track items (YouTube Music)
    document
      .querySelectorAll(
        "ytmusic-responsive-list-item-renderer, ytmusic-two-row-item-renderer"
      )
      .forEach((el) => {
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
  }

  if (hostKey === "open.spotify.com") {
    // Entity rows like playlists, albums, artists etc.
    document
      .querySelectorAll("[data-testid='entity-row']")
      .forEach((el) => {
        const title =
          el.querySelector("div[dir='auto']")?.textContent?.trim() || "";
        const subtitle =
          el
            .querySelector("div[dir='auto']:nth-of-type(2)")
            ?.textContent?.trim() || "";
        if (title) tiles.push({ el, title, description: subtitle });
      });
  }

  if (hostKey === "soundcloud.com") {
    document.querySelectorAll(".soundList__item").forEach((el) => {
      const title =
        el.querySelector(".soundTitle__title")?.textContent?.trim() || "";
      const subtitle =
        el.querySelector(".soundTitle__username")?.textContent?.trim() || "";
      if (title) tiles.push({ el, title, description: subtitle });
    });
  }

  if (hostKey === "bandcamp.com") {
    document.querySelectorAll(".music-grid .grid-item").forEach((el) => {
      const title = el.querySelector(".title")?.textContent?.trim() || "";
      const subtitle =
        el.querySelector(".artist")?.textContent?.trim() ||
        el.querySelector(".subtext")?.textContent?.trim() ||
        "";
      if (title) tiles.push({ el, title, description: subtitle });
    });
  }

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

  // First click reveals it
  const onClick = () => {
    el.classList.remove("nf-blurred-tile");
    el.removeEventListener("click", onClick);
  };
  el.addEventListener("click", onClick);
}

// --------------------------
// Listening time estimation
// --------------------------

function applyListeningTime(settings) {
  const hostKey = getHostKey();
  let totalSeconds = 0;

  if (hostKey === "open.spotify.com") {
    // Tracklist durations
    document
      .querySelectorAll("div[role='grid'] span[dir='auto']")
      .forEach((el) => {
        const text = el.textContent.trim();
        if (!/^\d+:\d{2}/.test(text)) return;
        const parts = text.split(":").map(Number);
        let seconds = 0;
        if (parts.length === 2) {
          seconds = parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
          seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        totalSeconds += seconds;
      });
  }

  if (hostKey === "music.youtube.com") {
    // Duration badges in playlists/queues
    document
      .querySelectorAll(
        "ytmusic-responsive-list-item-renderer span, ytmusic-player-queue-item span"
      )
      .forEach((el) => {
        const text = el.textContent.trim();
        if (!/^\d+:\d{2}/.test(text)) return;
        const parts = text.split(":").map(Number);
        let seconds = 0;
        if (parts.length === 2) {
          seconds = parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
          seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        totalSeconds += seconds;
      });
  }

  if (hostKey === "soundcloud.com") {
    document.querySelectorAll(".sound__duration").forEach((el) => {
      const text = el.textContent.trim();
      if (!/^\d+:\d{2}/.test(text)) return;
      const parts = text.split(":").map(Number);
      let seconds = 0;
      if (parts.length === 2) {
        seconds = parts[0] * 60 + parts[1];
      } else if (parts.length === 3) {
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      totalSeconds += seconds;
    });
  }

  if (hostKey === "bandcamp.com") {
    document.querySelectorAll(".track_list .time").forEach((el) => {
      const text = el.textContent.trim();
      if (!/^\d+:\d{2}/.test(text)) return;
      const parts = text.split(":").map(Number);
      let seconds = 0;
      if (parts.length === 2) {
        seconds = parts[0] * 60 + parts[1];
      } else if (parts.length === 3) {
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      totalSeconds += seconds;
    });
  }

  if (!totalSeconds) {
    removeListeningBadge();
    return;
  }

  const minutes = Math.round(totalSeconds / 60);
  injectListeningBadge(minutes, settings.targetMinutes || 0);
}

function injectListeningBadge(totalMinutes, targetMinutes) {
  let badge = document.querySelector(".nf-listening-time-badge");
  if (!badge) {
    badge = document.createElement("div");
    badge.className = "nf-listening-time-badge";
    document.body.appendChild(badge);
  }

  let text = `≈ ${totalMinutes} min total`;
  if (targetMinutes > 0) {
    const diff = totalMinutes - targetMinutes;
    if (Math.abs(diff) <= 5) {
      text += ` • matches your ${targetMinutes} min session`;
    } else if (diff > 0) {
      text += ` • ${diff} min longer than target`;
    } else {
      text += ` • ${-diff} min shorter than target`;
    }
  }

  badge.textContent = text;
}

function removeListeningBadge() {
  const badge = document.querySelector(".nf-listening-time-badge");
  if (badge) badge.remove();
}

// --------------------------
// AI summary injection
// --------------------------

function applySummaryBox(settings) {
  const hostKey = getHostKey();
  const summaryContainer = findSummaryTarget(hostKey);
  if (!summaryContainer) return;

  if (summaryContainer.dataset.nfSummaryRequested === "1") return;
  summaryContainer.dataset.nfSummaryRequested = "1";

  const textToSummarise = collectSummaryText(hostKey);
  if (!textToSummarise) return;

  chrome.runtime.sendMessage(
    {
      type: "SUMMARISE_PLAYLIST",
      payload: { text: textToSummarise }
    },
    (response) => {
      if (!response || !response.summary) return;
      injectSummaryBox(summaryContainer, response.summary);
    }
  );
}

function findSummaryTarget(hostKey) {
  if (hostKey === "music.youtube.com") {
    return (
      document.querySelector("ytmusic-detail-header-renderer") ||
      document.querySelector("ytmusic-header-renderer")
    );
  }

  if (hostKey === "open.spotify.com") {
    return document.querySelector("[data-testid='playlist-page'], [data-testid='album-page']");
  }

  if (hostKey === "soundcloud.com") {
    return document.querySelector(".fullListenHero, .listenHero__title");
  }

  if (hostKey === "bandcamp.com") {
    return document.querySelector("#name-section, .trackTitle");
  }

  return null;
}

function collectSummaryText(hostKey) {
  let pieces = [];

  if (hostKey === "music.youtube.com") {
    const header = document.querySelector("ytmusic-detail-header-renderer");
    if (header) {
      const title =
        header.querySelector("#title")?.textContent?.trim() || "";
      const subtitle =
        header.querySelector("#subtitle")?.textContent?.trim() || "";
      const description =
        header.querySelector("#description")?.textContent?.trim() || "";
      pieces.push(title, subtitle, description);
    }

    document
      .querySelectorAll(
        "ytmusic-responsive-list-item-renderer .title, ytmusic-responsive-list-item-renderer .subtitle"
      )
      .forEach((el) => {
        const t = el.textContent.trim();
        if (t) pieces.push(t);
      });
  }

  if (hostKey === "open.spotify.com") {
    const headerTitle =
      document
        .querySelector("[data-testid='entity-title']")?.textContent?.trim() ||
      "";
    const headerSub =
      document
        .querySelector("[data-testid='entity-subtitle']")?.textContent?.trim() ||
      "";

    if (headerTitle) pieces.push(headerTitle);
    if (headerSub) pieces.push(headerSub);

    document
      .querySelectorAll("div[role='grid'] a[dir='auto']")
      .forEach((el, idx) => {
        if (idx > 50) return; // keep it short
        const t = el.textContent.trim();
        if (t) pieces.push(t);
      });
  }

  if (hostKey === "soundcloud.com") {
    const title =
      document
        .querySelector(".soundTitle__title")?.textContent?.trim() || "";
    const user =
      document
        .querySelector(".soundTitle__username")?.textContent?.trim() || "";
    const desc =
      document
        .querySelector(".listenDetails__description")?.textContent?.trim() ||
      "";
    pieces.push(title, user, desc);
  }

  if (hostKey === "bandcamp.com") {
    const album =
      document.querySelector("#name-section .trackTitle")?.textContent?.trim() ||
      "";
    const artist =
      document
        .querySelector("#name-section .artist")?.textContent?.trim() || "";
    const desc =
      document
        .querySelector("#trackInfo, .tralbum-about")?.textContent?.trim() || "";
    pieces.push(album, artist, desc);
  }

  return pieces
    .filter(Boolean)
    .join(" • ")
    .slice(0, 2000); // avoid huge prompts
}

function injectSummaryBox(container, summaryText) {
  // Avoid duplicates
  if (container.querySelector(".nf-summary-box")) return;

  const box = document.createElement("div");
  box.className = "nf-summary-box";
  box.textContent = summaryText;

  // Try to insert at top of container
  if (container.firstChild) {
    container.insertBefore(box, container.firstChild);
  } else {
    container.appendChild(box);
  }
}

// --------------------------
// Cleanup
// --------------------------

function removeAllExtensionEffects() {
  document.body.classList.remove("nf-music-active");
  document
    .querySelectorAll(
      ".nf-hidden-element, .nf-blurred-tile, .nf-mood-chip, .nf-listening-time-badge, .nf-summary-box"
    )
    .forEach((el) => {
      if (el.classList.contains("nf-hidden-element")) {
        el.classList.remove("nf-hidden-element");
      } else {
        el.remove();
      }
    });

  document.body.className = document.body.className
    .split(" ")
    .filter((cls) => !cls.startsWith("nf-"))
    .join(" ");

  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
}

// --------------------------
// Kick off
// --------------------------

init();
