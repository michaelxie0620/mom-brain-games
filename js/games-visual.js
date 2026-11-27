(() => {
  const old = document.getElementById('visual-games-style');
  if (old) old.remove();
  const st = document.createElement('style');
  st.id = 'visual-games-style';
  st.textContent = `
    .vg-wrap{width:100%;max-width:920px;display:flex;flex-direction:column;align-items:center;gap:18px}
    .vg-header{display:flex;justify-content:space-between;align-items:center;width:100%;flex-wrap:wrap;gap:10px}
    .vg-badge{background:#E0F2FE;color:#0369A1;padding:10px 20px;border-radius:999px;font-size:25px;font-weight:800}
    .vg-hearts{background:#FFF1F2;border:2px solid #FDA4AF;padding:8px 16px;border-radius:999px;font-size:26px;letter-spacing:4px}
    .vg-sub-btn{background:#FEF3C7;color:#92400E;border:3px solid #F59E0B;padding:10px 20px;border-radius:16px;font-size:23px;font-weight:800;cursor:pointer}
    .vg-grid{display:grid;gap:18px;width:100%;justify-items:center}
    .vg-card{width:100%;min-height:190px;border-radius:26px;border:4px solid #93C5FD;background:#EFF6FF;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:transform .15s,background .2s,border-color .2s;padding:14px;box-shadow:0 4px 12px rgba(15,23,42,.06)}
    .vg-grid.dense .vg-card{min-height:150px;padding:10px}
    .vg-card:active{transform:scale(.96)}
    .vg-card.flipped{background:#FFF;border-color:#2563EB}
    .vg-card.matched{background:#DCFCE7;border-color:#16A34A}
    .vg-card.wrong{background:#FEF2F2;border-color:#EF4444}
    .vg-emoji{font-size:76px;line-height:1.1}
    .vg-grid.dense .vg-emoji{font-size:62px}
    .vg-label{font-size:30px;font-weight:800;color:#1E293B;margin-top:8px}
    .vg-grid.dense .vg-label{font-size:26px;margin-top:4px}
    .vg-back{font-size:64px;font-weight:900;color:#2563EB}
    .vg-grid.dense .vg-back{font-size:52px}
    .vg-poker-num{font-size:72px;font-weight:900;line-height:1}
    .vg-grid.dense .vg-poker-num{font-size:58px}
    .vg-poker-suit{font-size:38px;margin-top:6px}
    .vg-grid.dense .vg-poker-suit{font-size:30px}
    .vg-red{color:#DC2626}.vg-black{color:#1E293B}
    .vg-item-row{display:flex;flex-wrap:wrap;justify-content:center;gap:18px;width:100%}
    .vg-item-pill{background:#F8FAFC;border:4px solid #CBD5E1;border-radius:24px;padding:18px 24px;min-width:155px;display:flex;flex-direction:column;align-items:center}
    .vg-item-pill .vg-emoji{font-size:68px}.vg-item-pill .vg-label{font-size:28px}
    .vg-action-bar{width:100%;display:flex;justify-content:center;margin-top:8px}
    .vg-win-box{text-align:center;padding:24px;animation:vgPop .35s ease}
    .vg-win-emoji{font-size:90px;margin-bottom:12px}
    .vg-win-title{font-size:38px;font-weight:900;color:#15803D;margin:0 0 14px 0}
    @keyframes vgPop{0%{transform:scale(.85);opacity:0}100%{transform:scale(1);opacity:1}}
  `;
  document.head.appendChild(st);

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const heartsHTML = (n) => '❤️'.repeat(Math.max(0, n)) + '🤍'.repeat(Math.max(0, 3 - n));

  // 唸完語音後才執行下一步（避免還在說話就蓋牌）
  function sayThen(text, onDone) {
    GameHub.setAIMessage(text, true);
    let done = false, started = false;
    const t0 = Date.now();
    const minMs = Math.max(2600, text.length * 220);
    const maxMs = Math.max(6000, text.length * 450);
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(iv);
      clearTimeout(tm);
      onDone();
    };
    const tm = setTimeout(finish, maxMs);
    const iv = setInterval(() => {
      const ms = Date.now() - t0;
      const speaking = 'speechSynthesis' in window &&
        (window.speechSynthesis.speaking || window.speechSynthesis.pending);
      if (speaking) started = true;
      else if (started && ms > 600) { clearInterval(iv); clearTimeout(tm); setTimeout(finish, 450); }
      else if (!started && ms >= minMs) finish();
    }, 150);
  }

  function renderWin(stage, title, subText, onNext) {
    stage.innerHTML = `
      <div class="vg-win-box">
        <div class="vg-win-emoji">🎉🌟🎉</div>
        <h3 class="vg-win-title">${title}</h3>
        <p style="font-size:28px;color:#475569;margin:0 0 28px 0;">${subText}</p>
        <div>
          <button class="btn-big green" id="vg-next">👉 玩下一關</button>
          <button class="btn-big" style="background:#475569;" onclick="GameHub.goHome()">🏠 回首頁</button>
        </div>
      </div>`;
    document.getElementById('vg-next').onclick = onNext;
  }

  function renderGameOver(stage, onRestart) {
    stage.innerHTML = `
      <div class="vg-win-box">
        <div class="vg-win-emoji">💪❤️</div>
        <h3 class="vg-win-title" style="color:#DC2626;">愛心用完囉！遊戲結束</h3>
        <p style="font-size:28px;color:#475569;margin:0 0 28px 0;">沒關係，多練幾次記性會越來越好！</p>
        <div>
          <button class="btn-big green" id="vg-retry">🔄 從第 1 關重新開始</button>
          <button class="btn-big" style="background:#475569;" onclick="GameHub.goHome()">🏠 回首頁</button>
        </div>
      </div>`;
    document.getElementById('vg-retry').onclick = onRestart;
  }

  // 共用翻牌引擎（遊戲 1 翻牌配對 & 遊戲 4 簡易撿紅點）
  function runCardMatch(stage, cfg) {
    let lives = cfg.lives, flipped = [], isLocked = true, matched = 0, hasStarted = false;
    const deck = cfg.deck.map((c, i) => ({ ...c, uid: i, flipped: false, matched: false, wrong: false }));
    const wrap = document.createElement('div');
    wrap.className = 'vg-wrap';
    wrap.innerHTML = `
      <div class="vg-header">
        <span class="vg-badge">${cfg.badge}</span>
        <span class="vg-hearts" id="cm-hearts">${heartsHTML(lives)}</span>
        <button class="vg-sub-btn" id="cm-peek" style="display:none;">👀 偷看一下</button>
      </div>
      <div class="vg-grid ${cfg.isDense ? 'dense' : ''}" id="cm-grid" style="grid-template-columns:repeat(${cfg.cols},1fr);"></div>
      <div class="vg-action-bar" id="cm-bar">
        <button class="btn-big green" id="cm-cover">👀 我記好了，蓋起來開始玩！</button>
      </div>`;
    stage.innerHTML = '';
    stage.appendChild(wrap);

    const grid = wrap.querySelector('#cm-grid');
    const heartsEl = wrap.querySelector('#cm-hearts');
    const peekBtn = wrap.querySelector('#cm-peek');
    const bar = wrap.querySelector('#cm-bar');
    const coverBtn = wrap.querySelector('#cm-cover');

    const renderDeck = (reveal = false) => {
      grid.innerHTML = '';
      deck.forEach((card) => {
        const btn = document.createElement('button');
        const show = reveal || card.flipped || card.matched;
        const cls = card.matched ? 'matched' : card.wrong ? 'wrong' : show ? 'flipped' : '';
        btn.className = `vg-card ${cls}`;
        btn.innerHTML = show ? cfg.cardHTML(card) : `<div class="vg-back">${cfg.back}</div>`;
        btn.onclick = () => onClick(card);
        grid.appendChild(btn);
      });
    };

    const onClick = (card) => {
      if (isLocked || card.flipped || card.matched) return;
      GameHub.playTone(520, 0.08, 'sine', 0.15);
      card.flipped = true;
      flipped.push(card);
      renderDeck();

      if (flipped.length === 1) {
        if (cfg.onFirstFlip) GameHub.setAIMessage(cfg.onFirstFlip(card), true);
        return;
      }

      isLocked = true;
      const [a, b] = flipped;
      if (cfg.isMatch(a, b)) {
        a.matched = b.matched = true;
        matched++;
        flipped = [];
        GameHub.playSuccess();
        renderDeck();
        if (matched === cfg.pairCount) {
          const praise = GameHub.randomPraise();
          GameHub.onRoundComplete(1);
          sayThen(cfg.winMsg(praise), () => {
            if (wrap.isConnected) renderWin(stage, cfg.winTitle, praise, () => cfg.onNext(lives));
          });
        } else {
          GameHub.setAIMessage(cfg.matchMsg(a, b), true);
          setTimeout(() => { if (wrap.isConnected) isLocked = false; }, 350);
        }
      } else {
        lives--;
        heartsEl.textContent = heartsHTML(lives);
        a.wrong = b.wrong = true;
        renderDeck();
        GameHub.playGentleTryAgain();
        sayThen(cfg.wrongMsg(a, b, lives), () => {
          if (!wrap.isConnected) return;
          if (lives <= 0) { renderGameOver(stage, cfg.onRestart); return; }
          a.flipped = b.flipped = a.wrong = b.wrong = false;
          flipped = [];
          renderDeck();
          isLocked = false;
        });
      }
    };

    coverBtn.onclick = () => {
      GameHub.playTone(440, 0.12);
      bar.style.display = 'none';
      peekBtn.style.display = 'inline-block';
      renderDeck(false);
      isLocked = false;
      GameHub.setAIMessage(hasStarted ? cfg.resumeMsg : cfg.coverMsg, true);
      hasStarted = true;
    };

    peekBtn.onclick = () => {
      if (isLocked) return;
      isLocked = true;
      peekBtn.style.display = 'none';
      coverBtn.textContent = '✅ 看好了，蓋起來繼續玩！';
      bar.style.display = 'flex';
      renderDeck(true);
      GameHub.setAIMessage('慢慢看沒關係，記好了再按下面的綠色按鈕蓋起來喔！', true);
    };

    renderDeck(true);
    GameHub.setAIMessage(cfg.startMsg, true);
  }

  // 遊戲 1：翻牌配對
  const THEMES = [
    { name: '香甜水果攤', items: [['🍎','蘋果'],['🍌','香蕉'],['🍉','西瓜'],['🍇','葡萄'],['🍍','鳳梨'],['🍊','橘子']] },
    { name: '台灣好味道', items: [['🥟','水餃'],['🍜','湯麵'],['🧋','珍奶'],['🍙','飯糰'],['🍗','雞腿'],['🍵','熱茶']] },
    { name: '溫馨小花園', items: [['🌻','向日葵'],['🌷','鬱金香'],['🦋','蝴蝶'],['🐝','蜜蜂'],['🍀','幸運草'],['🌺','扶桑花']] }
  ];

  function playMemory(stage, level, lives) {
    const t = THEMES[(level - 1) % THEMES.length];
    const pairCount = level === 1 ? 3 : level === 2 ? 4 : 6;
    const chosen = shuffle(t.items).slice(0, pairCount).map(([emoji, label]) => ({ emoji, label }));
    runCardMatch(stage, {
      lives, pairCount, cols: pairCount === 3 ? 3 : 4, isDense: pairCount >= 6,
      badge: `第 ${level} 關｜${t.name}`, back: '？',
      deck: shuffle([...chosen, ...chosen]),
      cardHTML: (c) => `<div class="vg-emoji">${c.emoji}</div><div class="vg-label">${c.label}</div>`,
      isMatch: (a, b) => a.label === b.label,
      startMsg: `第 ${level} 關！請慢慢記住圖案的位置，記好了再按綠色按鈕蓋起來喔！`,
      coverMsg: '蓋起來囉！現在翻開兩張一樣的圖案配對吧！',
      resumeMsg: '蓋起來囉！我們繼續把剩下的找出來！',
      matchMsg: (a) => `水喔！找到「${a.label}」了，繼續找下一對！`,
      winMsg: (p) => `${p} 全部 ${pairCount} 對都找到了！`,
      winTitle: `第 ${level} 關過關！`,
      wrongMsg: (a, b, left) => left <= 0
        ? `翻到「${a.label}」和「${b.label}」，不一樣喔！三顆愛心都用完了，我們從第一關再挑戰一次吧！`
        : `翻到「${a.label}」和「${b.label}」，不一樣喔！還剩 ${left} 顆愛心，看清楚位置再試一次！`,
      onNext: (rem) => playMemory(stage, level + 1, rem),
      onRestart: () => playMemory(stage, 1, 3)
    });
  }
  GameHub.registerGame('memory-match', { start: (s) => playMemory(s, 1, 3) });

  // 遊戲 2：少了哪一樣
  const DAILY = [
    ['🔑','鑰匙'],['👓','眼鏡'],['☕','茶杯'],['☂️','雨傘'],['📱','手機'],['⌚','手錶'],['🍎','蘋果'],['🪥','牙刷'],
    ['✂️','剪刀'],['🧢','帽子'],['⏰','鬧鐘'],['👛','錢包'],['📖','書本'],['🔦','手電筒'],['🪴','盆栽'],['🧦','襪子']
  ].map(([emoji, label]) => ({ emoji, label }));

  function playMissing(stage, level, lives) {
    const count = Math.min(4 + Math.floor((level - 1) / 2), 7);
    const pool = shuffle(DAILY);
    const shown = pool.slice(0, count);
    const missing = shown[Math.floor(Math.random() * shown.length)];
    const remain = shuffle(shown.filter((i) => i.label !== missing.label));
    const opts = shuffle([missing, ...pool.slice(count, count + 3)]);
    const wrap = document.createElement('div');
    wrap.className = 'vg-wrap';
    stage.innerHTML = '';
    stage.appendChild(wrap);

    const pills = (arr) => arr.map((it) => `<div class="vg-item-pill"><div class="vg-emoji">${it.emoji}</div><div class="vg-label">${it.label}</div></div>`).join('');

    const showObserve = () => {
      wrap.innerHTML = `
        <div class="vg-header">
          <span class="vg-badge">第 ${level} 關｜記住這 ${count} 樣東西</span>
          <span class="vg-hearts">${heartsHTML(lives)}</span>
        </div>
        <div class="vg-item-row">${pills(shown)}</div>
        <button class="btn-big green" id="wm-go" style="margin-top:12px;">👀 我記好了，開始考我！</button>`;
      GameHub.setAIMessage(`桌上有 ${count} 樣東西，慢慢看沒關係，記好了就按綠色按鈕喔！`, true);
      wrap.querySelector('#wm-go').onclick = showQuiz;
    };

    const showQuiz = () => {
      let isLocked = false;
      GameHub.playTone(440, 0.12);
      wrap.innerHTML = `
        <div class="vg-header">
          <span class="vg-badge">變魔術！少了一樣</span>
          <span class="vg-hearts" id="wm-hearts">${heartsHTML(lives)}</span>
          <button class="vg-sub-btn" id="wm-back">👀 重新看一次</button>
        </div>
        <div class="vg-item-row">${pills(remain)}<div class="vg-item-pill" style="border-style:dashed;border-color:#F59E0B;background:#FFFBEB;"><div class="vg-emoji">❓</div><div class="vg-label" style="color:#B45309;">不見了</div></div></div>
        <p style="font-size:28px;font-weight:800;color:#1E3A8A;margin:6px 0 0 0;">請問少了下面哪一樣？</p>
        <div class="vg-grid dense" style="grid-template-columns:repeat(2,1fr);max-width:680px;" id="wm-opts"></div>`;
      wrap.querySelector('#wm-back').onclick = () => { if (!isLocked) showObserve(); };
      GameHub.setAIMessage('剛才有一樣東西偷偷躲起來了，你看看少了哪一樣？', true);

      const box = wrap.querySelector('#wm-opts');
      opts.forEach((opt) => {
        const btn = document.createElement('button');
        btn.className = 'vg-card flipped';
        btn.innerHTML = `<div class="vg-emoji">${opt.emoji}</div><div class="vg-label">${opt.label}</div>`;
        btn.onclick = () => {
          if (isLocked || btn.disabled) return;
          isLocked = true;
          if (opt.label === missing.label) {
            btn.classList.add('matched');
            const p = GameHub.randomPraise();
            GameHub.onRoundComplete(1);
            sayThen(`${p} 少的就是「${missing.label}」！`, () => {
              if (wrap.isConnected) renderWin(stage, `答對了！少了「${missing.label}」`, p, () => playMissing(stage, level + 1, lives));
            });
          } else {
            lives--;
            wrap.querySelector('#wm-hearts').textContent = heartsHTML(lives);
            GameHub.playGentleTryAgain();
            btn.classList.add('wrong');
            btn.style.opacity = '0.5';
            btn.disabled = true;
            const msg = lives <= 0
              ? `不是「${opt.label}」喔！三顆愛心都用完了，我們從第一關再挑戰一次吧！`
              : `不是「${opt.label}」喔，剛才桌上沒有它，還剩 ${lives} 顆愛心，再想想看！`;
            sayThen(msg, () => {
              if (!wrap.isConnected) return;
              if (lives <= 0) renderGameOver(stage, () => playMissing(stage, 1, 3));
              else isLocked = false;
            });
          }
        };
        box.appendChild(btn);
      });
    };
    showObserve();
  }
  GameHub.registerGame('whats-missing', { start: (s) => playMissing(s, 1, 3) });

  // 遊戲 3：幫 AI 買菜
  const RECIPES = [
    { dish: '三杯雞', items: [['🍗','雞肉'],['🌿','九層塔'],['🧄','大蒜'],['🫙','醬油']] },
    { dish: '番茄炒蛋', items: [['🍅','番茄'],['🥚','雞蛋'],['🧅','洋蔥'],['🧂','鹽巴']] },
    { dish: '溫馨火鍋', items: [['🥬','高麗菜'],['🌽','玉米'],['🦐','鮮蝦'],['🍄','香菇']] },
    { dish: '豐盛水果盤', items: [['🍎','蘋果'],['🍌','香蕉'],['🍉','西瓜'],['🍇','葡萄']] },
    { dish: '中式早點', items: [['🥟','水餃'],['🥛','豆漿'],['🍠','地瓜'],['🍳','荷包蛋']] },
    { dish: '清炒時蔬', items: [['🥦','花椰菜'],['🥕','紅蘿蔔'],['🥒','小黃瓜'],['🌶️','辣椒']] }
  ].map((r) => ({ dish: r.dish, items: r.items.map(([emoji, label]) => ({ emoji, label })) }));
  const ALL_FOOD = RECIPES.flatMap((r) => r.items);

  function playGrocery(stage, level, lives) {
    const recipe = RECIPES[(level - 1) % RECIPES.length];
    const count = level <= 2 ? 3 : 4;
    const targets = recipe.items.slice(0, count);
    const tSet = new Set(targets.map((t) => t.label));
    const stall = shuffle([...targets, ...shuffle(ALL_FOOD.filter((g) => !tSet.has(g.label))).slice(0, 9 - count)]);
    const bought = new Set();
    const names = targets.map((t) => t.label).join('、');
    const wrap = document.createElement('div');
    wrap.className = 'vg-wrap';
    stage.innerHTML = '';
    stage.appendChild(wrap);

    const showMemo = () => {
      wrap.innerHTML = `
        <div class="vg-header">
          <span class="vg-badge">第 ${level} 關｜今天做「${recipe.dish}」</span>
          <span class="vg-hearts">${heartsHTML(lives)}</span>
        </div>
        <p style="font-size:28px;font-weight:800;margin:4px 0;">請幫忙記住這 ${count} 樣食材：</p>
        <div class="vg-item-row">${targets.map((it) => `<div class="vg-item-pill" style="background:#FFFBEB;border-color:#F59E0B;"><div class="vg-emoji">${it.emoji}</div><div class="vg-label">${it.label}</div></div>`).join('')}</div>
        <button class="btn-big green" id="gs-go" style="margin-top:12px;">🧺 記住了，出發去買菜！</button>`;
      GameHub.setAIMessage(`今天想做${recipe.dish}，請幫我記住：${names}。記好就出發去菜市場喔！`, true);
      wrap.querySelector('#gs-go').onclick = showMarket;
    };

    const showMarket = () => {
      let isLocked = false;
      wrap.innerHTML = `
        <div class="vg-header">
          <span class="vg-badge" id="gs-prog">買菜中｜已買 ${bought.size} / ${count} 樣</span>
          <span class="vg-hearts" id="gs-hearts">${heartsHTML(lives)}</span>
          <button class="vg-sub-btn" id="gs-peek">👀 偷看菜單</button>
        </div>
        <div class="vg-grid dense" style="grid-template-columns:repeat(3,1fr);" id="gs-grid"></div>`;
      wrap.querySelector('#gs-peek').onclick = () => {
        if (isLocked) return;
        GameHub.showToast(`菜單是：${names}`, 4000);
        GameHub.setAIMessage(`別擔心，菜單是：${names}喔！`, true);
      };

      const grid = wrap.querySelector('#gs-grid');
      stall.forEach((item) => {
        const btn = document.createElement('button');
        const ok = bought.has(item.label);
        btn.className = `vg-card ${ok ? 'matched' : 'flipped'}`;
        btn.innerHTML = `<div class="vg-emoji">${item.emoji}</div><div class="vg-label">${item.label}${ok ? ' ✅' : ''}</div>`;
        btn.onclick = () => {
          if (isLocked || bought.has(item.label)) return;
          if (tSet.has(item.label)) {
            bought.add(item.label);
            GameHub.playSuccess();
            btn.className = 'vg-card matched';
            btn.innerHTML = `<div class="vg-emoji">${item.emoji}</div><div class="vg-label">${item.label} ✅</div>`;
            wrap.querySelector('#gs-prog').textContent = `買菜中｜已買 ${bought.size} / ${count} 樣`;
            if (bought.size === count) {
              isLocked = true;
              const p = GameHub.randomPraise();
              GameHub.onRoundComplete(1);
              sayThen(`${p} 「${recipe.dish}」的材料全部買齊了！`, () => {
                if (wrap.isConnected) renderWin(stage, `太棒了！「${recipe.dish}」買齊！`, p, () => playGrocery(stage, level + 1, lives));
              });
            } else {
              GameHub.setAIMessage(`買到「${item.label}」了！還差 ${count - bought.size} 樣喔！`, true);
            }
          } else {
            isLocked = true;
            lives--;
            wrap.querySelector('#gs-hearts').textContent = heartsHTML(lives);
            GameHub.playGentleTryAgain();
            btn.className = 'vg-card wrong';
            const msg = lives <= 0
              ? `做${recipe.dish}不需要「${item.label}」喔！三顆愛心都用完了，我們從第一關再挑戰一次吧！`
              : `今天做${recipe.dish}不需要「${item.label}」喔，還剩 ${lives} 顆愛心，再找找看！`;
            sayThen(msg, () => {
              if (!wrap.isConnected) return;
              if (lives <= 0) { renderGameOver(stage, () => playGrocery(stage, 1, 3)); return; }
              btn.className = 'vg-card flipped';
              isLocked = false;
            });
          }
        };
        grid.appendChild(btn);
      });
      GameHub.setAIMessage(`到市場囉！請把要做「${recipe.dish}」的 ${count} 樣東西點出來！`, true);
    };
    showMemo();
  }
  GameHub.registerGame('grocery-shop', { start: (s) => playGrocery(s, 1, 3) });

  // 遊戲 4：簡易撿紅點
  const PAIRS = [[1,9],[2,8],[3,7],[4,6],[5,5]];
  const SUITS = [{ s: '♥️', r: true }, { s: '♦️', r: true }, { s: '♠️', r: false }, { s: '♣️', r: false }];

  function playMakeTen(stage, level, lives) {
    const pairCount = level === 1 ? 3 : level === 2 ? 4 : 5;
    const raw = [];
    shuffle(PAIRS).slice(0, pairCount).forEach(([n1, n2], i) => {
      const a = SUITS[i % 4], b = SUITS[(i + 1) % 4];
      raw.push({ num: n1, suit: a.s, red: a.r }, { num: n2, suit: b.s, red: b.r });
    });
    runCardMatch(stage, {
      lives, pairCount, cols: pairCount === 3 ? 3 : 4, isDense: pairCount >= 5,
      badge: `第 ${level} 關｜湊成 10`, back: '🃏',
      deck: shuffle(raw),
      cardHTML: (c) => `<div class="vg-poker-num ${c.red ? 'vg-red' : 'vg-black'}">${c.num}</div><div class="vg-poker-suit">${c.suit}</div>`,
      onFirstFlip: (c) => `翻到 ${c.num} 了，找找看哪一張是 ${10 - c.num} 湊成 10 呢？`,
      isMatch: (a, b) => a.num + b.num === 10,
      startMsg: '請慢慢記住數字在哪裡，記好了再按綠色按鈕蓋起來開始玩喔！',
      coverMsg: '蓋起來囉！現在翻出兩張加起來等於 10 的牌吧！',
      resumeMsg: '蓋起來囉！繼續把剩下的牌湊成 10 吧！',
      matchMsg: (a, b) => `水喔！${a.num} 加 ${b.num} 等於 10，收走一對！`,
      winMsg: (p) => `${p} 所有湊成 10 的牌都收光光了！`,
      winTitle: `第 ${level} 關過關！心算超強！`,
      wrongMsg: (a, b, left) => left <= 0
        ? `${a.num} 加 ${b.num} 是 ${a.num + b.num}，還沒湊到 10 喔！三顆愛心都用完了，從第一關再挑戰一次吧！`
        : `${a.num} 加 ${b.num} 是 ${a.num + b.num}，還沒湊到 10 喔！還剩 ${left} 顆愛心，看清楚位置再試一次！`,
      onNext: (rem) => playMakeTen(stage, level + 1, rem),
      onRestart: () => playMakeTen(stage, 1, 3)
    });
  }
  GameHub.registerGame('make-ten', { start: (s) => playMakeTen(s, 1, 3) });
})();
