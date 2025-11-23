// ===============================
// HuggingFace API Endpoints
// ===============================
const HUGGINGFACE_EMOTION_URL =
  "https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base";

const HUGGINGFACE_SUMMARY_URL =
  "https://api-inference.huggingface.co/models/facebook/bart-large-cnn";



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

    return true; // async response
  }

  // ---- Playlist Summary ----
  if (message.type === "SUMMARISE_PLAYLIST") {
    summariseText(message.payload.text)
      .then(result => sendResponse(result))
      .catch(() => sendResponse({ summary: null }));
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
  if (method === "rules" || !HF_API_KEY) {
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

async function classifyMoodML(text) {
  const res = await fetch(HUGGINGFACE_EMOTION_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ inputs: text, options: { wait_for_model: true } })
  });

  const data = await res.json();
  const outputs = Array.isArray(data) ? data[0] : data;

  if (!Array.isArray(outputs)) return { emotion: null };

  const best = outputs.reduce((acc, cur) =>
    cur.score > acc.score ? cur : acc, outputs[0]
  );

  return best.score >= 0.5
    ? { emotion: best.label.toLowerCase() }
    : { emotion: null };
}


// ===============================
// SUMMARISE TEXT
// ===============================
async function summariseText(text) {
  const res = await fetch(HUGGINGFACE_SUMMARY_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: text,
      parameters: { max_length: 80, min_length: 25 },
      options: { wait_for_model: true }
    })
  });

  const data = await res.json();

  if (Array.isArray(data) && data[0]?.summary_text) {
    return { summary: data[0].summary_text };
  }

  return { summary: null };
}
