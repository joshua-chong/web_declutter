// api/hf-proxy.js

export default async function handler(req, res) {
  // --- CORS so Chrome extension can call it ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-proxy-secret");

  if (req.method === "OPTIONS") return res.status(200).end();

  // --- Shared secret check ---
  const clientSecret = req.headers["x-proxy-secret"];
  const serverSecret = process.env.PROXY_SECRET;

  if (!serverSecret) {
    return res.status(500).json({ error: "Proxy misconfigured: no PROXY_SECRET" });
  }

  if (clientSecret !== serverSecret) {
    return res.status(401).json({ error: "Unauthorized: invalid proxy secret" });
  }

  const { text, task } = req.body || {};

  if (!text || !task) {
    return res.status(400).json({ error: "Missing text or task" });
  }

  // Choose model
  const model =
    task === "emotion"
      ? "j-hartmann/emotion-english-distilroberta-base"
      : "facebook/bart-large-cnn";

  const HF_API_KEY = process.env.HF_API_KEY;
  if (!HF_API_KEY) {
    return res.status(500).json({ error: "Missing HF_API_KEY" });
  }

  const url = `https://router.huggingface.co/hf-inference/models/${model}`;

  const body = {
    inputs: text,
    ...(task === "summary"
      ? { parameters: { max_length: 80, min_length: 25 } }
      : {})
  };

  const hfRes = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await hfRes.json();

  if (!hfRes.ok) {
    return res.status(hfRes.status).json({ error: data.error || "HF error" });
  }

  // Normalise output shape for the extension
  if (task === "emotion") {
    // expected: [ [ { label, score }, ... ] ]
    const arr = Array.isArray(data) ? data[0] : data;
    return res.status(200).json({ task: "emotion", outputs: arr });
  } else {
    // expected: [ { summary_text } ]
    const summary =
      Array.isArray(data) && data[0] && data[0].summary_text
        ? data[0].summary_text
        : null;
    return res.status(200).json({ task: "summary", summary });
  }
}
