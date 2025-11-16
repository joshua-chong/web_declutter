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

function loadSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, resolve);
  });
}

function saveSettings(settings) {
  chrome.storage.sync.set(settings);
}

async function init() {
  const settings = await loadSettings();

  // Wire UI from settings
  document.getElementById("masterToggle").checked = settings.masterEnabled;
  document.getElementById("hidePromos").checked = settings.hidePromos;
  document.getElementById("reduceMotion").checked = settings.reduceMotion;
  document.getElementById("minimalLayout").checked = settings.minimalLayout;
  document.getElementById("enableMoodFilter").checked = settings.moodFilterEnabled;
  document.getElementById("showListeningTime").checked = settings.showListeningTime;
  document.getElementById("targetMinutes").value = settings.targetMinutes;
  document.getElementById("enableSummary").checked = settings.enableSummary;

  document.querySelectorAll(".emotion-toggle").forEach(cb => {
    cb.checked = settings.blockedEmotions.includes(cb.value);
  });
  document.querySelectorAll("input[name='moodMethod']").forEach(r => {
    r.checked = r.value === settings.moodMethod;
  });

function updateAndNotify() {
  const newSettings = {
    masterEnabled: document.getElementById("masterToggle").checked,
    hidePromos: document.getElementById("hidePromos").checked,
    reduceMotion: document.getElementById("reduceMotion").checked,
    minimalLayout: document.getElementById("minimalLayout").checked,
    moodFilterEnabled: document.getElementById("enableMoodFilter").checked,
    showListeningTime: document.getElementById("showListeningTime").checked,
    targetMinutes: Number(document.getElementById("targetMinutes").value) || 0,
    enableSummary: document.getElementById("enableSummary").checked,
    blockedEmotions: Array.from(
      document.querySelectorAll(".emotion-toggle:checked")
    ).map(cb => cb.value),
    moodMethod: document.querySelector("input[name='moodMethod']:checked").value
  };

  saveSettings(newSettings);

  // Detect specifically if masterEnabled changed
  const masterChanged = (newSettings.masterEnabled !== settings.masterEnabled);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { type: "APPLY_SETTINGS", payload: newSettings },
      () => {
        // If "Enable on this site" is toggled → reload the tab
        if (masterChanged) {
          chrome.tabs.reload(tabs[0].id);
        }
      }
    );
  });

  // Update local copy
  Object.assign(settings, newSettings);
}


  document.querySelectorAll("input").forEach(el => {
    el.addEventListener("change", updateAndNotify);
  });
}

document.addEventListener("DOMContentLoaded", init);
