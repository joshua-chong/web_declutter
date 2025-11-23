// ===============================
// Vercel Proxy Endpoint (secured)
// ===============================
const HF_PROXY_URL =
  "https://declutter-proxy.vercel.app/api/hf-proxy";  // <-- Your Vercel endpoint

// Your secret — must match PROXY_SECRET in Vercel dashboard
const PROXY_SECRET = "JOSHUA_CHONG_336978";


// ===============================
// Message Listener (MAIN)
// ===============================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // ---- Emotion Classification ----
  if (message.type === "CLASSIFY_MOOD") {
    classifyMood(message.payload.text, message.payload.method)
      .then(result => {
        console.log("Classifier result:", result);
        sendResponse(result);
      })
      .catch(err => {
        console.error("Classifier error:", err);
        sendResponse({ emotion: null });
      });
    return true;
  }

  // ---- Playlist Summary ----
  if (message.type === "SUMMARISE_PLAYLIST") {
    summariseText(message.payload.text)
      .then(result => sendResponse(result))
      .catch(err => {
        console.error("Summary error:", err);
        sendResponse({ summary: null });
      });
    return true;
  }
});


// ===============================
// Simple rules-based fallback
// ===============================
const RULES_LEXICON = {
  sadness: ["sad", "cry", "tears", "lonely", "heartbreak"],
  anger: ["rage", "angry", "furious", "revenge", "hate"],
  fear: ["scared", "fear", "haunted", "nightmare", "horror"]
};


// ===============================
// CLASSIFY MOOD
// ===============================
function classifyMood(text, method) {
  if (method === "rules") {
    return Promise.resolve(classifyMoodRules(text));
  }
  return classifyMoodML(text);
}

function classifyMoodRules(text) {
  const lower = text.toLowerCase();
  const scores = { sadness: 0, anger: 0, fear: 0 };

  Object.entries(RULES_LEXICON).forEach(([emotion, words]) => {
    words.forEach(word => {
      if (lower.includes(word)) scores[emotion] += 1;
    });
  });

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] === 0) return { emotion: null };
  return { emotion: best[0] };
}


// ===============================
// ML CLASSIFIER via Vercel Proxy
// ===============================
async function classifyMoodML(text) {
  const res = await fetch(HF_PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-proxy-secret": PROXY_SECRET
    },
    body: JSON.stringify({
      task: "emotion",
      text: text,
      endpoint: "https://router.huggingface.co/hf-inference/models/j-hartmann/emotion-english-distilroberta-base"
    })
  });

  const data = await res.json();
  console.log("Proxy response:", data);

  if (!data || !data.data || !Array.isArray(data.data)) {
    return { emotion: null };
  }

  const outputs = data.data;

  const best = outputs.reduce((a, b) => (b.score > a.score ? b : a), outputs[0]);

  return best.score >= 0.4
    ? { emotion: best.label.toLowerCase() }
    : { emotion: null };
}


// ===============================
// SUMMARY via Vercel Proxy
// ===============================
async function summariseText(text) {
  const res = await fetch(HF_PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-proxy-secret": PROXY_SECRET
    },
    body: JSON.stringify({
      task: "summary",
      text: text,
      endpoint: "https://router.huggingface.co/hf-inference/models/facebook/bart-large-cnn",
      parameters: { max_length: 80, min_length: 25 }
    })
  });

  const data = await res.json();
  console.log("Summary proxy response:", data);

  if (data.summary) {
    return { summary: data.summary };
  }

  return { summary: null };
}
