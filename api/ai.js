module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ content: [{ text: "Lỗi: GROQ_API_KEY chưa được set." }] });
  }

  const body = req.body;
  if (!body || !body.messages) {
    return res.status(400).json({ content: [{ text: "Lỗi: Request body không hợp lệ." }] });
  }

  const messages = body.messages.map(m => ({ role: m.role, content: m.content }));
  if (body.system) {
    messages.unshift({ role: "system", content: body.system });
  }

  const groqBody = {
    model: "llama-3.3-70b-versatile",
    messages,
    max_tokens: body.max_tokens || 1000
  };

  let groqRes, data;
  try {
    groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(groqBody)
    });
    data = await groqRes.json();
  } catch (e) {
    return res.status(500).json({ content: [{ text: "Lỗi kết nối tới Groq: " + e.message }] });
  }

  if (!groqRes.ok) {
    const errMsg = data?.error?.message || JSON.stringify(data);
    return res.status(groqRes.status).json({ content: [{ text: "Lỗi Groq API: " + errMsg }] });
  }

  const text = data.choices?.[0]?.message?.content || "Groq không trả về nội dung.";
  res.status(200).json({ content: [{ text }] });
};
