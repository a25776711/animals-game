(function () {
  'use strict';

  var L = window.TurtleLogic;
  var P = window.TurtleProgress;
  var E = window.TurtleEconomy;
  var Cloud = window.Cloud;
  var Sound = window.TurtleSound;
  var Fx = window.TurtleFx;

  var COLORS = [
    { id: 0, name: '綠',   img: 'img/turtle-green.png' },
    { id: 1, name: '淺藍', img: 'img/turtle-lightblue.png' },
    { id: 2, name: '藍',   img: 'img/turtle-blue.png' },
    { id: 3, name: '紫',   img: 'img/turtle-purple.png' },
    { id: 4, name: '桃',   img: 'img/turtle-pink.png' },
    { id: 5, name: '紅',   img: 'img/turtle-red.png' },
    { id: 6, name: '橘',   img: 'img/turtle-orange.png' },
    { id: 7, name: '橘黃', img: 'img/turtle-amber.png' },
    { id: 8, name: '黃',   img: 'img/turtle-yellow.png' }
  ];
  var PACK_OPTIONS = [
    { packs: 10, hint: '約 5 回合' },
    { packs: 20, hint: '約 11 回合' },
    { packs: 50, hint: '約 30 回合' }
  ];
  var HUB_GAMES = [
    { id: 'race', name: '烏龜賽跑', desc: '押一隻烏龜，賠率最高 16 倍' },
    { id: 'bj', name: '21 點', desc: '跟莊家比點數，Blackjack 賠 6:5' },
    { id: 'mem', name: '翻牌記憶', desc: '報名 50 隻烏龜，步數越少獎勵越多' },
    { id: 'gacha', name: '抽卡圖鑑', desc: '抽 4 種稀有度的烏龜卡，集滿 36 種' },
    { id: 'pet', name: '養龜', desc: '餵小龜長大，替牠換顏色、戴帽子' },
    { id: 'shop', name: '裝飾商店', desc: '買背景、棋盤花紋和小龜的配件' },
    { id: 'chat', name: '聊天室', desc: '跟所有玩家聊天，要先登入 Google 並取一個暱稱' }
  ];
  var BACK = { start: 'title', hub: 'title', supply: 'title', race: 'hub', bj: 'hub', mem: 'hub', gacha: 'hub', pet: 'hub', shop: 'hub', chat: 'hub' };

  var THEME_KEY = 'turtle.theme';
  var LUCKY_KEY = 'turtle.lucky';
  var SESSION_KEY = 'turtle.session';
  var SYNC_KEY = 'turtle.sync';
  var MS = { open: 260, lucky: 900, match: 900, clear: 380 };
  var CLOUD_SAVE_DELAY = 3000;
  var CLOUD_RETRY_DELAY = 15000;
  var TYPE_NAME = { pair: '碰', line: '連線', family: '全家福' };

  var $ = function (id) { return document.getElementById(id); };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var screens = {};
  document.querySelectorAll('.screen').forEach(function (s) {
    screens[s.id.replace(/Screen$/, '')] = s;
  });
  var backBtn = $('backBtn');
  var board = $('board');
  var spinBtn = $('spinBtn');
  var cashOutBtn = $('cashOutBtn');
  var message = $('message');

  var profile = P.load();
  var game = null;
  var phase = 'title';
  var returnTo = 'title';
  var busy = false;
  var modBusy = false;
  var cells = [];
  var lucky = loadLucky();
  var ui = {};

  var account = null;
  var cloudReady = false;
  var syncing = false;
  var syncText = '';
  var cloudTimer = null;
  var cloudRetry = null;

  function loadLucky() {
    try {
      var v = parseInt(localStorage.getItem(LUCKY_KEY), 10);
      if (v >= 0 && v < COLORS.length) return v;
    } catch (e) {}
    return 0;
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function fmt(n) { return Number(n).toLocaleString('en-US'); }

  function fx(name, a, b) { if (Fx) Fx.play(name, a, b); }

  /* 通用元件 */

  function toastText(text, silent) {
    var t = el('div', 'toast', text);
    $('toasts').appendChild(t);
    if (!silent) fx('toast');
    setTimeout(function () { t.remove(); }, 3400);
  }

  function toast(def) {
    toastText('解鎖成就：' + def.name, true);
    fx('unlock');
  }

  function notify(unlocked) {
    unlocked.forEach(function (d) {
      if (game) game.unlocked.push(d);
      toast(d);
    });
  }

  function openModal(opts) {
    var overlay = el('div', 'modal');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', opts.label || '');
    var card = el('div', 'modal-card');
    overlay.appendChild(card);

    function close() {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      if (opts.onClose) opts.onClose();
    }
    function onKey(e) { if (e.key === 'Escape' && !opts.locked) close(); }
    if (!opts.locked) overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    fx('open');
    return { card: card, close: close };
  }

  /* 錢包 */

  function walletPill(kind) {
    var pill = el('div', 'wallet-pill');
    pill.setAttribute('data-kind', kind);
    if (kind === 'money') {
      pill.appendChild(el('span', 'coin-icon'));
    } else {
      var img = el('img');
      img.src = COLORS[0].img;
      img.alt = '';
      pill.appendChild(img);
    }
    pill.appendChild(el('b', null, '0'));
    pill.appendChild(el('small', null, kind === 'money' ? '錢' : '隻烏龜'));
    return pill;
  }

  function walletRow(kinds) {
    var row = el('div', 'wallet-row');
    kinds.forEach(function (k) { row.appendChild(walletPill(k)); });
    return row;
  }

  function refreshWallets() {
    document.querySelectorAll('.wallet-pill').forEach(function (p) {
      p.querySelector('b').textContent = fmt(profile.wallet[p.getAttribute('data-kind')]);
    });
    updatePackRows();
  }

  function fillWalletRows() {
    document.querySelectorAll('.wallet-row[data-kinds]').forEach(function (row) {
      row.getAttribute('data-kinds').split(',').forEach(function (k) { row.appendChild(walletPill(k)); });
      row.removeAttribute('data-kinds');
    });
  }

  function supplyReady() {
    return E.dailyStatus(profile, Date.now()).slots.some(function (s) { return s.state === 'ready'; });
  }

  function updateSupplyDot() {
    $('supplyDot').classList.toggle('hidden', !supplyReady());
  }

  /* 導覽 */

  function show(name) {
    if (phase === 'chat' && name !== 'chat' && ui.chat) ui.chat.leave();
    phase = name;
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle('active', k === name);
    });
    backBtn.classList.toggle('hidden', name === 'title' || name === 'result');
    if (name === 'ach') renderAchievements();
    if (name === 'title') updateSupplyDot();
    if (name === 'hub') updateHubDots();
    refreshWallets();
    if (Fx) Fx.scene(name);
    fx(name === 'shop' ? 'shopBell' : 'nav');
    armHint();
  }

  function record(kind, data) {
    var unlocked = P.record(profile, kind, data, Date.now());
    persist();
    refreshWallets();
    notify(unlocked);
  }

  function persist() {
    P.save(profile);
    scheduleCloudSave();
  }

  /* 雲端存檔 */

  function renderAccount() {
    updateAchNote();
    document.querySelectorAll('.account').forEach(function (bar) {
      if (!Cloud || !Cloud.enabled) { bar.classList.add('hidden'); return; }
      bar.classList.remove('hidden');
      bar.innerHTML = '';
      var status = el('span', 'status');
      var btn = el('button', 'btn');
      btn.type = 'button';
      if (account) {
        status.textContent = account.name + (syncText ? '・' + syncText : '');
        btn.textContent = '登出';
        btn.addEventListener('click', onSignOut);
      } else {
        status.textContent = '進度只存在這台裝置' + (syncText ? '・' + syncText : '');
        btn.textContent = '使用 Google 登入';
        btn.addEventListener('click', onSignIn);
      }
      bar.appendChild(status);
      bar.appendChild(btn);
    });
  }

  function onSignIn() {
    syncText = '登入中…';
    renderAccount();
    Cloud.signIn().catch(function (e) {
      var code = e && e.code;
      syncText = code === 'auth/popup-closed-by-user' ? ''
        : code === 'auth/unauthorized-domain' ? '此網址尚未加入授權網域'
        : '登入失敗';
      renderAccount();
    });
  }

  function onSignOut() {
    flushCloud().then(function () { return Cloud.signOut(); });
  }

  function loadBase(uid) {
    try {
      var s = JSON.parse(localStorage.getItem(SYNC_KEY));
      if (s && s.uid === uid && isFinite(s.rev)) return s.rev;
    } catch (e) {}
    return null;
  }

  function saveBase(uid, rev) {
    try { localStorage.setItem(SYNC_KEY, JSON.stringify({ uid: uid, rev: rev })); } catch (e) {}
  }

  function summaryColumn(title, p) {
    var s = P.summary(p);
    var col = el('div');
    col.appendChild(el('b', null, title));
    [
      ['錢', fmt(s.money)],
      ['烏龜', fmt(s.turtles)],
      ['成就', s.achievements + '/' + P.DEFS.length],
      ['累計開包', fmt(s.opened)],
      ['卡片', s.cards + '/36'],
      ['更新', s.updatedAt ? new Date(s.updatedAt).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—']
    ].forEach(function (r) {
      var line = el('span');
      line.appendChild(el('span', null, r[0]));
      line.appendChild(el('span', null, r[1]));
      col.appendChild(line);
    });
    return col;
  }

  function askConflict(local, remote) {
    return new Promise(function (resolve) {
      var m = openModal({ label: '進度不一致', locked: true });
      var card = m.card;
      card.appendChild(el('h3', null, '進度不一致'));
      card.appendChild(el('p', null, '這台裝置和雲端的進度不一樣，請選擇要用哪一份：'));

      var compare = el('div', 'compare');
      compare.appendChild(summaryColumn('這台裝置', local));
      compare.appendChild(summaryColumn('雲端', remote));
      card.appendChild(compare);

      var keepLabel = el('label', 'keep-ach');
      var keep = el('input');
      keep.type = 'checkbox';
      keep.checked = true;
      keepLabel.appendChild(keep);
      keepLabel.appendChild(document.createTextNode(' 也保留另一邊的成就（兩邊聯集）'));
      card.appendChild(keepLabel);

      function finish(value) {
        m.close();
        resolve(value);
      }

      var first = null;
      [
        ['local', '用這台裝置的', '雲端那份會被覆蓋'],
        ['cloud', '用雲端的', '這台的錢、烏龜、卡片會被換掉']
      ].forEach(function (c) {
        var b = el('button', 'btn choice ' + (c[0] === 'local' ? 'local' : 'cloud'));
        b.type = 'button';
        b.appendChild(document.createTextNode(c[1]));
        b.appendChild(el('small', null, c[2]));
        b.addEventListener('click', function () { finish({ side: c[0], keepAchievements: keep.checked }); });
        card.appendChild(b);
        if (!first) first = b;
      });

      var cancel = el('button', 'linkbtn', '取消登入');
      cancel.type = 'button';
      cancel.addEventListener('click', function () { finish(null); });
      card.appendChild(cancel);
      first.focus();
    });
  }

  function chooseProfile(remote, base) {
    var decision = P.decideSync(profile, remote, base);
    if (decision === 'ask') {
      return askConflict(profile, remote).then(function (c) {
        return c ? P.resolve(profile, remote, c.side, c.keepAchievements, Date.now()) : null;
      });
    }
    if (decision === 'download') return Promise.resolve(P.resolve(profile, remote, 'cloud', true, Date.now()));
    return Promise.resolve(profile);
  }

  function giftDialog() {
    var m = openModal({ label: '首次登入禮' });
    m.card.appendChild(el('h3', null, '首次登入禮'));
    m.card.appendChild(el('p', null, '歡迎！送你 ' + E.CFG.firstLoginMoney + ' 錢，可以玩 ' + (E.CFG.firstLoginMoney / 50) + ' 次 50 包。'));
    var ok = el('button', 'btn choice merge', '太好了');
    ok.type = 'button';
    ok.addEventListener('click', m.close);
    m.card.appendChild(ok);
    ok.focus();
  }

  var syncRetries = 0;

  function failText(e, base) {
    var code = e && e.code ? '（' + e.code + '）' : '';
    return e && e.code === 'unavailable' ? base + code + '：連不上雲端，可能被瀏覽器或廣告攔截擋住' : base + code;
  }

  function syncFromCloud() {
    if (syncing) return Promise.resolve();
    syncing = true;
    syncText = '同步中…';
    renderAccount();
    var uid = account.uid;
    return Cloud.loadProfile().then(function (raw) {
      return chooseProfile(raw ? P.normalize(raw) : null, loadBase(uid));
    }).then(function (chosen) {
      if (!chosen) {
        syncText = '';
        return Cloud.signOut();
      }
      profile = chosen;
      var gift = E.grantFirstLogin(profile, Date.now());
      P.save(profile);
      refreshWallets();
      applySkin();
      if (gift) giftDialog();
      var rev = profile.rev;
      return Cloud.saveProfile(profile).then(function () {
        saveBase(uid, rev);
        cloudReady = true;
        syncRetries = 0;
        syncText = '已同步';
        renderAccount();
        if (phase === 'ach') renderAchievements();
      });
    }).catch(function (e) {
      syncText = failText(e, '同步失敗');
      renderAccount();
      if (syncRetries++ < 3) {
        clearTimeout(cloudRetry);
        cloudRetry = setTimeout(function () { if (account && !cloudReady) syncFromCloud(); }, CLOUD_RETRY_DELAY);
      }
    }).then(function () { syncing = false; });
  }

  function scheduleCloudSave() {
    if (!account || !cloudReady) return;
    clearTimeout(cloudTimer);
    cloudTimer = setTimeout(flushCloud, CLOUD_SAVE_DELAY);
  }

  function flushCloud() {
    clearTimeout(cloudTimer);
    if (!account || !cloudReady) return Promise.resolve();
    var who = account;
    var rev = profile.rev;
    return Cloud.saveProfile(profile).then(function () {
      clearTimeout(cloudRetry);
      saveBase(who.uid, rev);
      if (account === who) { syncText = '已同步'; renderAccount(); }
    }).catch(function (e) {
      if (account !== who) return;
      syncText = failText(e, '同步失敗，稍後重試');
      renderAccount();
      clearTimeout(cloudRetry);
      cloudRetry = setTimeout(flushCloud, CLOUD_RETRY_DELAY);
    });
  }

  /* 畫面 */

  function buildBoard() {
    board.innerHTML = '';
    cells = [];
    for (var i = 0; i < L.SIZE; i++) {
      var c = el('div', 'cell');
      c.setAttribute('role', 'gridcell');
      board.appendChild(c);
      cells.push(c);
    }
  }

  function renderCell(i, color, cls) {
    var c = cells[i];
    c.className = 'cell';
    c.innerHTML = '';
    if (color == null) return;
    var img = el('img', 'icon');
    img.src = COLORS[color].img;
    img.alt = COLORS[color].name + '色烏龜';
    c.appendChild(img);
    c.appendChild(el('small', 'color-label', COLORS[color].name));
    if (cls) c.classList.add(cls);
  }

  function renderHud() {
    $('packCount').textContent = game.packs;
    $('roundCount').textContent = game.rounds;
    if (Fx && phase === 'play') Fx.mood(!game.finished && game.packs > 0 && game.packs <= 5 ? 'playLow' : null);
  }

  function updateSpinLabel() {
    var n = Math.min(L.emptyIndexes(game.grid).length, game.packs);
    spinBtn.textContent = '開包（-' + n + ' 包）';
  }

  function announce(text, kind) {
    message.className = 'message ' + (kind || '');
    message.textContent = text;
    void message.offsetWidth;
    message.classList.add('flash');
  }

  function updateAchNote() {
    $('achNote').textContent = account ? '成就已同步到你的 Google 帳號'
      : Cloud && Cloud.enabled ? '成就存在這台裝置，登入 Google 可同步到雲端'
      : '成就存在這台裝置的瀏覽器裡，清除瀏覽器資料會消失';
  }

  function renderAchievements() {
    var done = P.DEFS.filter(function (d) { return profile.achievements[d.id]; }).length;
    $('achTitle').textContent = '成就 ' + done + '/' + P.DEFS.length;
    updateAchNote();
    var list = $('achList');
    list.innerHTML = '';
    P.DEFS.forEach(function (d) {
      var got = !!profile.achievements[d.id];
      var v = Math.min(P.value(profile, d), d.target);

      var card = el('div', 'ach ' + (got ? 'done' : 'locked'));
      var body = el('div');
      body.appendChild(el('div', 'ach-name', d.name + (got ? ' ✓' : '')));
      body.appendChild(el('div', 'ach-desc', d.desc + (got ? '' : '（' + v + '/' + d.target + '）')));
      if (!got) {
        var bar = el('div', 'ach-bar');
        var fill = el('i');
        fill.style.width = Math.round(v / d.target * 100) + '%';
        bar.appendChild(fill);
        body.appendChild(bar);
      }
      card.appendChild(window.TurtleUICommon.icon('award', 'ach-icon'));
      card.appendChild(body);
      list.appendChild(card);
    });
  }

  /* 遊戲流程 */

  function saveSession() {
    if (!game || game.finished) return;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        packs: game.packs, rounds: game.rounds, opened: game.opened, gained: game.gained
      }));
    } catch (e) {}
  }

  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  function settleAbandoned() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) {}
    if (!s) return;
    clearSession();
    var packs = Math.max(0, Math.floor(Number(s.packs) || 0));
    var now = Date.now();
    E.refundPacks(profile, packs, now);
    if (Number(s.rounds) > 0) P.record(profile, 'end', { rounds: Number(s.rounds), gained: Number(s.gained) || 0 }, now);
    P.save(profile);
    toastText('上次沒結算的遊戲已自動結算' + (packs ? '，退還 ' + packs + ' 錢' : ''));
  }

  function startGame(packs) {
    if (!E.buyPacks(profile, packs, Date.now())) {
      toastText('錢不夠，去補給站領一些吧');
      return;
    }
    game = {
      start: packs, packs: packs, rounds: 0, opened: 0, gained: 0,
      grid: L.emptyGrid(), lucky: lucky, finished: false, unlocked: [],
      counts: { pair: 0, line: 0, family: 0, lucky: 0 }
    };
    persist();
    saveSession();
    buildBoard();
    renderHud();
    $('luckyImg').src = COLORS[lucky].img;
    $('luckyImg').alt = '幸運色：' + COLORS[lucky].name;
    announce('按「開包」開始！');
    updateSpinLabel();
    spinBtn.disabled = false;
    cashOutBtn.disabled = false;
    busy = false;
    record('start', { lucky: lucky });
    show('play');
  }

  async function playRound() {
    if (busy || !game || game.finished) return;
    var empties = L.emptyIndexes(game.grid);
    if (!empties.length || game.packs <= 0) return;

    busy = true;
    spinBtn.disabled = true;
    cashOutBtn.disabled = true;

    for (var k = 0; k < empties.length; k++) {
      if (game.packs <= 0) break;
      var i = empties[k];
      var color = L.drawColor(COLORS.length);
      game.packs--;
      game.opened++;
      game.grid[i] = color;
      renderCell(i, color, 'pop');
      fx('pop', k);
      renderHud();
      record('open');
      saveSession();
      announce('開包中 ' + (k + 1) + '/' + empties.length);
      await wait(MS.open);

      if (color === game.lucky) {
        game.packs++;
        game.gained++;
        game.counts.lucky++;
        cells[i].classList.add('lucky');
        renderHud();
        record('lucky');
        saveSession();
        announce('幸運色！+1 包', 'lucky');
        fx('lucky');
        await Promise.all([wait(MS.lucky), Sound.play('lucky')]);
      }
    }

    game.rounds++;
    renderHud();
    var events = L.resolveAll(game.grid);

    if (!events.length) {
      announce('沒有配對…');
      await wait(MS.clear);
    }

    for (var n = 0; n < events.length; n++) {
      var ev = events[n];
      var label = TYPE_NAME[ev.type];
      if (ev.type !== 'family') label += '・' + COLORS[game.grid[ev.cells[0]]].name;
      ev.cells.forEach(function (c) { cells[c].classList.add('match'); });
      announce(label + '！+' + ev.packs + ' 包', ev.type);
      fx(ev.type);
      await Promise.all([wait(MS.match), Sound.play(ev.type)]);

      ev.cells.forEach(function (c) { cells[c].classList.add('clearing'); });
      fx('clear');
      await wait(MS.clear);

      ev.cells.forEach(function (c) { game.grid[c] = null; renderCell(c, null); });
      game.packs += ev.packs;
      game.gained += ev.packs;
      game.counts[ev.type]++;
      renderHud();
      record('match', { type: ev.type });
      saveSession();
    }
    record('round', { chain: events.length });

    busy = false;
    if (game.packs <= 0 && L.emptyIndexes(game.grid).length) {
      finishGame();
      return;
    }
    updateSpinLabel();
    spinBtn.disabled = false;
    cashOutBtn.disabled = false;
  }

  function finishGame() {
    if (!game || game.finished) return;
    game.finished = true;
    var ranOut = game.packs <= 0;
    var refund = game.packs;
    var now = Date.now();
    if (refund > 0) E.refundPacks(profile, refund, now);
    if (game.rounds > 0) record('end', { rounds: game.rounds, gained: game.gained });
    else persist();
    clearSession();
    refreshWallets();
    flushCloud();

    var c = game.counts;
    $('resultTitle').textContent = ranOut ? '包數用完了！' : '本局結算';
    $('resTurtles').textContent = '+' + fmt(game.opened) + '（共 ' + fmt(profile.wallet.turtles) + '）';
    $('resRefund').textContent = refund > 0 ? '+' + fmt(refund) : '0';
    $('resGained').textContent = '+' + game.gained;
    $('resRounds').textContent = game.rounds + ' / ' + game.opened;
    $('resMatches').textContent = c.pair + ' / ' + c.line;
    $('resBonus').textContent = c.family + ' / ' + c.lucky;

    var resAch = $('resAch');
    resAch.innerHTML = '';
    resAch.classList.toggle('hidden', !game.unlocked.length);
    if (game.unlocked.length) {
      resAch.appendChild(el('b', null, '本局解鎖成就'));
      game.unlocked.forEach(function (d) {
        resAch.appendChild(el('div', null, d.name + '：' + d.desc));
      });
    }

    fx(game.rounds > 0 ? 'win' : 'push');
    setTimeout(function () { show('result'); }, 600);
  }

  function confirmLeave() {
    var m = openModal({ label: '離開遊戲' });
    m.card.appendChild(el('h3', null, '離開這局？'));
    m.card.appendChild(el('p', null, '離開會直接結算，剩下的 ' + game.packs + ' 包會退還成錢。'));
    var stay = el('button', 'btn choice merge', '繼續玩');
    stay.type = 'button';
    stay.addEventListener('click', m.close);
    var leave = el('button', 'btn choice cloud', '結算並離開');
    leave.type = 'button';
    leave.addEventListener('click', function () { m.close(); finishGame(); });
    m.card.appendChild(stay);
    m.card.appendChild(leave);
    stay.focus();
  }

  /* 開局頁 */

  function buildLuckyPicker() {
    var wrap = $('luckyPicker');
    COLORS.forEach(function (c) {
      var b = el('button', 'lucky-opt');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', c.name + '色');
      b.setAttribute('aria-checked', String(c.id === lucky));
      var img = el('img');
      img.src = c.img;
      img.alt = '';
      b.appendChild(img);
      b.appendChild(el('small', 'color-label', c.name));
      b.addEventListener('click', function () {
        lucky = c.id;
        try { localStorage.setItem(LUCKY_KEY, String(lucky)); } catch (e) {}
        wrap.querySelectorAll('.lucky-opt').forEach(function (o, idx) {
          o.setAttribute('aria-checked', String(idx === lucky));
        });
      });
      wrap.appendChild(b);
    });
  }

  var packRows = [];
  var startSupplyBtn = null;

  function buildPackButtons() {
    var wrap = $('packOptions');
    PACK_OPTIONS.forEach(function (o) {
      var b = el('button', 'btn pack-row');
      b.type = 'button';
      b.setAttribute('role', 'listitem');
      b.appendChild(el('span', null, o.packs + ' 包'));
      b.appendChild(el('small', null, '花 ' + o.packs + ' 錢・' + o.hint));
      b.addEventListener('click', function () { startGame(o.packs); });
      wrap.appendChild(b);
      packRows.push({ el: b, packs: o.packs });
    });
    startSupplyBtn = el('button', 'btn secondary hidden', '去補給站');
    startSupplyBtn.type = 'button';
    startSupplyBtn.addEventListener('click', function () { ui.supply.open(); });
    screens.start.appendChild(startSupplyBtn);
  }

  function updatePackRows() {
    if (!packRows.length) return;
    var money = profile.wallet.money;
    packRows.forEach(function (r) { r.el.disabled = money < r.packs; });
    var broke = money < PACK_OPTIONS[0].packs;
    $('startNote').textContent = broke
      ? '錢不夠了，補給站每天有三次補給'
      : '一包 = 一錢。碰 +1・連線 +3・全家福 +5・幸運色 +1';
    startSupplyBtn.classList.toggle('hidden', !broke);
  }

  /* 設定 */

  function applySkin() {
    document.documentElement.setAttribute('data-skin', profile.shop.theme);
    board.setAttribute('data-board', profile.shop.board);
  }

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#182920' : '#eeeadd');
  }

  function segmented(label, options, current, onPick) {
    var row = el('div', 'setting');
    var head = el('div', 'setting-head');
    head.appendChild(el('span', null, label));

    var seg = el('div', 'seg');
    seg.setAttribute('role', 'radiogroup');
    seg.setAttribute('aria-label', label);
    options.forEach(function (o) {
      var b = el('button', null, o.text);
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(o.value === current));
      b.addEventListener('click', function () {
        seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
        onPick(o.value);
      });
      seg.appendChild(b);
    });

    row.appendChild(head);
    row.appendChild(seg);
    return row;
  }

  function volumeRow(label, get, set, preview) {
    var row = el('div', 'setting');
    var head = el('div', 'setting-head');
    head.appendChild(el('span', null, label));
    var value = el('span');
    head.appendChild(value);
    var slider = el('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.step = '5';
    slider.value = String(Math.round(get() * 100));
    slider.setAttribute('aria-label', label);
    function showValue() { value.textContent = Number(slider.value) === 0 ? '靜音' : slider.value + '%'; }
    showValue();
    slider.addEventListener('input', function () { set(Number(slider.value) / 100); showValue(); });
    slider.addEventListener('change', preview);
    row.appendChild(head);
    row.appendChild(slider);
    return row;
  }

  function reportLink() {
    var url = window.ReportConfig && window.ReportConfig.url;
    if (!/^(https:\/\/|mailto:)/.test(url || '')) return null;
    var a = el('a', 'linkbtn report-link', '回報問題或提供建議');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }

  function openSettings() {
    if (document.querySelector('.modal')) return;
    var m = openModal({ label: '設定', onClose: function () { $('settingsBtn').focus(); } });
    var card = m.card;
    card.appendChild(el('h3', null, '設定'));

    card.appendChild(volumeRow('總音量', Sound.getVolume, Sound.setVolume, function () { Sound.play('pair'); }));
    if (Fx) {
      card.appendChild(volumeRow('音效', Fx.getSfxVolume, Fx.setSfxVolume, function () { Fx.play('pop', 3); }));
      card.appendChild(volumeRow('背景音樂', Fx.getMusicVolume, Fx.setMusicVolume, function () {}));
    }

    card.appendChild(segmented('語音語種',
      Sound.VOICE_SETS.map(function (s) { return { value: s.id, text: s.name }; }),
      Sound.getVoiceSet(),
      function (id) { Sound.setVoiceSet(id).then(function () { Sound.play('pair'); }); }));

    card.appendChild(segmented('明暗',
      [{ value: 'light', text: '淺色' }, { value: 'dark', text: '深色' }],
      document.documentElement.getAttribute('data-theme'),
      function (t) {
        applyTheme(t);
        try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
      }));

    var report = reportLink();
    if (report) card.appendChild(report);

    var done = el('button', 'btn choice merge', '完成');
    done.type = 'button';
    done.addEventListener('click', m.close);
    card.appendChild(done);
    done.focus();
  }

  /* 小遊戲大廳 */

  function buildHub() {
    var list = $('hubList');
    HUB_GAMES.forEach(function (g) {
      var b = el('button', 'btn hub-card');
      b.type = 'button';
      b.appendChild(window.TurtleUICommon.icon(g.id, 'hub-icon'));
      b.setAttribute('data-destination', g.id);
      var text = el('div');
      text.appendChild(el('b', null, g.name));
      text.appendChild(el('small', null, g.desc));
      b.appendChild(text);
      b.appendChild(el('i', 'dot hub-dot hidden'));
      b.addEventListener('click', function () { ui[g.id].open(); });
      list.appendChild(b);
    });
  }

  /* 提示：還有沒做完或可以玩的東西 */

  var HINT_FIRST = 14000;
  var HINT_REPEAT = 30000;
  var HINT_MAX = 3;
  var hintTimer = null;
  var hintCount = 0;

  function petHungry() {
    var Pet = window.TurtlePet;
    var pet = profile.pet;
    if (!Pet || !pet || !pet.since) return false;
    var cost = Pet.feedCost(P.petLevelInfo(pet.xp).level);
    return Pet.fullnessNow(pet, E.clock(profile, Date.now())) < 40 && profile.wallet.turtles >= cost;
  }

  function updateHubDots() {
    var dot = document.querySelector('[data-destination="pet"] .hub-dot');
    if (dot) dot.classList.toggle('hidden', !petHungry());
  }

  function visible(node) { return node && !node.disabled && node.offsetParent !== null ? node : null; }

  function hintTarget() {
    if (document.querySelector('.modal') || busy || modBusy) return null;
    if (phase === 'title') return visible(supplyReady() ? $('supplyBtn') : document.querySelector('#titleScreen .tap-hint'));
    if (phase === 'start') {
      for (var i = packRows.length - 1; i >= 0; i--) if (visible(packRows[i].el)) return packRows[i].el;
      return visible(startSupplyBtn);
    }
    if (phase === 'play') return visible(spinBtn);
    if (phase === 'result') return visible($('againBtn'));
    if (phase === 'hub') return petHungry() ? visible(document.querySelector('[data-destination="pet"]')) : null;
    if (BACK[phase] === 'hub') return visible(document.querySelector('#' + phase + 'Screen .btn.primary'));
    return null;
  }

  function clearNudge() {
    document.querySelectorAll('.nudge').forEach(function (n) { n.classList.remove('nudge'); });
  }

  function fireHint() {
    var target = document.hidden ? null : hintTarget();
    if (target) {
      hintCount++;
      target.classList.add('nudge');
      fx('hint');
    }
    if (hintCount < HINT_MAX) hintTimer = setTimeout(fireHint, HINT_REPEAT);
  }

  function armHint() {
    clearTimeout(hintTimer);
    clearNudge();
    if (hintCount < HINT_MAX) hintTimer = setTimeout(fireHint, hintCount ? HINT_REPEAT : HINT_FIRST);
  }

  /* 事件與初始化 */

  var app = {
    COLORS: COLORS,
    el: el,
    fmt: fmt,
    profile: function () { return profile; },
    save: function () { persist(); refreshWallets(); updateSupplyDot(); },
    notify: notify,
    toastText: toastText,
    show: show,
    open: function (name) { ui[name].open(); },
    applySkin: function () { applySkin(); },
    openModal: openModal,
    walletRow: walletRow,
    refreshWallets: refreshWallets,
    setBusy: function (b) { modBusy = !!b; },
    account: function () { return account; },
    signIn: function () { onSignIn(); },
    fx: fx,
    mood: function (id) { if (Fx) Fx.mood(id); },
    Sound: Sound
  };

  screens.title.addEventListener('click', function (e) {
    var blocked = e.composedPath().some(function (n) {
      return n.classList && (n.classList.contains('account') || n.classList.contains('menu-row') || n.classList.contains('wallet-row'));
    });
    if (blocked) return;
    show('start');
  });
  $('achBtn').addEventListener('click', function () { returnTo = 'title'; show('ach'); });
  $('resAchBtn').addEventListener('click', function () { returnTo = 'result'; show('ach'); });
  $('supplyBtn').addEventListener('click', function () { ui.supply.open(); });
  $('hubBtn').addEventListener('click', function () { show('hub'); });
  $('resHubBtn').addEventListener('click', function () { show('hub'); });
  $('againBtn').addEventListener('click', function () { show('start'); });
  spinBtn.addEventListener('click', playRound);
  cashOutBtn.addEventListener('click', function () { if (!busy && game) finishGame(); });
  $('settingsBtn').addEventListener('click', openSettings);
  backBtn.addEventListener('click', function () {
    if (busy || modBusy) return;
    if (phase === 'play') { if (game && !game.finished) confirmLeave(); return; }
    var target = phase === 'ach' ? returnTo : BACK[phase];
    if (target) show(target);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest && e.target.closest('button')) return;
    if (document.querySelector('.modal')) return;
    if (phase === 'title') show('start');
    else if (phase === 'play') { e.preventDefault(); playRound(); }
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) flushCloud(); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button');
    if (b && !b.disabled) fx('tap');
  }, true);
  document.addEventListener('pointerdown', function () { hintCount = 0; armHint(); }, true);

  COLORS.forEach(function (c) { new Image().src = c.img; });
  applyTheme(document.documentElement.getAttribute('data-theme') || 'light');

  if (E.grantStarter(profile)) {
    P.save(profile);
    setTimeout(function () { toastText('新手禮：送你 ' + E.CFG.starterMoney + ' 錢'); }, 600);
  }
  settleAbandoned();

  fillWalletRows();
  buildLuckyPicker();
  buildPackButtons();
  buildHub();
  ui.supply = window.TurtleSupplyUI.create(app);
  ui.gacha = window.TurtleGachaUI.create(app);
  ui.race = window.TurtleRaceUI.create(app);
  ui.bj = window.TurtleBlackjackUI.create(app);
  ui.mem = window.TurtleMemoryUI.create(app);
  ui.pet = window.TurtlePetUI.create(app);
  ui.shop = window.TurtleShopUI.create(app);
  ui.chat = window.TurtleChatUI.create(app);
  applySkin();
  renderAccount();
  if (Cloud && Cloud.enabled) {
    Cloud.onAuth(function (user) {
      account = user;
      cloudReady = false;
      syncRetries = 0;
      syncText = '';
      renderAccount();
      if (user) syncFromCloud();
    });
  }
  setInterval(updateSupplyDot, 30000);
  show('title');
})();
