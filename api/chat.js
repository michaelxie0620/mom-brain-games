module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '尚未設定 GEMINI_API_KEY' });
  }

  try {
    const { text, audioBase64, mimeType, gameContext, history = [] } = req.body;

    const systemInstruction = `
你是一位溫暖、有耐心、講話親切的台灣晚輩，正在「樂齡健腦小樂園」裡陪媽媽玩健腦小遊戲並聊天。
請嚴格遵守以下規則：
1. 媽媽可能會講「台語」、「台灣國語」或夾雜台語詞彙。收到語音時請直接用心理解意思，絕不抱怨聽不懂或糾正她的發音。
2. 回覆請使用親切、自然的「台灣繁體中文口語」，可自然帶入「真厲害」、「水喔」、「免緊張」、「慢慢來」等溫暖詞彙。
3. 每次回覆控制在 45 個中文字以內，不使用條列式符號、表情符號或複雜成語（因為系統會直接用語音唸出來）。
4. 永遠給予正向鼓勵，讓媽媽玩得開心有自信。
${gameContext ? `\n【目前遊戲情境】：${gameContext}` : ''}
    `.trim();

    const userParts = [];
    if (audioBase64 && mimeType) {
      const cleanMimeType = mimeType.split(';')[0].trim();
      userParts.push({
        inlineData: { mimeType: cleanMimeType, data: audioBase64 }
      });
      userParts.push({
        text: text || '請聽這段語音（可能是台語或國語），理解意思後用親切簡短的台灣口語回應媽媽。'
      });
    } else if (text) {
      userParts.push({ text });
    } else {
      return res.status(400).json({ error: '缺少對話內容' });
    }

    const contents = [
      ...history.slice(-6),
      { role: 'user', parts: userParts }
    ];

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { temperature: 0.75, maxOutputTokens: 180 }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('Gemini API Error:', data);
      return res.status(502).json({ error: data?.error?.message || 'AI 暫時忙碌中' });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      '你剛剛講得很好喔，我們繼續吧！';

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Server Error:', err);
    return res.status(500).json({ error: '連線發生異常' });
  }
};
