(() => {
  const old = document.getElementById('simon-style');
  if (old) old.remove();
  const st = document.createElement('style');
  st.id = 'simon-style';
  st.textContent = `
    .sm-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;width:100%;max-width:680px}
    .sm-pad{position:relative;min-height:175px;border-radius:28px;border:5px solid rgba(255,255,255,.4);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:transform .12s,filter .12s,opacity .12s,box-shadow .12s;opacity:.72;filter:brightness(.88)}
    .sm-grid.has-lit .sm-pad:not(.lit){opacity:.2;filter:grayscale(75%) brightness(.55);transform:scale(.94)}
    .sm-pad:active{transform:scale(.96)}
    .sm-pad.lit{opacity:1;z-index:2;transform:scale(1.07);filter:brightness(1.3) saturate(1.25);border:6px solid #FFF;box-shadow:0 0 0 6px #1E293B,0 0 38px 10px rgba(250,204,21,.95)}
    .sm-pad.lit::after{content:'💡 亮燈';position:absolute;top:12px;right:14px;background:#FFF;color:#B45309;font-size:22px;font-weight:900;padding:4px 12px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.3)}
    .sm-pad.wrong{opacity:1;border:6px solid #7F1D1D;animation:smShake .35s}
    .sm-pad .sm-ico{font-size:64px;line-height:1.1;transition:transform .12s}
    .sm-pad.lit .sm-ico{transform:scale(1.25)}
    .sm-pad .sm-txt{font-size:30px;font-weight:900;color:#FFF;margin-top:8px;text-shadow:0 2px 4px rgba(0,0,0,.35)}
    .sm-status{font-size:28px;font-weight:800;color:#1E3A8A;background:#EFF6FF;padding:12px 24px;border-radius:18px;text-align:center}
    @keyframes smShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-10px)}75%{transform:translateX(10px)}}
  `;
  document.head.appendChild(st);

  const PADS = [
    { id: 0, name: '紅燈', ico: '🔴', bg: '#EF4444', freq: 261.63 },
    { id: 1, name: '黃燈', ico: '🟡', bg: '#F59E0B', freq: 329.63 },
    { id: 2, name: '綠燈', ico: '🟢', bg: '#22C55E', freq: 392.00 },
    { id: 3, name: '藍燈', ico: '🔵', bg: '#3B82F6', freq: 523.25 }
  ];
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

  function playSimon(stage, level, lives) {
    const seqLen = Math.min(level + 1, 7);
    const seq = Array.from({ length: seqLen }, () => Math.floor(Math.random() * 4));
    let step = 0, mode = 'ready';

    const wrap = document.createElement('div');
    wrap.className = 'vg-wrap';
    wrap.innerHTML = `
      <div class="vg-header">
        <span class="vg-badge">第 ${level} 關｜記住 ${seqLen} 個亮燈</span>
        <span class="vg-hearts" id="sm-hearts">${heartsHTML(lives)}</span>
        <button class="vg-sub-btn" id="sm-replay" style="display:none;">🔄 再看一次</button>
      </div>
      <div class="sm-status" id="sm-status">準備好就按下面綠色按鈕看亮燈喔！</div>
      <div class="sm-grid" id="sm-grid"></div>
      <div class="vg-action-bar" id="sm-bar">
        <button class="btn-big green" id="sm-start">▶️ 準備好了，開始看亮燈！</button>
      </div>`;
    stage.innerHTML = '';
    stage.appendChild(wrap);

    const grid = wrap.querySelector('#sm-grid');
    const statusEl = wrap.querySelector('#sm-status');
    const heartsEl = wrap.querySelector('#sm-hearts');
    const replayBtn = wrap.querySelector('#sm-replay');
    const bar = wrap.querySelector('#sm-bar');

    const padEls = PADS.map((p) => {
      const btn = document.createElement('button');
      btn.className = 'sm-pad';
      btn.style.background = p.bg;
      btn.innerHTML = `<div class="sm-ico">${p.ico}</div><div class="sm-txt">${p.name}</div>`;
      btn.onclick = () => onPadClick(p.id);
      grid.appendChild(btn);
      return btn;
    });

    async function flashPad(id, ms = 550) {
      grid.classList.add('has-lit');
      padEls[id].classList.add('lit');
      GameHub.playTone(PADS[id].freq, ms / 1000, 'sine', 0.28);
      await wait(ms);
      padEls[id].classList.remove('lit');
      if (!grid.querySelector('.lit')) grid.classList.remove('has-lit');
    }

    async function showDemo() {
      mode = 'demo';
      step = 0;
      bar.style.display = 'none';
      replayBtn.style.display = 'none';
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      statusEl.textContent = '👀 請專心看亮燈順序喔...';
      await wait(500);
      for (let i = 0; i < seq.length; i++) {
        if (!wrap.isConnected) return;
        statusEl.textContent = `👀 示範中：第 ${i + 1} / ${seqLen} 個亮燈`;
        await flashPad(seq[i], 700);
        await wait(340);
      }
      if (!wrap.isConnected) return;
      mode = 'play';
      replayBtn.style.display = 'inline-block';
      statusEl.textContent = `👉 換你點點看！（進度：0 / ${seqLen}）`;
      GameHub.setAIMessage('換你囉！照剛剛亮燈的順序點點看！', true);
    }

    async function onPadClick(id) {
      if (mode !== 'play') return;
      if (id === seq[step]) {
        flashPad(id, 300);
        step++;
        statusEl.textContent = `👉 做得很好！（進度：${step} / ${seqLen}）`;
        if (step === seqLen) {
          mode = 'locked';
          const p = GameHub.randomPraise();
          GameHub.onRoundComplete(1);
          sayThen(`${p} ${seqLen} 個亮燈順序完全記住了！`, () => {
            if (!wrap.isConnected) return;
            stage.innerHTML = `<div class="vg-win-box"><div class="vg-win-emoji">💡🌟💡</div><h3 class="vg-win-title">第 ${level} 關過關！</h3><p style="font-size:28px;color:#475569;margin:0 0 28px 0;">${p}</p><div><button class="btn-big green" id="sm-next">👉 玩下一關</button><button class="btn-big" style="background:#475569;" onclick="GameHub.goHome()">🏠 回首頁</button></div></div>`;
            document.getElementById('sm-next').onclick = () => playSimon(stage, level + 1, lives);
          });
        }
      } else {
        mode = 'locked';
        lives--;
        heartsEl.textContent = heartsHTML(lives);
        padEls[id].classList.add('wrong');
        GameHub.playGentleTryAgain();
        const rightName = PADS[seq[step]].name;
        const msg = lives <= 0
          ? `哎呀，剛才應該要點「${rightName}」喔！三顆愛心都用完了，我們從第一關再挑戰一次吧！`
          : `差一點點，這個順序應該是「${rightName}」喔！還剩 ${lives} 顆愛心，我再亮一次給你看！`;
        sayThen(msg, () => {
          if (!wrap.isConnected) return;
          padEls[id].classList.remove('wrong');
          if (lives <= 0) {
            stage.innerHTML = `<div class="vg-win-box"><div class="vg-win-emoji">💪❤️</div><h3 class="vg-win-title" style="color:#DC2626;">愛心用完囉！遊戲結束</h3><p style="font-size:28px;color:#475569;margin:0 0 28px 0;">沒關係，多練幾次會越來越順手！</p><div><button class="btn-big green" id="sm-retry">🔄 從第 1 關重新開始</button><button class="btn-big" style="background:#475569;" onclick="GameHub.goHome()">🏠 回首頁</button></div></div>`;
            document.getElementById('sm-retry').onclick = () => playSimon(stage, 1, 3);
          } else {
            showDemo();
          }
        });
      }
    }

    wrap.querySelector('#sm-start').onclick = showDemo;
    replayBtn.onclick = () => { if (mode === 'play') showDemo(); };
    GameHub.setAIMessage(`第 ${level} 關！等一下會有 ${seqLen} 個燈依序亮起來，準備好就按綠色按鈕開始看喔！`, true);
  }

  GameHub.registerGame('simon-says', { start: (s) => playSimon(s, 1, 3) });
})();
