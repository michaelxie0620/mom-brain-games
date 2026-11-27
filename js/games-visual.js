(() => {
  // 動態注入大字體、大卡片長輩友善樣式
  const oldStyle = document.getElementById('visual-games-style');
  if (oldStyle) oldStyle.remove();

  const style = document.createElement('style');
  style.id = 'visual-games-style';
  style.textContent = `
    .vg-wrap {
      width: 100%;
      max-width: 920px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    .vg-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      flex-wrap: wrap;
      gap: 12px;
    }
    .vg-badge {
      background: #E0F2FE;
      color: #0369A1;
      padding: 10px 22px;
      border-radius: 999px;
      font-size: 26px;
      font-weight: 800;
    }
    .vg-sub-btn {
      background: #FEF3C7;
      color: #92400E;
      border: 3px solid #F59E0B;
      padding: 10px 22px;
      border-radius: 16px;
      font-size: 24px;
      font-weight: 800;
      cursor: pointer;
    }
    .vg-grid {
      display: grid;
      gap: 18px;
      width: 100%;
      justify-items: center;
    }
    .vg-card {
      width: 100%;
      min-height: 190px;
      border-radius: 26px;
      border: 4px solid #93C5FD;
      background: #EFF6FF;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.15s, background 0.2s, border-color 0.2s;
      padding: 14px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
    }
    .vg-grid.dense .vg-card {
      min-height: 150px;
      padding: 10px;
    }
    .vg-card:active { transform: scale(0.96); }
    .vg-card.flipped { background: #FFFFFF; border-color: #2563EB; }
    .vg-card.matched { background: #DCFCE7; border-color: #16A34A; }
    .vg-card.wrong { background: #FEF2F2; border-color: #EF4444; }
    .vg-emoji { font-size: 76px; line-height: 1.1; }
    .vg-grid.dense .vg-emoji { font-size: 62px; }
    .vg-label { font-size: 30px; font-weight: 800; color: #1E293B; margin-top: 8px; }
    .vg-grid.dense .vg-label { font-size: 26px; margin-top: 4px; }
    .vg-back { font-size: 64px; font-weight: 900; color: #2563EB; }
    .vg-grid.dense .vg-back { font-size: 52px; }
    .vg-poker-num { font-size: 72px; font-weight: 900; line-height: 1; }
    .vg-grid.dense .vg-poker-num { font-size: 58px; }
    .vg-poker-suit { font-size: 38px; margin-top: 6px; }
    .vg-grid.dense .vg-poker-suit { font-size: 30px; }
    .vg-red { color: #DC2626; }
    .vg-black { color: #1E293B; }
    .vg-item-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 18px;
      width: 100%;
    }
    .vg-item-pill {
      background: #F8FAFC;
      border: 4px solid #CBD5E1;
      border-radius: 24px;
      padding: 18px 24px;
      min-width: 155px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .vg-item-pill .vg-emoji { font-size: 68px; }
    .vg-item-pill .vg-label { font-size: 28px; }
    .vg-action-bar { width: 100%; display: flex; justify-content: center; margin-top: 8px; }
    .vg-win-box { text-align: center; padding: 24px; animation: vgPop 0.35s ease; }
    .vg-win-emoji { font-size: 90px; margin-bottom: 12px; }
    .vg-win-title { font-size: 38px; font-weight: 900; color: #15803D; margin: 0 0 14px 0; }
    @keyframes vgPop { 0% { transform: scale(0.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
  `;
  document.head.appendChild(style);

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
        <p style="font-size:28px; color:#475569; margin:0 0 28px 0;">${subText}</p>
        <div>
          <button class="btn-big green" id="vg-btn-next">👉 玩下一關</button>
          <button class="btn-big" style="background:#475569;" onclick="GameHub.goHome()">🏠 回首頁</button>
        </div>
      </div>
    `;
    document.getElementById('vg-btn-next').onclick = onNext;
  }

  // =========================================================================
  // 遊戲 1：翻牌配對（超大牌面 + 全程語音回饋 + 翻錯慢速停留提醒）
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
      matched: false,
      wrong: false
    }));

    let flippedCards = [];
    let isLocked = true;
    let matchedPairs = 0;
    let hasStarted = false;

    const cols = pairCount === 3 ? 3 : 4;
    const isDense = pairCount >= 6;
    const wrap = document.createElement('div');
    wrap.className = 'vg-wrap';
    wrap.innerHTML = `
      <div class="vg-header">
        <span class="vg-badge">第 ${memoryLevel} 關｜${theme.name}（${pairCount} 對）</span>
        <button class="vg-sub-btn" id="mm-peek" style="display:none;">👀 偷看一下</button>
      </div>
      <div class="vg-grid ${isDense ? 'dense' : ''}" id="mm-grid" style="grid-template-columns: repeat(${cols}, 1fr);"></div>
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
        const stateCls = card.matched ? 'matched' : card.wrong ? 'wrong' : show ? 'flipped' : '';
        btn.className = `vg-card ${stateCls}`;
        btn.innerHTML = show
          ? `<div class="vg-emoji">${card.emoji}</div><div class="vg-label">${card.label}</div>`
          : `<div class="vg-back">？</div>`;
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
          renderDeck();

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
            }, 1600);
          } else {
            GameHub.setAIMessage(`水喔！找到「${a.label}」了，繼續找下一對！`, true);
            setTimeout(() => {
              if (!wrap.isConnected) return;
              isLocked = false;
            }, 400);
          }
        } else {
          // 翻錯時亮紅框，停留 2.8 秒並語音引導
          a.wrong = true;
          b.wrong = true;
          renderDeck();
          GameHub.playGentleTryAgain();
          GameHub.setAIMessage(`翻到「${a.label}」和「${b.label}」，不一樣喔，看清楚位置再試一次！`, true);
          setTimeout(() => {
            if (!wrap.isConnected) return;
            a.flipped = false;
            b.flipped = false;
            a.wrong = false;
            b.wrong = false;
            flippedCards = [];
            renderDeck();
            isLocked = false;
          }, 2800);
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
        GameHub.setAIMessage('蓋起來囉！現在請翻開兩張一樣的圖案配對吧！', true);
      } else {
        GameHub.setAIMessage('蓋起來囉！我們繼續把剩下的找出來！', true);
      }
    };

    peekBtn.onclick = () => {
      if (isLocked) return;
      isLocked = true;
      peekBtn.style.display = 'none';
      coverBtn.textContent = '✅ 看好了，蓋起來繼續玩！';
      actionBar.style.display = 'flex';
      renderDeck(true);
      GameHub.setAIMessage('慢慢看沒關係，記起來了再按下面的綠色按鈕蓋起來喔！', true);
    };

    renderDeck(true);
    GameHub.setAIMessage(`第 ${memoryLevel} 關！請慢慢記住圖案的位置，記好了再按下面的綠色按鈕蓋起來喔！`, true);
  }

  // =========================================================================
  // 遊戲 2：少了哪一樣（超大圖示 + 全程語音提示）
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
        <p style="font-size:28px; font-weight:800; color:#1E3A8A; margin:10px 0 2px 0;">請問少了下面哪一樣？</p>
        <div class="vg-grid dense" style="grid-template-columns: repeat(2, 1fr); max-width:680px;" id="wm-opts"></div>
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
            }, 1400);
          } else {
            GameHub.playGentleTryAgain();
            btn.classList.add('wrong');
            btn.style.opacity = '0.5';
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
  // 遊戲 3：幫 AI 買菜（大格攤位 + 每買一樣都有語音稱讚）
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
        <p style="font-size:28px; font-weight:800; margin:4px 0;">請幫忙記住這 ${targetCount} 樣食材：</p>
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
        <div class="vg-grid dense" style="grid-template-columns: repeat(3, 1fr);" id="gs-grid"></div>
      `;

      wrap.querySelector('#gs-peek').onclick = () => {
        const names = targets.map((t) => t.label).join('、');
        GameHub.showToast(`菜單是：${names}`, 4000);
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
              }, 1500);
            } else {
              GameHub.setAIMessage(`買到「${item.label}」了！還差 ${targetCount - bought.size} 樣喔！`, true);
            }
          } else {
            GameHub.playGentleTryAgain();
            btn.className = 'vg-card wrong';
            GameHub.setAIMessage(`今天做${recipe.dish}不需要「${item.label}」喔，再找找看！`, true);
            setTimeout(() => {
              if (btn.isConnected && !bought.has(item.label)) {
                btn.className = 'vg-card flipped';
              }
            }, 1500);
          }
        };
        grid.appendChild(btn);
      });

      GameHub.setAIMessage(`到市場囉！請把剛才要做「${recipe.dish}」的 ${targetCount} 樣東西點出來！`, true);
    }

    showMemoPhase();
  }

  // =========================================================================
  // 遊戲 4：簡易撿紅點（超大撲克牌 + 全程語音引導 + 翻錯停留 2.8 秒）
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
      matched: false,
      wrong: false
    }));

    let flippedCards = [];
    let isLocked = true;
    let matchedPairs = 0;
    let hasStarted = false;

    const cols = pairCount === 3 ? 3 : 4;
    const isDense = pairCount >= 5;
    const wrap = document.createElement('div');
    wrap.className = 'vg-wrap';
    wrap.innerHTML = `
      <div class="vg-header">
        <span class="vg-badge">第 ${tenLevel} 關｜兩張加起來等於 10</span>
        <button class="vg-sub-btn" id="mt-peek" style="display:none;">👀 偷看一下</button>
      </div>
      <div class="vg-grid ${isDense ? 'dense' : ''}" id="mt-grid" style="grid-template-columns: repeat(${cols}, 1fr);"></div>
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
        const stateCls = card.matched ? 'matched' : card.wrong ? 'wrong' : show ? 'flipped' : '';
        btn.className = `vg-card ${stateCls}`;
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
        GameHub.setAIMessage(`翻到 ${card.num} 了，找找看哪一張是 ${need} 湊成 10 呢？`, true);
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
          renderDeck();

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
            }, 1600);
          } else {
            GameHub.setAIMessage(`水喔！${a.num} 加 ${b.num} 等於 10，收走一對！`, true);
            setTimeout(() => {
              if (!wrap.isConnected) return;
              isLocked = false;
            }, 400);
          }
        } else {
          a.wrong = true;
          b.wrong = true;
          renderDeck();
          GameHub.playGentleTryAgain();
          GameHub.setAIMessage(`${a.num} 加 ${b.num} 是 ${a.num + b.num}，還沒湊到 10 喔，看清楚位置再試一次！`, true);
          setTimeout(() => {
            if (!wrap.isConnected) return;
            a.flipped = false;
            b.flipped = false;
            a.wrong = false;
            b.wrong = false;
            flippedCards = [];
            renderDeck();
            isLocked = false;
          }, 2800);
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
