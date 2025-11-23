export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-proxy-secret");

  if (req.method === "OPTIONS") return res.status(200).end();

  const clientSecret = req.headers["x-proxy-secret"];
  const serverSecret = process.env.PROXY_SECRET;

  if (clientSecret !== serverSecret)
    return res.status(401).json({ error: "Unauthorized: invalid proxy secret" });

  const { text, task } = req.body;
  if (!text || !task)
    return res.status(400).json({ error: "Missing text or task parameter" });

  const MODEL =
    task === "emotion"
      ? "j-hartmann/emotion-english-distilroberta-base"
      : "facebook/bart-large-cnn";

  const HF_API_KEY = process.env.HF_API_KEY;

  const HF_URL = `https://router.huggingface.co/hf-inference/models/${MODEL}`;

  const hfResponse = await fetch(HF_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: text,
      parameters: task === "summary" ? { max_length: 80, min_length: 25 } : {}
    }),
  });

  const data = await hfResponse.json();
  return res.status(200).json(data);
}
