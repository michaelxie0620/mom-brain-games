let cachedModels = null;
let cacheTimestamp = 0;

async function getCandidateModels(apiKey) {
  const now = Date.now();
  if (cachedModels && now - cacheTimestamp < 10 * 60 * 1000) {
    return cachedModels;
  }

  const fallbackList = [
    'gemini-3.8-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    'gemini-3.8-flash'
  ];

  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?pageSize=100',
      { headers: { 'x-goog-api-key': apiKey } }
    );
    if (!res.ok) return fallbackList;

    const data = await res.json();
    const excludePattern =
      /embedding|imagen|veo|tts|image|aqa|robotics|computer|research|live|native-audio|dialog|gemma|gemini-1\.|gemini-2\.0/i;

    const models = (data.models || [])
      .filter(
        (m) =>
          m.supportedGenerationMethods?.includes('generateContent') &&
          m.name?.startsWith('models/gemini-') &&
          !excludePattern.test(m.name) &&
          m.name !== 'models/gemini-2.5-flash'
      )
      .map((m) => m.name.replace('models/', ''));

    if (models.length === 0) return fallbackList;

    models.sort((a, b) => {
      const rank = (name) => {
        if (name === 'gemini-3.8-flash') return 40;
        if (name.includes('flash-lite')) return 10;
        if (name.includes('flash')) return 20;
        if (name.includes('pro')) return 30;
        return 50;
      };
      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;
      return b.localeCompare(a);
    });

    cachedModels = models.slice(0, 6);
    cacheTimestamp = now;
    return cachedModels;
  } catch (e) {
    return fallbackList;
  }
}

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
你是一位溫暖、有耐心、講話親切的台灣聊天夥伴，正在「樂齡健腦小樂園」裡陪使用者玩健腦小遊戲並聊天。
規則：
1. 稱呼對方時請一律使用「你」，絕對不要稱呼對方為「媽媽」、「爸爸」、「阿公」、「阿嬤」，也不要預設對方的性別或家庭身分。
2. 對方可能會講「台語」、「台灣國語」或夾雜台語詞彙。收到語音時請直接理解意思，絕不抱怨聽不懂或糾正發音。
3. 回覆使用親切自然的「台灣繁體中文口語」，可自然帶入「真厲害」、「水喔」、「免緊張」、「慢慢來」等溫暖詞彙。
4. 每次回覆控制在 35 個中文字以內，不使用表情符號或列表符號（系統會直接用語音唸出來）。
${gameContext ? `\n【目前遊戲情境】：${gameContext}` : ''}
    `.trim();

    const userParts = [];
    if (audioBase64 && mimeType) {
      let cleanMimeType = mimeType.split(';')[0].trim();
      if (cleanMimeType === 'audio/mp4') cleanMimeType = 'video/mp4';
      userParts.push({ inlineData: { mimeType: cleanMimeType, data: audioBase64 } });
      userParts.push({
        text: text || '請聽這段語音（可能是台語或國語），用親切簡短的台灣口語回應對方，並統一用「你」稱呼對方。'
      });
    } else if (text) {
      userParts.push({ text });
    } else {
      return res.status(400).json({ error: '缺少對話內容' });
    }

    const contents = [...history.slice(-4), { role: 'user', parts: userParts }];
    const payload = JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
    });

    const candidateModels = await getCandidateModels(apiKey);
    const attemptLogs = [];

    for (const modelName of candidateModels) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            body: payload,
            signal: controller.signal
          }
        );
        clearTimeout(timeoutId);

        const data = await response.json();
        if (response.ok) {
          const parts = data?.candidates?.[0]?.content?.parts || [];
          const textPart = parts.find((p) => !p.thought && p.text);
          const reply = textPart?.text?.trim();
          if (reply) {
            return res.status(200).json({ reply, modelUsed: modelName });
          }
        }
        attemptLogs.push(`${modelName}(${response.status})`);
      } catch (e) {
        clearTimeout(timeoutId);
        attemptLogs.push(`${modelName}(超時)`);
      }
    }

    return res.status(200).json({
      reply: `（備用模型目前皆忙線：${attemptLogs.join('、')}）`
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || '連線發生異常' });
  }
};
