(() => {
  if (!document.getElementById('sound-order-style')) {
    const st = document.createElement('style');
    st.id = 'sound-order-style';
    st.textContent = `
      .so-slots{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;width:100%}
      .so-slot{min-width:150px;padding:12px 18px;border-radius:18px;border:3px dashed #94A3B8;background:#F8FAFC;font-size:24px;font-weight:800;color:#64748B;text-align:center}
      .so-slot.filled{border-style:solid;border-color:#16A34A;background:#DCFCE7;color:#15803D}
      .so-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;width:100%;max-width:700px}
      .so-card{min-height:165px;border-radius:26px;border:4px solid #93C5FD;background:#FFF;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:transform .12s,background .2s,border-color .2s;padding:14px}
      .so-card:active{transform:scale(.96)}
      .so-card.done{background:#DCFCE7;border-color:#16A34A}
      .so-card.wrong{background:#FEF2F2;border-color:#EF4444}
      .so-banner{font-size:28px;font-weight:900;color:#1E3A8A;background:#FEF3C7;border:3px solid #F59E0B;padding:14px 26px;border-radius:20px;text-align:center}
    `;
    document.head.appendChild(st);
  }

  const SOUNDS = [
    { id: 'bell', ico: '🔔', name: '門鈴叮咚', play: () => { GameHub.playTone(659.25, 0.28, 'sine', 0.28); setTimeout(() => GameHub.playTone(523.25, 0.45, 'sine', 0.28), 320); } },
    { id: 'phone', ico: '☎️', name: '電話鈴聲', play: () => { [0, 140, 280, 420].forEach((t, i) => setTimeout(() => GameHub.playTone(i % 2 ? 1050 : 880, 0.11, 'triangle', 0.2), t)); } },
    { id: 'horn', ico: '🎺', name: '車子喇叭', play: () => { GameHub.playTone(220, 0.22, 'sawtooth', 0.12); setTimeout(() => GameHub.playTone(220, 0.3, 'sawtooth', 0.12), 300); } },
    { id: 'piano', ico: '🎹', name: '鋼琴旋律', play: () => { [523, 587, 659, 784].forEach((f, i) => setTimeout(() => GameHub.playTone(f, 0.18, 'sine', 0.26), i * 165)); } }
  ];

  const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
  const heartsHTML = (n) => '❤️'.repeat(Math.max(0, n)) + '🤍'.repeat(Math.max(0, 3 - n));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function sayThen(text, onDone) {
    GameHub.setAIMessage(text, true);
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
    const count = level === 1 ? 2 : level === 2 ? 3 : 4;
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

    function renderCards(wrongId = null) {
      grid.innerHTML = '';
      SOUNDS.forEach((s) => {
        const order = picked.get(s.id);
        const btn = document.createElement('button');
        btn.className = `so-card ${order ? 'done' : wrongId === s.id ? 'wrong' : ''}`;
        btn.innerHTML = `<div class="vg-emoji">${s.ico}</div><div class="vg-label">${s.name}${order ? `（第 ${order}）` : ''}</div>`;
        btn.onclick = () => onCardClick(s);
        grid.appendChild(btn);
      });
    }

    async function playQuizAudio() {
      mode = 'listening';
      bar.style.display = 'none';
      replayBtn.style.display = 'none';
      slotsEl.style.display = 'flex';
      renderSlots();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      banner.textContent = '👂 請仔細聽，聲音要開始播放囉...';
      await wait(600);
      for (let i = 0; i < seq.length; i++) {
        if (!wrap.isConnected) return;
        banner.textContent = `🔊 正在播放：第 ${i + 1} / ${count} 個聲音...`;
        seq[i].play();
        await wait(1550);
      }
      if (!wrap.isConnected) return;
      mode = 'answer';
      replayBtn.style.display = 'inline-block';
      banner.textContent = `👉 請點選出「第 ${step + 1} 個」聽到的聲音！`;
      GameHub.setAIMessage(`播完囉！請問第 ${step + 1} 個聽到的是哪一種聲音呢？`, true);
    }

    function onCardClick(s) {
      if (mode === 'preview') {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        s.play();
        banner.textContent = `🔊 這是「${s.name}」的聲音！`;
        return;
      }
      if (mode !== 'answer' || picked.has(s.id)) return;

      if (s.id === seq[step].id) {
        s.play();
        step++;
        picked.set(s.id, step);
        renderSlots();
        renderCards();
        if (step === count) {
          mode = 'locked';
          const p = GameHub.randomPraise();
          GameHub.onRoundComplete(1);
          sayThen(`${p} ${count} 個聲音的順序全部排對了！`, () => {
            if (!wrap.isConnected) return;
            stage.innerHTML = `<div class="vg-win-box"><div class="vg-win-emoji">🔔🌟🔔</div><h3 class="vg-win-title">第 ${level} 關過關！聽力超棒！</h3><p style="font-size:28px;color:#475569;margin:0 0 28px 0;">${p}</p><div><button class="btn-big green" id="so-next">👉 玩下一關</button><button class="btn-big" style="background:#475569;" onclick="GameHub.goHome()">🏠 回首頁</button></div></div>`;
            document.getElementById('so-next').onclick = () => playSoundOrder(stage, level + 1, lives);
          });
        } else {
          banner.textContent = `✅ 答對了！請點選出「第 ${step + 1} 個」聲音！`;
          setTimeout(() => { if (wrap.isConnected) GameHub.setAIMessage(`答對了！第 ${step} 個是「${s.name}」，那第 ${step + 1} 個是哪個呢？`, true); }, 500);
        }
      } else {
        mode = 'locked';
        lives--;
        heartsEl.textContent = heartsHTML(lives);
        renderCards(s.id);
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
    GameHub.setAIMessage(`第 ${level} 關！你可以先點下面的卡片試聽這四種聲音，聽熟了再按綠色按鈕開始考你喔！`, true);
  }

  GameHub.registerGame('sound-order', { start: (s) => playSoundOrder(s, 1, 3) });
})();
