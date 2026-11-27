(() => {
  const old = document.getElementById('sound-order-style');
  if (old) old.remove();
  const st = document.createElement('style');
  st.id = 'sound-order-style';
  st.textContent = `
    .so-slots{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;width:100%}
    .so-slot{min-width:140px;padding:10px 16px;border-radius:16px;border:3px dashed #94A3B8;background:#F8FAFC;font-size:22px;font-weight:800;color:#64748B;text-align:center}
    .so-slot.filled{border-style:solid;border-color:#16A34A;background:#DCFCE7;color:#15803D}
    .so-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;width:100%;max-width:700px}
    .so-card{min-height:145px;border-radius:24px;border:4px solid #93C5FD;background:#FFF;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:transform .12s,background .2s,border-color .2s;padding:12px}
    .so-card:last-child:nth-child(odd){grid-column:1 / -1;max-width:340px;width:100%;justify-self:center}
    .so-card:active{transform:scale(.96)}
    .so-card.playing{background:#FEF3C7;border-color:#F59E0B;transform:scale(1.03)}
    .so-card.done{background:#DCFCE7;border-color:#16A34A}
    .so-card.wrong{background:#FEF2F2;border-color:#EF4444}
    .so-banner{font-size:26px;font-weight:900;color:#1E3A8A;background:#FEF3C7;border:3px solid #F59E0B;padding:12px 24px;border-radius:20px;text-align:center}
  `;
  document.head.appendChild(st);

  const SR = 16000;
  const player = new Audio();
  player.playsInline = true;
  let quizUrl = null;
  let activeTimers = [];

  function gen(sec, fn) {
    const a = new Float32Array(Math.floor(SR * sec));
    for (let i = 0; i < a.length; i++) a[i] = fn(i / SR);
    return a;
  }

  function encodeWav(samples) {
    const len = samples.length, buf = new ArrayBuffer(44 + len * 2), v = new DataView(buf);
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); v.setUint32(4, 36 + len * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true);
    v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, len * 2, true);
    for (let i = 0; i < len; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      v.setInt16(44 + i * 2, s < 0 ? s * 32768 : s * 32767, true);
    }
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }

  const SOUNDS = [
    { id: 'bell', ico: '🔔', name: '門鈴叮咚', pcm: gen(1.0, (t) => t < 0.38
      ? (Math.sin(2 * Math.PI * 659.25 * t) * Math.exp(-t * 4.5) * 0.75 + Math.sin(2 * Math.PI * 1318.5 * t) * Math.exp(-t * 8) * 0.2)
      : (Math.sin(2 * Math.PI * 523.25 * (t - 0.38)) * Math.exp(-(t - 0.38) * 4) * 0.8 + Math.sin(2 * Math.PI * 1046.5 * (t - 0.38)) * Math.exp(-(t - 0.38) * 7) * 0.2)) },
    { id: 'phone', ico: '☎️', name: '電話鈴聲', pcm: gen(0.95, (t) => (t < 0.38 || (t > 0.5 && t < 0.88))
      ? Math.sin(2 * Math.PI * (Math.floor(t * 20) % 2 ? 1120 : 860) * t) * 0.65 : 0) },
    { id: 'horn', ico: '🎺', name: '車子喇叭', pcm: gen(0.88, (t) => (t < 0.22 || (t > 0.32 && t < 0.82))
      ? Math.tanh((Math.sin(2 * Math.PI * 311 * t) + Math.sin(2 * Math.PI * 392 * t)) * 1.5) * 0.6 : 0) },
    { id: 'piano', ico: '🎹', name: '鋼琴旋律', pcm: gen(1.05, (t) => {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      let sum = 0;
      notes.forEach((f, idx) => { const u = t - idx * 0.2; if (u >= 0) sum += (Math.sin(2 * Math.PI * f * u) + 0.3 * Math.sin(4 * Math.PI * f * u)) * Math.exp(-u * 5.5) * 0.55; });
      return sum;
    }) },
    { id: 'bird', ico: '🐦', name: '小鳥叫聲', pcm: gen(0.9, (t) => {
      const chirp = (u) => u >= 0 && u < 0.18 ? Math.sin(2 * Math.PI * (1800 + u * 5500) * u) * Math.sin(Math.PI * u / 0.18) * 0.65 : 0;
      return chirp(t) + chirp(t - 0.28) + chirp(t - 0.56);
    }) }
  ].map((s) => ({ ...s, url: encodeWav(s.pcm) }));

  function clearPlayTimers() {
    activeTimers.forEach(clearTimeout);
    activeTimers = [];
    player.onended = null;
    player.pause();
  }

  function safeSpeak(text) {
    player.pause();
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }
    GameHub.setAIMessage(text, true);
  }

  function playSingle(url) {
    clearPlayTimers();
    player.src = url;
    player.currentTime = 0;
    player.play().catch(() => {});
  }

  const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
  const heartsHTML = (n) => '❤️'.repeat(Math.max(0, n)) + '🤍'.repeat(Math.max(0, 3 - n));

  function sayThen(text, onDone) {
    safeSpeak(text);
    let done = false, started = false;
    const t0 = Date.now(), minMs = Math.max(2400, text.length * 210), maxMs = Math.max(5500, text.length * 440);
    const finish = () => { if (done) return; done = true; clearInterval(iv); clearTimeout(tm); onDone(); };
    const tm = setTimeout(finish, maxMs);
    const iv = setInterval(() => {
      const ms = Date.now() - t0;
      const sp = 'speechSynthesis' in window && (window.speechSynthesis.speaking || window.speechSynthesis.pending);
      if (sp) started = true;
      else if (started && ms > 600) { clearInterval(iv); clearTimeout(tm); setTimeout(finish, 450); }
      else if (!started && ms >= minMs) finish();
    }, 150);
  }

  function playSoundOrder(stage, level, lives) {
    clearPlayTimers();
    const count = Math.min(level + 1, 5);
    const seq = shuffle(SOUNDS).slice(0, count);
    const picked = new Map();
    let step = 0, mode = 'preview';

    const wrap = document.createElement('div');
    wrap.className = 'vg-wrap';
    wrap.innerHTML = `
      <div class="vg-header">
        <span class="vg-badge">第 ${level} 關｜記住 ${count} 種聲音順序</span>
        <span class="vg-hearts" id="so-hearts">${heartsHTML(lives)}</span>
        <button class="vg-sub-btn" id="so-replay" style="display:none;">🔊 再聽一次</button>
      </div>
      <div class="so-banner" id="so-banner">🎧 先點點看下面的卡片試聽聲音，熟了再開始！</div>
      <div class="so-slots" id="so-slots" style="display:none;"></div>
      <div class="so-grid" id="so-grid"></div>
      <div class="vg-action-bar" id="so-bar">
        <button class="btn-big green" id="so-start">▶️ 聽熟了，開始出題！</button>
      </div>`;
    stage.innerHTML = '';
    stage.appendChild(wrap);

    const banner = wrap.querySelector('#so-banner');
    const slotsEl = wrap.querySelector('#so-slots');
    const grid = wrap.querySelector('#so-grid');
    const heartsEl = wrap.querySelector('#so-hearts');
    const replayBtn = wrap.querySelector('#so-replay');
    const bar = wrap.querySelector('#so-bar');

    function renderSlots() {
      slotsEl.innerHTML = seq.map((s, idx) =>
        idx < step
          ? `<div class="so-slot filled">第 ${idx + 1} 個：${s.ico} ${s.name}</div>`
          : `<div class="so-slot">第 ${idx + 1} 個：❓</div>`
      ).join('');
    }

    function renderCards(stateId = null, stateCls = '') {
      grid.innerHTML = '';
      SOUNDS.forEach((s) => {
        const order = picked.get(s.id);
        const btn = document.createElement('button');
        btn.className = `so-card ${order ? 'done' : stateId === s.id ? stateCls : ''}`;
        btn.innerHTML = `<div class="vg-emoji">${s.ico}</div><div class="vg-label">${s.name}${order ? `（第 ${order}）` : ''}</div>`;
        btn.onclick = () => onCardClick(s);
        grid.appendChild(btn);
      });
    }

    function playQuizAudio() {
      clearPlayTimers();
      mode = 'listening';
      bar.style.display = 'none';
      replayBtn.style.display = 'none';
      slotsEl.style.display = 'flex';
      renderSlots();
      renderCards();

      const lead = Math.floor(SR * 0.25), gap = Math.floor(SR * 0.65);
      let total = lead;
      const marks = [];
      seq.forEach((s) => { marks.push(total / SR); total += s.pcm.length + gap; });
      const mix = new Float32Array(total);
      let pos = lead;
      seq.forEach((s) => { mix.set(s.pcm, pos); pos += s.pcm.length + gap; });

      if (quizUrl) URL.revokeObjectURL(quizUrl);
      quizUrl = encodeWav(mix);
      banner.textContent = '👂 請仔細聽，聲音要開始播放囉...';

      let finished = false;
      const doneQuiz = () => {
        if (finished || !wrap.isConnected) return;
        finished = true;
        clearPlayTimers();
        mode = 'answer';
        replayBtn.style.display = 'inline-block';
        banner.textContent = `👉 請點選出「第 ${step + 1} 個」聽到的聲音！`;
        safeSpeak(`播完囉！請問第 ${step + 1} 個聽到的是哪一種聲音呢？`);
      };

      marks.forEach((sec, idx) => {
        activeTimers.push(setTimeout(() => {
          if (wrap.isConnected) banner.textContent = `🔊 正在播放：第 ${idx + 1} / ${count} 個聲音...`;
        }, Math.floor(sec * 1000)));
      });
      activeTimers.push(setTimeout(doneQuiz, Math.ceil((total / SR) * 1000) + 400));

      player.onended = doneQuiz;
      player.src = quizUrl;
      player.currentTime = 0;
      player.play().catch(() => {});
    }

    function onCardClick(s) {
      if (mode === 'preview') {
        playSingle(s.url);
        renderCards(s.id, 'playing');
        banner.textContent = `🔊 這是「${s.name}」的聲音！`;
        activeTimers.push(setTimeout(() => { if (wrap.isConnected && mode === 'preview') renderCards(); }, 950));
        return;
      }
      if (mode !== 'answer' || picked.has(s.id)) return;

      if (s.id === seq[step].id) {
        playSingle(s.url);
        step++;
        picked.set(s.id, step);
        renderSlots();
        renderCards();
        if (step === count) {
          mode = 'locked';
          const p = GameHub.randomPraise();
          activeTimers.push(setTimeout(() => {
            if (!wrap.isConnected) return;
            GameHub.onRoundComplete(1);
            sayThen(`${p} ${count} 個聲音的順序全部排對了！`, () => {
              if (!wrap.isConnected) return;
              stage.innerHTML = `<div class="vg-win-box"><div class="vg-win-emoji">🔔🌟🔔</div><h3 class="vg-win-title">第 ${level} 關過關！聽力超棒！</h3><p style="font-size:28px;color:#475569;margin:0 0 28px 0;">${p}</p><div><button class="btn-big green" id="so-next">👉 玩下一關</button><button class="btn-big" style="background:#475569;" onclick="GameHub.goHome()">🏠 回首頁</button></div></div>`;
              document.getElementById('so-next').onclick = () => playSoundOrder(stage, level + 1, lives);
            });
          }, 1000));
        } else {
          banner.textContent = `✅ 答對了！請點選出「第 ${step + 1} 個」聲音！`;
          activeTimers.push(setTimeout(() => {
            if (wrap.isConnected) safeSpeak(`答對了！第 ${step} 個是「${s.name}」，那第 ${step + 1} 個是哪個呢？`);
          }, 1050));
        }
      } else {
        mode = 'locked';
        lives--;
        heartsEl.textContent = heartsHTML(lives);
        renderCards(s.id, 'wrong');
        GameHub.playGentleTryAgain();
        const msg = lives <= 0
          ? `第 ${step + 1} 個不是「${s.name}」喔！三顆愛心都用完了，我們從第一關再挑戰一次吧！`
          : `第 ${step + 1} 個不是「${s.name}」喔！還剩 ${lives} 顆愛心，可以按「再聽一次」仔細聽聽看！`;
        sayThen(msg, () => {
          if (!wrap.isConnected) return;
          if (lives <= 0) {
            stage.innerHTML = `<div class="vg-win-box"><div class="vg-win-emoji">💪❤️</div><h3 class="vg-win-title" style="color:#DC2626;">愛心用完囉！遊戲結束</h3><p style="font-size:28px;color:#475569;margin:0 0 28px 0;">沒關係，多聽幾次一定會全對！</p><div><button class="btn-big green" id="so-retry">🔄 從第 1 關重新開始</button><button class="btn-big" style="background:#475569;" onclick="GameHub.goHome()">🏠 回首頁</button></div></div>`;
            document.getElementById('so-retry').onclick = () => playSoundOrder(stage, 1, 3);
          } else {
            renderCards();
            mode = 'answer';
          }
        });
      }
    }

    renderCards();
    wrap.querySelector('#so-start').onclick = playQuizAudio;
    replayBtn.onclick = () => { if (mode === 'answer') playQuizAudio(); };
    safeSpeak(`第 ${level} 關！你可以先點下面的卡片試聽這五種聲音，聽熟了再按綠色按鈕開始考你喔！`);
  }

  GameHub.registerGame('sound-order', { start: (s) => playSoundOrder(s, 1, 3) });
})();
