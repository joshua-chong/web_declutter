// background.js

// Your deployed Vercel endpoint:
const HF_PROXY_URL = "https://declutter-proxy.vercel.app/api/hf-proxy";

// MUST match PROXY_SECRET on Vercel
const PROXY_SECRET = "JOSHUA_CHONG_336978";

// Listen for messages from content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "CLASSIFY_MOOD") {
    classifyMood(message.text)
      .then(result => sendResponse(result))
      .catch(err => {
        console.error("CLASSIFY_MOOD error:", err);
        sendResponse({ emotion: null });
      });
    return true; // async
  }

  if (message?.type === "SUMMARISE_TEXT") {
    summariseText(message.text)
      .then(result => sendResponse(result))
      .catch(err => {
        console.error("SUMMARISE_TEXT error:", err);
        sendResponse({ summary: null });
      });
    return true;
  }
});

// ----- Emotion via proxy -----
async function classifyMood(text) {
  const res = await fetch(HF_PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-proxy-secret": PROXY_SECRET
    },
    body: JSON.stringify({ task: "emotion", text })
  });

  const data = await res.json();
  if (!data.outputs || !Array.isArray(data.outputs)) {
    console.warn("Bad emotion response:", data);
    return { emotion: null };
  }

  const best = data.outputs.reduce((a, b) => (b.score > a.score ? b : a));
  return { emotion: best.label.toLowerCase(), score: best.score };
}

// ----- Summary via proxy -----
async function summariseText(text) {
  const res = await fetch(HF_PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-proxy-secret": PROXY_SECRET
    },
    body: JSON.stringify({ task: "summary", text })
  });

  const data = await res.json();
  if (!data.summary) {
    console.warn("Bad summary response:", data);
    return { summary: null };
  }
  return { summary: data.summary };
}
