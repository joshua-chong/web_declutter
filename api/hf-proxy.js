// /api/hf-proxy.js

export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-proxy-secret");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // --- SECURITY CHECK ---
  const clientSecret = req.headers["x-proxy-secret"];
  const serverSecret = process.env.PROXY_SECRET;

  if (!serverSecret) {
    return res.status(500).json({ error: "Proxy misconfigured: no PROXY_SECRET" });
  }

  if (clientSecret !== serverSecret) {
    return res.status(401).json({ error: "Unauthorized: invalid proxy secret" });
  }

  // --- Parse input ---
  const { text, task, parameters } = req.body;

  if (!text || !task) {
    return res.status(400).json({ error: "Missing text or task parameter" });
  }

  // Select model
  const MODEL = task === "emotion"
    ? "j-hartmann/emotion-english-distilroberta-base"
    : "facebook/bart-large-cnn";

  const HF_API_KEY = process.env.HF_API_KEY;

  if (!HF_API_KEY) {
    return res.status(500).json({ error: "Missing HuggingFace API key" });
  }

  // --- USE NEW HF ROUTER ENDPOINT ---
  const HF_URL = `https://router.huggingface.co/hf-inference/models/${MODEL}`;

  try {
    const hfResponse = await fetch(HF_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: text,
        parameters: parameters || {},
        options: {
          wait_for_model: true,
          use_cache: false
        }
      })
    });

    const data = await hfResponse.json();
    return res.status(200).json({ data });

  } catch (err) {
    return res.status(500).json({ error: "HF request failed", details: err });
  }
}
