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
規則：
1. 媽媽可能會講「台語」、「台灣國語」或夾雜台語詞彙。收到語音時請直接理解意思，絕不抱怨聽不懂或糾正發音。
2. 回覆使用親切自然的「台灣繁體中文口語」，可自然帶入「真厲害」、「水喔」、「免緊張」等溫暖詞彙。
3. 每次回覆控制在 35 個中文字以內，不使用表情符號或列表符號（系統會直接用語音唸出來）。
${gameContext ? `\n【目前遊戲情境】：${gameContext}` : ''}
    `.trim();

    const userParts = [];
    if (audioBase64 && mimeType) {
      const cleanMimeType = mimeType.split(';')[0].trim();
      userParts.push({ inlineData: { mimeType: cleanMimeType, data: audioBase64 } });
      userParts.push({ text: text || '請聽這段語音（可能是台語或國語），用親切簡短的台灣口語回應媽媽。' });
    } else if (text) {
      userParts.push({ text });
    } else {
      return res.status(400).json({ error: '缺少對話內容' });
    }

    const contents = [...history.slice(-4), { role: 'user', parts: userParts }];

    // 優先用速度最快、不塞車的 Lite 模型；若不支援再自動切換主模型
    const attempts = [
      { model: 'gemini-3.8-flash-lite', disableThinking: true },
      { model: 'gemini-3.8-flash', disableThinking: true },
      { model: 'gemini-3.8-flash', disableThinking: false }
    ];

    let response;
    let data = {};

    for (const item of attempts) {
      const genConfig = {
        temperature: 0.7,
        maxOutputTokens: 100
      };
      if (item.disableThinking) {
        genConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 最多等 5 秒，絕不乾等 10 秒

      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${item.model}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents,
              generationConfig: genConfig
            }),
            signal: controller.signal
          }
        );
        clearTimeout(timeoutId);
        data = await response.json();
        if (response.ok) break;
      } catch (e) {
        clearTimeout(timeoutId);
      }
    }

    if (!response || !response.ok) {
      return res.status(200).json({
        reply: '哎呀，剛剛線上剛好有點忙，再按一次跟我說好嗎？'
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      '你剛剛講得很好喔，我們繼續吧！';

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: '連線發生異常' });
  }
};
