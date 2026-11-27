(() => {
  if (!document.getElementById('visual-games-style')) {
    const style = document.createElement('style');
    style.id = 'visual-games-style';
    style.textContent = `
      .vg-wrap { width: 100%; max-width: 780px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
      .vg-header { display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 10px; }
      .vg-badge { background: #E0F2FE; color: #0369A1; padding: 8px 18px; border-radius: 999px; font-size: 22px; font-weight: 800; }
      .vg-sub-btn { background: #FEF3C7; color: #92400E; border: 2px solid #F59E0B; padding: 8px 18px; border-radius: 14px; font-size: 20px; font-weight: 800; cursor: pointer; }
      .vg-grid { display: grid; gap: 14px; width: 100%; justify-items: center; }
      .vg-card {
        width: 100%; min-height: 115px; border-radius: 20px; border: 3px solid #93C5FD;
        background: #EFF6FF; display: flex; flex-direction: column; align-items: center; justify-content: center;
        cursor: pointer; transition: transform 0.15s, background 0.2s; padding: 10px;
      }
      .vg-card:active { transform: scale(0.95); }
      .vg-card.flipped { background: #FFFFFF; border-color: #2563EB; }
      .vg-card.matched { background: #DCFCE7; border-color: #16A34A; opacity: 0.9; }
      .vg-card.selected { background: #FEF3C7; border-color: #D97706; transform: scale(1.03); }
      .vg-emoji { font-size: 46px; line-height: 1.1; }
      .vg-label { font-size: 22px; font-weight: 800; color: #1E293B; margin-top: 4px; }
      .vg-back { font-size: 40px; color: #3B82F6; }
      .vg-win-box { text-align: center; padding: 20px; animation: vgPop 0.35s ease; }
      .vg-win-emoji { font-size: 80px; margin-bottom: 10px; }
      .vg-win-title { font-size: 34px; font-weight: 900; color: #15803D; margin: 0 0 12px 0; }
      .vg-poker-num { font-size: 44px; font-weight: 900; line-height: 1; }
      .vg-poker-suit { font-size: 26px; margin-top: 2px; }
      .vg-red { color: #DC2626; }
      .vg-black { color: #1E293B; }
      .vg-item-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; width: 100%; }
      .vg-item-pill {
        background: #F8FAFC; border: 3px solid #CBD5E1; border-radius: 20px;
        padding: 14px 18px; min-width: 120px; display: flex; flex-direction: column; align-items: center;
      }
      .vg-item-pill.done { background: #DCFCE7; border-color: #16A34A; }
      .vg-action-bar { width: 100%; display: flex; justify-content: center; margin-top: 8px; }
      @keyframes vgPop { 0% { transform: scale(0.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
    `;
    document.head.appendChild(style);
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function renderWin(stage, title, subText, onNext) {
    stage.innerHTML = `
      <div class="vg-win-box">
        <div class="vg-win-emoji">🎉🌟🎉</div>
        <h3 class="vg-win-title">${title}</h3>
        <p style="font-size:24px; color:#475569; margin:0 0 24px 0;">${subText}</p>
        <div>
          <button class="btn-big green" id="vg-btn-next">👉 玩下一關</button>
          <button class="btn-big" style="background:#475569;" onclick="GameHub.goHome()">🏠 回首頁</button>
        </div>
      </div>
    `;
    document.getElementById('vg-btn-next').onclick = onNext;
  }

  // =========================================================================
  // 遊戲 1：翻牌配對（手動決定何時蓋牌，完全零時間壓力）
  // =========================================================================
  const MEMORY_THEMES = [
    {
      name: '香甜水果攤',
      items: [
        { emoji: '🍎', label: '蘋果' }, { emoji: '🍌', label: '香蕉' },
        { emoji: '🍉', label: '西瓜' }, { emoji: '🍇', label: '葡萄' },
        { emoji: '🍍', label: '鳳梨' }, { emoji: '🍊', label: '橘子' }
      ]
    },
    {
      name: '台灣好味道',
      items: [
        { emoji: '🥟', label: '水餃' }, { emoji: '🍜', label: '湯麵' },
        { emoji: '🧋', label: '珍奶' }, { emoji: '🍙', label: '飯糰' },
        { emoji: '🍗', label: '雞腿' }, { emoji: '🍵', label: '熱茶' }
      ]
    },
    {
      name: '溫馨小花園',
      items: [
        { emoji: '🌻', label: '向日葵' }, { emoji: '🌷', label: '鬱金香' },
        { emoji: '🦋', label: '蝴蝶' }, { emoji: '🐝', label: '蜜蜂' },
        { emoji: '🍀', label: '幸運草' }, { emoji: '🌺', label: '扶桑花' }
      ]
    }
  ];

  let memoryLevel = 1;

  GameHub.registerGame('memory-match', {
    start(stage) {
      memoryLevel = 1;
      playMemoryRound(stage);
    }
  });

  function playMemoryRound(stage) {
    const theme = MEMORY_THEMES[(memoryLevel - 1) % MEMORY_THEMES.length];
    const pairCount = memoryLevel === 1 ? 3 : memoryLevel === 2 ? 4 : 6;
    const chosen = shuffle(theme.items).slice(0, pairCount);
    const deck = shuffle([...chosen, ...chosen]).map((item, idx) => ({
      ...item,
      uid: idx,
      flipped: false,
      matched: false
    }));

    let flippedCards = [];
    let isLocked = true;
    let matchedPairs = 0;
    let hasStarted = false;

    const cols = pairCount === 3 ? 3 : 4;
    const wrap = document.createElement('div');
    wrap.className = 'vg-wrap';
    wrap.innerHTML = `
      <div class="vg-header">
        <span class="vg-badge">第 ${memoryLevel} 關｜${theme.name}（${pairCount} 對）</span>
        <button class="vg-sub-btn" id="mm-peek" style="display:none;">👀 偷看一下</button>
      </div>
      <div class="vg-grid" id="mm-grid" style="grid-template-columns: repeat(${cols}, 1fr);"></div>
      <div class="vg-action-bar" id="mm-action-bar">
        <button class="btn-big green" id="mm-cover-btn">👀 我記好了，蓋起來開始玩！</button>
      </div>
    `;
    stage.innerHTML = '';
    stage.appendChild(wrap);

    const grid = wrap.querySelector('#mm-grid');
    const peekBtn = wrap.querySelector('#mm-peek');
    const actionBar = wrap.querySelector('#mm-action-bar');
    const coverBtn = wrap.querySelector('#mm-cover-btn');

    function renderDeck(forceReveal = false) {
      grid.innerHTML = '';
      deck.forEach((card) => {
        const btn = document.createElement('button');
        const show = forceReveal || card.flipped || card.matched;
        btn.className = `vg-card ${card.matched ? 'matched' : show ? 'flipped' : ''}`;
        btn.innerHTML = show
          ? `<div class="vg-emoji">${card.emoji}</div><div class="vg-label">${card.label}</div>`
          : `<div class="vg-back">❓</div>`;
        btn.onclick = () => onCardClick(card);
        grid.appendChild(btn);
      });
    }

    function onCardClick(card) {
      if (isLocked || card.flipped || card.matched) return;
      GameHub.playTone(520, 0.08, 'sine', 0.15);
      card.flipped = true;
      flippedCards.push(card);
      renderDeck();

      if (flippedCards.length === 2) {
        isLocked = true;
        const [a, b] = flippedCards;
        if (a.label === b.label) {
          a.matched = true;
          b.matched = true;
          matchedPairs += 1;
          flippedCards = [];
          GameHub.playSuccess();
          setTimeout(() => {
            if (!wrap.isConnected) return;
            renderDeck();
            isLocked = false;
            if (matchedPairs === pairCount) {
              const praise = GameHub.randomPraise();
              GameHub.setAIMessage(`${praise} 全部 ${pairCount} 對都找到了！`, true);
              GameHub.onRoundComplete(1);
              setTimeout(() => {
                if (!wrap.isConnected) return;
                renderWin(stage, `第 ${memoryLevel} 關過關！`, praise, () => {
                  memoryLevel += 1;
                  playMemoryRound(stage);
                });
              }, 800);
            } else {
              GameHub.setAIMessage(`水喔！找到「${a.label}」了，繼續找下一對！`, false);
            }
          }, 300);
        } else {
          GameHub.playGentleTryAgain();
          setTimeout(() => {
            if (!wrap.isConnected) return;
            a.flipped = false;
            b.flipped = false;
            flippedCards = [];
            renderDeck();
            isLocked = false;
          }, 900);
        }
      }
    }

    // 玩家自行按下「蓋起來」按鈕
    coverBtn.onclick = () => {
      GameHub.playTone(440, 0.12);
      actionBar.style.display = 'none';
      peekBtn.style.display = 'inline-block';
      renderDeck(false);
      isLocked = false;
      if (!hasStarted) {
        hasStarted = true;
        GameHub.setAIMessage('蓋起來囉！現在請翻開兩張一樣的圖案配對吧！', true);
      } else {
        GameHub.setAIMessage('蓋起來囉！我們繼續把剩下的找出來！', true);
      }
    };

    // 偷看按鈕：打開後也是等玩家自己按蓋起來
    peekBtn.onclick = () => {
      if (isLocked) return;
      isLocked = true;
      peekBtn.style.display = 'none';
      coverBtn.textContent = '✅ 看好了，蓋起來繼續玩！';
      actionBar.style.display = 'flex';
      renderDeck(true);
      GameHub.setAIMessage('慢慢看沒關係，記起來了再按下面的綠色按鈕蓋起來喔！', true);
    };

    // 開局全部亮出來，完全不倒數
    renderDeck(true);
    GameHub.setAIMessage(`第 ${memoryLevel} 關！請慢慢記住圖案的位置，記好了再按下面的綠色按鈕蓋起來喔！`, true);
  }

  // =========================================================================
  // 遊戲 2：少了哪一樣（視覺觀察與提取，無倒數壓力）
  // =========================================================================
  const DAILY_ITEMS = [
    { emoji: '🔑', label: '鑰匙' }, { emoji: '👓', label: '眼鏡' },
    { emoji: '☕', label: '茶杯' }, { emoji: '☂️', label: '雨傘' },
    { emoji: '📱', label: '手機' }, { emoji: '⌚', label: '手錶' },
    { emoji: '🍎', label: '蘋果' }, { emoji: '🪥', label: '牙刷' },
    { emoji: '✂️', label: '剪刀' }, { emoji: '🧢', label: '帽子' },
    { emoji: '⏰', label: '鬧鐘' }, { emoji: '👛', label: '錢包' },
    { emoji: '📖', label: '書本' }, { emoji: '🔦', label: '手電筒' },
    { emoji: '🪴', label: '盆栽' }, { emoji: '🧦', label: '襪子' }
  ];

  let missingLevel = 1;

  GameHub.registerGame('whats-missing', {
    start(stage) {
      missingLevel = 1;
      playMissingRound(stage);
    }
  });

  function playMissingRound(stage) {
    const itemCount = Math.min(4 + Math.floor((missingLevel - 1) / 2), 7);
    const pool = shuffle(DAILY_ITEMS);
    const shownItems = pool.slice(0, itemCount);
    const distractors = pool.slice(itemCount, itemCount + 3);
    const missingItem = shownItems[Math.floor(Math.random() * shownItems.length)];
    const remainingItems = shuffle(shownItems.filter((i) => i.label !== missingItem.label));
    const options = shuffle([missingItem, ...distractors]);

    const wrap = document.createElement('div');
    wrap.className = 'vg-wrap';
    stage.innerHTML = '';
    stage.appendChild(wrap);

    function showObservePhase() {
      wrap.innerHTML = `
        <div class="vg-header">
          <span class="vg-badge">第 ${missingLevel} 關｜請記住這 ${itemCount} 樣東西</span>
        </div>
        <div class="vg-item-row">
          ${shownItems.map((it) => `
            <div class="vg-item-pill">
              <div class="vg-emoji">${it.emoji}</div>
              <div class="vg-label">${it.label}</div>
            </div>
          `).join('')}
        </div>
        <button class="btn-big green" id="wm-ready" style="margin-top:16px;">👀 我記好了，開始考我！</button>
      `;
      GameHub.setAIMessage(`桌上有 ${itemCount} 樣東西，慢慢看沒關係，記好了就按綠色按鈕喔！`, true);
      wrap.querySelector('#wm-ready').onclick = showQuizPhase;
    }

    function showQuizPhase() {
      GameHub.playTone(440, 0.12);
      wrap.innerHTML = `
        <div class="vg-header">
          <span class="vg-badge">變魔術！少了一樣東西</span>
          <button class="vg-sub-btn" id="wm-back">👀 重新看一次</button>
        </div>
        <div class="vg-item-row">
          ${remainingItems.map((it) => `
            <div class="vg-item-pill">
              <div class="vg-emoji">${it.emoji}</div>
              <div class="vg-label">${it.label}</div>
            </div>
          `).join('')}
          <div class="vg-item-pill" style="border-style:dashed; border-color:#F59E0B; background:#FFFBEB;">
            <div class="vg-emoji">❓</div>
            <div class="vg-label" style="color:#B45309;">不見了</div>
          </div>
        </div>
        <p style="font-size:26px; font-weight:800; color:#1E3A8A; margin:12px 0 4px 0;">請問少了下面哪一樣？</p>
        <div class="vg-grid" style="grid-template-columns: repeat(2, 1fr); max-width:560px;" id="wm-opts"></div>
      `;

      wrap.querySelector('#wm-back').onclick = showObservePhase;
      GameHub.setAIMessage('剛才有一樣東西偷偷躲起來了，你看看少了哪一樣？', true);

      const optsBox = wrap.querySelector('#wm-opts');
      options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.className = 'vg-card flipped';
        btn.innerHTML = `<div class="vg-emoji">${opt.emoji}</div><div class="vg-label">${opt.label}</div>`;
        btn.onclick = () => {
          if (opt.label === missingItem.label) {
            btn.classList.add('matched');
            const praise = GameHub.randomPraise();
            GameHub.setAIMessage(`${praise} 少的就是「${missingItem.label}」！`, true);
            GameHub.onRoundComplete(1);
            setTimeout(() => {
              if (!wrap.isConnected) return;
              renderWin(stage, `答對了！少了「${missingItem.label}」`, praise, () => {
                missingLevel += 1;
                playMissingRound(stage);
              });
            }, 900);
          } else {
            GameHub.playGentleTryAgain();
            btn.style.opacity = '0.45';
            btn.disabled = true;
            GameHub.setAIMessage(`不是「${opt.label}」喔，剛才桌上沒有它，再想想看！`, true);
          }
        };
        optsBox.appendChild(btn);
      });
    }

    showObservePhase();
  }

  // =========================================================================
  // 遊戲 3：幫 AI 買菜（家常料理菜單，多項工作記憶）
  // =========================================================================
  const RECIPES = [
    { dish: '三杯雞', items: [{ emoji: '🍗', label: '雞肉' }, { emoji: '🌿', label: '九層塔' }, { emoji: '🧄', label: '大蒜' }, { emoji: '🫙', label: '醬油' }] },
    { dish: '番茄炒蛋', items: [{ emoji: '🍅', label: '番茄' }, { emoji: '🥚', label: '雞蛋' }, { emoji: '🧅', label: '洋蔥' }, { emoji: '🧂', label: '鹽巴' }] },
    { dish: '溫馨火鍋', items: [{ emoji: '🥬', label: '高麗菜' }, { emoji: '🌽', label: '玉米' }, { emoji: '🦐', label: '鮮蝦' }, { emoji: '🍄', label: '香菇' }] },
    { dish: '豐盛水果盤', items: [{ emoji: '🍎', label: '蘋果' }, { emoji: '🍌', label: '香蕉' }, { emoji: '🍉', label: '西瓜' }, { emoji: '🍇', label: '葡萄' }] },
    { dish: '中式早點', items: [{ emoji: '🥟', label: '水餃' }, { emoji: '🥛', label: '豆漿' }, { emoji: '🍠', label: '地瓜' }, { emoji: '🍳', label: '荷包蛋' }] },
    { dish: '清炒時蔬', items: [{ emoji: '🥦', label: '花椰菜' }, { emoji: '🥕', label: '紅蘿蔔' }, { emoji: '🥒', label: '小黃瓜' }, { emoji: '🌶️', label: '辣椒' }] }
  ];

  const ALL_GROCERIES = RECIPES.flatMap((r) => r.items);
  let groceryLevel = 1;

  GameHub.registerGame('grocery-shop', {
    start(stage) {
      groceryLevel = 1;
      playGroceryRound(stage);
    }
  });

  function playGroceryRound(stage) {
    const recipe = RECIPES[(groceryLevel - 1) % RECIPES.length];
    const targetCount = groceryLevel <= 2 ? 3 : 4;
    const targets = recipe.items.slice(0, targetCount);
    const targetLabels = new Set(targets.map((t) => t.label));

    const otherItems = shuffle(
      ALL_GROCERIES.filter((g) => !targetLabels.has(g.label))
    ).slice(0, 9 - targetCount);

    const stallItems = shuffle([...targets, ...otherItems]);
    const bought = new Set();

    const wrap = document.createElement('div');
    wrap.className = 'vg-wrap';
    stage.innerHTML = '';
    stage.appendChild(wrap);

    function showMemoPhase() {
      wrap.innerHTML = `
        <div class="vg-header">
          <span class="vg-badge">第 ${groceryLevel} 關｜今天想做「${recipe.dish}」</span>
        </div>
        <p style="font-size:26px; font-weight:800; margin:4px 0;">請幫忙記住這 ${targetCount} 樣食材：</p>
        <div class="vg-item-row">
          ${targets.map((it) => `
            <div class="vg-item-pill" style="background:#FFFBEB; border-color:#F59E0B;">
              <div class="vg-emoji">${it.emoji}</div>
              <div class="vg-label">${it.label}</div>
            </div>
          `).join('')}
        </div>
        <button class="btn-big green" id="gs-go" style="margin-top:16px;">🧺 記住了，出發去買菜！</button>
      `;
      const names = targets.map((t) => t.label).join('、');
      GameHub.setAIMessage(`今天想做${recipe.dish}，請幫我記住：${names}。記好就出發去菜市場喔！`, true);
      wrap.querySelector('#gs-go').onclick = showMarketPhase;
    }

    function showMarketPhase() {
      wrap.innerHTML = `
        <div class="vg-header">
          <span class="vg-badge" id="gs-progress">菜市場攤位｜已買到 ${bought.size} / ${targetCount} 樣</span>
          <button class="vg-sub-btn" id="gs-peek">👀 偷看菜單</button>
        </div>
        <div class="vg-grid" style="grid-template-columns: repeat(3, 1fr);" id="gs-grid"></div>
      `;

      wrap.querySelector('#gs-peek').onclick = () => {
        const names = targets.map((t) => t.label).join('、');
        GameHub.showToast(`菜單是：${names}`, 3500);
        GameHub.setAIMessage(`別擔心，菜單是：${names}喔！`, true);
      };

      const grid = wrap.querySelector('#gs-grid');
      stallItems.forEach((item) => {
        const btn = document.createElement('button');
        const isBought = bought.has(item.label);
        btn.className = `vg-card ${isBought ? 'matched' : 'flipped'}`;
        btn.innerHTML = `
          <div class="vg-emoji">${item.emoji}</div>
          <div class="vg-label">${item.label}${isBought ? ' ✅' : ''}</div>
        `;
        btn.onclick = () => {
          if (bought.has(item.label)) return;
          if (targetLabels.has(item.label)) {
            bought.add(item.label);
            GameHub.playSuccess();
            btn.className = 'vg-card matched';
            btn.innerHTML = `<div class="vg-emoji">${item.emoji}</div><div class="vg-label">${item.label} ✅</div>`;
            wrap.querySelector('#gs-progress').textContent = `菜市場攤位｜已買到 ${bought.size} / ${targetCount} 樣`;

            if (bought.size === targetCount) {
              const praise = GameHub.randomPraise();
              GameHub.setAIMessage(`${praise} 「${recipe.dish}」的材料全部買齊了！`, true);
              GameHub.onRoundComplete(1);
              setTimeout(() => {
                if (!wrap.isConnected) return;
                renderWin(stage, `太棒了！「${recipe.dish}」材料買齊！`, praise, () => {
                  groceryLevel += 1;
                  playGroceryRound(stage);
                });
              }, 800);
            } else {
              GameHub.setAIMessage(`買到「${item.label}」了！還差 ${targetCount - bought.size} 樣喔！`, false);
            }
          } else {
            GameHub.playGentleTryAgain();
            GameHub.setAIMessage(`今天做${recipe.dish}不需要「${item.label}」喔，再找找看！`, true);
          }
        };
        grid.appendChild(btn);
      });

      GameHub.setAIMessage(`到市場囉！請把剛才要做「${recipe.dish}」的 ${targetCount} 樣東西點出來！`, true);
    }

    showMemoPhase();
  }

  // =========================================================================
  // 遊戲 4：簡易撿紅點（手動決定何時蓋牌，翻牌湊 10）
  // =========================================================================
  const TEN_PAIRS = [
    [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]
  ];
  const SUITS = [
    { symbol: '♥️', isRed: true },
    { symbol: '♦️', isRed: true },
    { symbol: '♠️', isRed: false },
    { symbol: '♣️', isRed: false }
  ];

  let tenLevel = 1;

  GameHub.registerGame('make-ten', {
    start(stage) {
      tenLevel = 1;
      playMakeTenRound(stage);
    }
  });

  function playMakeTenRound(stage) {
    const pairCount = tenLevel === 1 ? 3 : tenLevel === 2 ? 4 : 5;
    const chosenPairs = shuffle(TEN_PAIRS).slice(0, pairCount);
    const rawCards = [];
    chosenPairs.forEach((pair, idx) => {
      const suitA = SUITS[idx % SUITS.length];
      const suitB = SUITS[(idx + 1) % SUITS.length];
      rawCards.push({ num: pair[0], suit: suitA.symbol, isRed: suitA.isRed });
      rawCards.push({ num: pair[1], suit: suitB.symbol, isRed: suitB.isRed });
    });

    const deck = shuffle(rawCards).map((c, idx) => ({
      ...c,
      uid: idx,
      flipped: false,
      matched: false
    }));

    let flippedCards = [];
    let isLocked = true;
    let matchedPairs = 0;
    let hasStarted = false;

    const cols = pairCount === 3 ? 3 : pairCount === 4 ? 4 : 5;
    const wrap = document.createElement('div');
    wrap.className = 'vg-wrap';
    wrap.innerHTML = `
      <div class="vg-header">
        <span class="vg-badge">第 ${tenLevel} 關｜兩張加起來等於 10</span>
        <button class="vg-sub-btn" id="mt-peek" style="display:none;">👀 偷看一下</button>
      </div>
      <div class="vg-grid" id="mt-grid" style="grid-template-columns: repeat(${cols}, 1fr);"></div>
      <div class="vg-action-bar" id="mt-action-bar">
        <button class="btn-big green" id="mt-cover-btn">👀 我記好了，蓋起來開始玩！</button>
      </div>
    `;
    stage.innerHTML = '';
    stage.appendChild(wrap);

    const grid = wrap.querySelector('#mt-grid');
    const peekBtn = wrap.querySelector('#mt-peek');
    const actionBar = wrap.querySelector('#mt-action-bar');
    const coverBtn = wrap.querySelector('#mt-cover-btn');

    function renderDeck(forceReveal = false) {
      grid.innerHTML = '';
      deck.forEach((card) => {
        const btn = document.createElement('button');
        const show = forceReveal || card.flipped || card.matched;
        btn.className = `vg-card ${card.matched ? 'matched' : show ? 'flipped' : ''}`;
        if (show) {
          const colorCls = card.isRed ? 'vg-red' : 'vg-black';
          btn.innerHTML = `
            <div class="vg-poker-num ${colorCls}">${card.num}</div>
            <div class="vg-poker-suit">${card.suit}</div>
          `;
        } else {
          btn.innerHTML = `<div class="vg-back">🃏</div>`;
        }
        btn.onclick = () => onCardClick(card);
        grid.appendChild(btn);
      });
    }

    function onCardClick(card) {
      if (isLocked || card.flipped || card.matched) return;
      GameHub.playTone(540, 0.08, 'sine', 0.15);
      card.flipped = true;
      flippedCards.push(card);
      renderDeck();

      if (flippedCards.length === 1) {
        const need = 10 - card.num;
        GameHub.setAIMessage(`翻到 ${card.num} 了，找找看哪一張加起來等於 10 呢？（需要 ${need}）`, false);
        return;
      }

      if (flippedCards.length === 2) {
        isLocked = true;
        const [a, b] = flippedCards;
        if (a.num + b.num === 10) {
          a.matched = true;
          b.matched = true;
          matchedPairs += 1;
          flippedCards = [];
          GameHub.playSuccess();

          setTimeout(() => {
            if (!wrap.isConnected) return;
            renderDeck();
            isLocked = false;
            if (matchedPairs === pairCount) {
              const praise = GameHub.randomPraise();
              GameHub.setAIMessage(`${praise} 所有湊成 10 的牌都收光光了！`, true);
              GameHub.onRoundComplete(1);
              setTimeout(() => {
                if (!wrap.isConnected) return;
                renderWin(stage, `第 ${tenLevel} 關過關！心算超強！`, praise, () => {
                  tenLevel += 1;
                  playMakeTenRound(stage);
                });
              }, 800);
            } else {
              GameHub.setAIMessage(`水喔！${a.num} 加 ${b.num} 等於 10，收走一對！`, false);
            }
          }, 320);
        } else {
          GameHub.playGentleTryAgain();
          GameHub.setAIMessage(`${a.num} 加 ${b.num} 是 ${a.num + b.num}，差一點點，再試一次看看！`, false);
          setTimeout(() => {
            if (!wrap.isConnected) return;
            a.flipped = false;
            b.flipped = false;
            flippedCards = [];
            renderDeck();
            isLocked = false;
          }, 1000);
        }
      }
    }

    coverBtn.onclick = () => {
      GameHub.playTone(440, 0.12);
      actionBar.style.display = 'none';
      peekBtn.style.display = 'inline-block';
      renderDeck(false);
      isLocked = false;
      if (!hasStarted) {
        hasStarted = true;
        GameHub.setAIMessage('蓋起來囉！現在翻出兩張加起來等於 10 的牌吧！', true);
      } else {
        GameHub.setAIMessage('蓋起來囉！繼續把剩下的牌湊成 10 吧！', true);
      }
    };

    peekBtn.onclick = () => {
      if (isLocked) return;
      isLocked = true;
      peekBtn.style.display = 'none';
      coverBtn.textContent = '✅ 看好了，蓋起來繼續玩！';
      actionBar.style.display = 'flex';
      renderDeck(true);
      GameHub.setAIMessage('慢慢看沒關係，記好了再按下面的綠色按鈕蓋起來喔！', true);
    };

    renderDeck(true);
    GameHub.setAIMessage('請慢慢記住數字在哪裡，記好了再按下面的綠色按鈕蓋起來開始玩喔！', true);
  }
})();
