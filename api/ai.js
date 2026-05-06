module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ content: [{ text: "Lỗi: GEMINI_API_KEY chưa được set trên Vercel." }] });
  }

  const body = req.body;
  if (!body || !body.messages) {
    return res.status(400).json({ content: [{ text: "Lỗi: Request body không hợp lệ." }] });
  }

  const messages = body.messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  if (body.system && messages.length > 0 && messages[0].role === "user") {
    messages[0].parts[0].text = body.system + "\n\n" + messages[0].parts[0].text;
  }

  const geminiBody = {
    contents: messages,
    generationConfig: { maxOutputTokens: body.max_tokens || 1000 }
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
  let geminiRes, data;
  try {
    geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody)
    });
    data = await geminiRes.json();
  } catch (e) {
    return res.status(500).json({ content: [{ text: "Lỗi kết nối tới Gemini: " + e.message }] });
  }

  if (!geminiRes.ok) {
    const errMsg = data?.error?.message || JSON.stringify(data);
    return res.status(geminiRes.status).json({ content: [{ text: "Lỗi Gemini API: " + errMsg }] });
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Gemini không trả về nội dung.";
  res.status(200).json({ content: [{ text }] });
};
