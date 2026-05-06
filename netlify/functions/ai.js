exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ content: [{ text: "Lỗi: GEMINI_API_KEY chưa được set trên Netlify." }] }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ content: [{ text: "Lỗi: Request body không hợp lệ." }] }) };
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  let res, data;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody)
    });
    data = await res.json();
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ content: [{ text: "Lỗi kết nối tới Gemini: " + e.message }] }) };
  }

  if (!res.ok) {
    const errMsg = data?.error?.message || JSON.stringify(data);
    return {
      statusCode: res.status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ content: [{ text: "Lỗi Gemini API: " + errMsg }] })
    };
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Gemini không trả về nội dung.";

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ content: [{ text }] })
  };
};
