window.GameHub = (() => {
  const GAME_CATALOG = [
    { id: 'memory-match', title: '翻牌配對', emoji: '🍎', desc: '找出兩張一樣的圖案' },
    { id: 'whats-missing', title: '少了哪一樣', emoji: '🔍', desc: '看看哪個東西不見了' },
    { id: 'grocery-shop', title: '幫 AI 買菜', emoji: '🧺', desc: '記住菜單去攤位買齊' },
    { id: 'make-ten', title: '簡易撿紅點', emoji: '🃏', desc: '兩張牌加起來等於 10' },
    { id: 'simon-says', title: '依序點燈', emoji: '💡', desc: '跟著亮燈順序點點看' },
    { id: 'sound-order', title: '聽聲音排順序', emoji: '🔔', desc: '聽聽看先聽到哪個聲音' },
    { id: 'word-assoc', title: '主題詞彙聯想', emoji: '🗣️', desc: '說出相關的生活詞彙' },
    { id: 'guess-who', title: 'AI 猜猜我是誰', emoji: '🎭', desc: '問問題猜猜看是什麼' },
    { id: 'spot-detail', title: '看圖找細節', emoji: '🖼️', desc: '看圖後回答趣味小問題' }
  ];

  const PRAISE_PHRASES = [
    '哇，真厲害！一下就答對了！',
    '水喔！記性真的很好耶！',
    '太棒了，完全難不倒你！',
    '好聰明喔，繼續保持這個節奏！',
    '答對了！給你拍拍手！'
  ];

  const registeredGames = {};
  let stars = parseInt(localStorage.getItem('mom_stars') || '0', 10);
  let lastSpokenText = '';
  let currentGameContext = '';
  let chatHistory = [];
  let currentGameId = null;

  // 麥克風待機與錄音控制
  let micStream = null;
  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;
  let isStartingMic = false;
  let isWaitingAI = false;
  let audioCtx = null;

  function unlockAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
  }

  function playTone(freq = 523.25, duration = 0.25, type = 'sine', volume = 0.25) {
    unlockAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function playSuccess() {
    playTone(523.25, 0.15);
    setTimeout(() => playTone(659.25, 0.15), 130);
    setTimeout(() => playTone(783.99, 0.3), 260);
  }

  function playGentleTryAgain() {
    playTone(349.23, 0.2, 'triangle');
    setTimeout(() => playTone(329.63, 0.25, 'triangle'), 180);
  }

  function speak(text) {
    if (!text) return;
    lastSpokenText = text;
    if (!('speechSynthesis' in window)) return;

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-TW';
      utterance.rate = 0.88;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const twVoice =
        voices.find((v) => v.lang === 'zh-TW' && v.name.includes('Meijia')) ||
        voices.find((v) => v.lang.includes('zh-TW')) ||
        voices.find((v) => v.lang.includes('zh'));
      if (twVoice) utterance.voice = twVoice;

      window.speechSynthesis.speak(utterance);
    }, 60);
  }

  function setAIMessage(text, autoSpeak = true) {
    const el = document.getElementById('ai-message-text');
    if (el) el.textContent = text;
    if (autoSpeak) speak(text);
  }

  function randomPraise() {
    return PRAISE_PHRASES[Math.floor(Math.random() * PRAISE_PHRASES.length)];
  }

  function addStar(count = 1) {
    stars += count;
    localStorage.setItem('mom_stars', String(stars));
    document.getElementById('star-count').textContent = stars;
    document.getElementById('game-star-count').textContent = stars;
  }

  async function onRoundComplete(starsEarned = 1) {
    addStar(starsEarned);
    playSuccess();
  }

  function showToast(msg, duration = 3500) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.add('hidden'), duration);
  }

  function resetMicButton() {
    const micBtn = document.getElementById('btn-mic');
    if (!micBtn) return;
    micBtn.classList.remove('recording');
    micBtn.disabled = false;
    micBtn.textContent = '🎤 點一下說話';
  }

  async function getMicStream() {
    if (
      micStream &&
      micStream.active &&
      micStream.getAudioTracks().some((t) => t.readyState === 'live')
    ) {
      return micStream;
    }
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return micStream;
  }

  function releaseMicStream() {
    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
      micStream = null;
    }
  }

  async function askAI({ text = '', audioBase64 = null, mimeType = null, gameContext = '' } = {}) {
    if (isWaitingAI) return null;
    isWaitingAI = true;
    const micBtn = document.getElementById('btn-mic');
    if (micBtn) {
      micBtn.disabled = true;
      micBtn.textContent = '⏳ AI 思考中...';
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          audioBase64,
          mimeType,
          gameContext: gameContext || currentGameContext,
          history: chatHistory
        })
      });

      const rawText = await res.text();
      let data = {};
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        throw new Error('伺服器回應格式異常 (' + res.status + ')');
      }

      if (!res.ok) {
        throw new Error(data.error || '連線錯誤 (' + res.status + ')');
      }

      if (text) chatHistory.push({ role: 'user', parts: [{ text }] });
      chatHistory.push({ role: 'model', parts: [{ text: data.reply }] });

      setAIMessage(data.reply, true);
      return data.reply;
    } catch (err) {
      const reason = err.message || '未知錯誤';
      showToast('連線失敗：' + reason, 4500);
      setAIMessage('（系統提示：' + reason + '）', false);
      return null;
    } finally {
      isWaitingAI = false;
      resetMicButton();
    }
  }

  async function toggleRecording() {
    unlockAudio();
    if (isWaitingAI || isStartingMic) return;
    const micBtn = document.getElementById('btn-mic');

    if (!isRecording) {
      // 立刻中斷正在播放的語音並給予視覺回饋
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      isStartingMic = true;
      micBtn.classList.add('recording');
      micBtn.textContent = '🎙️ 準備收音...';

      try {
        const stream = await getMicStream();
        const preferredTypes = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm'];
        const supportedType = preferredTypes.find((t) => MediaRecorder.isTypeSupported(t)) || '';

        mediaRecorder = supportedType
          ? new MediaRecorder(stream, { mimeType: supportedType })
          : new MediaRecorder(stream);

        audioChunks = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const actualMime = mediaRecorder.mimeType || 'audio/mp4';
          const blob = new Blob(audioChunks, { type: actualMime });

          if (blob.size < 1000) {
            showToast('聲音太短了，請再說一次喔！');
            resetMicButton();
            return;
          }

          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result.split(',')[1];
            const reply = await askAI({ audioBase64: base64, mimeType: actualMime });
            const activeGame = registeredGames[currentGameId];
            if (activeGame && typeof activeGame.onVoiceReply === 'function' && reply) {
              activeGame.onVoiceReply(reply);
            }
          };
          reader.readAsDataURL(blob);
        };

        mediaRecorder.start();
        isRecording = true;
        isStartingMic = false;
        micBtn.textContent = '⏹️ 講完了點我送出';
        playTone(880, 0.08, 'sine', 0.15); // 輕脆提示音：可以開始說話
      } catch (err) {
        isStartingMic = false;
        isRecording = false;
        releaseMicStream();
        resetMicButton();
        showToast('請允許 iPad 使用麥克風才能說話喔！');
      }
    } else {
      isRecording = false;
      micBtn.classList.remove('recording');
      micBtn.disabled = true;
      micBtn.textContent = '⏳ 傳送語音中...';
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      } else {
        resetMicButton();
      }
    }
  }

  function renderHomeGrid() {
    const grid = document.getElementById('game-grid');
    grid.innerHTML = '';
    GAME_CATALOG.forEach((g) => {
      const isReady = Boolean(registeredGames[g.id]);
      const card = document.createElement('button');
      card.className = `game-card ${isReady ? 'ready' : ''}`;
      card.innerHTML = `
        ${isReady ? '' : '<span class="badge-soon">準備中</span>'}
        <div class="card-emoji">${g.emoji}</div>
        <h3 class="card-title">${g.title}</h3>
        <p class="card-desc">${g.desc}</p>
      `;
      card.onclick = () => openGame(g.id);
      grid.appendChild(card);
    });
  }

  function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
  }

  function openGame(gameId) {
    unlockAudio();
    const meta = GAME_CATALOG.find((g) => g.id === gameId);
    const mod = registeredGames[gameId];
    if (!mod) {
      showToast(`「${meta.title}」正在蓋房子中，下一步就完成囉！`);
      return;
    }

    currentGameId = gameId;
    chatHistory = [];
    currentGameContext = `正在玩「${meta.title}」：${meta.desc}，稱呼對方時一律使用「你」。`;
    document.getElementById('current-game-title').textContent = `${meta.emoji} ${meta.title}`;
    switchScreen('game-screen');

    const stage = document.getElementById('game-stage');
    stage.innerHTML = '';
    mod.start(stage);
  }

  function openFreeChat() {
    unlockAudio();
    currentGameId = 'free-chat';
    chatHistory = [];
    currentGameContext = '自由閒聊時間，陪使用者話家常、關心今天過得好不好，一律稱呼對方為「你」。';
    document.getElementById('current-game-title').textContent = '💬 找 AI 聊天';
    switchScreen('game-screen');

    const stage = document.getElementById('game-stage');
    stage.innerHTML = `
      <div style="text-align:center; max-width:650px;">
        <div style="font-size:80px; margin-bottom:16px;">🍵</div>
        <p style="font-size:28px; font-weight:700; line-height:1.5; margin-bottom:24px;">
          點上方藍色的「🎤 點一下說話」，<br/>用台語或國語跟我聊聊天吧！
        </p>
        <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:12px;">
          <button class="btn-big green" onclick="GameHub.askAI({text:'我今天心情不錯，想跟你聊聊天'})">😊 今天心情不錯</button>
          <button class="btn-big amber" onclick="GameHub.askAI({text:'請講一個輕鬆溫暖的小故事給我聽'})">📖 講個小故事給我聽</button>
        </div>
      </div>
    `;
    setAIMessage('今天過得好嗎？想聊什麼都可以用講的喔！', true);
  }

  function goHome() {
    if (isRecording && mediaRecorder) {
      isRecording = false;
      mediaRecorder.onstop = null;
      if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    }
    isStartingMic = false;
    releaseMicStream();
    resetMicButton();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    currentGameId = null;
    renderHomeGrid();
    switchScreen('home-screen');
  }

  function updateGreeting() {
    const hr = new Date().getHours();
    let msg = '早安！今天一起動動腦 🌻';
    if (hr >= 12 && hr < 18) msg = '午安！來玩個小遊戲吧 🍵';
    else if (hr >= 18) msg = '晚安！輕鬆動動腦吧 🌙';
    document.getElementById('greeting-text').textContent = msg;
    lastSpokenText = msg;
  }

  function registerGame(id, moduleObj) {
    registeredGames[id] = moduleObj;
    renderHomeGrid();
  }

  window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('star-count').textContent = stars;
    document.getElementById('game-star-count').textContent = stars;
    updateGreeting();
    renderHomeGrid();
    document.body.addEventListener('touchstart', unlockAudio, { once: true });
  });

  return {
    registerGame,
    speak,
    speakGreeting: () => {
      unlockAudio();
      speak(document.getElementById('greeting-text').textContent);
    },
    replayLastSpeech: () => {
      unlockAudio();
      speak(lastSpokenText);
    },
    setAIMessage,
    askAI,
    toggleRecording,
    playTone,
    playSuccess,
    playGentleTryAgain,
    randomPraise,
    addStar,
    onRoundComplete,
    showToast,
    openFreeChat,
    goHome
  };
})();
