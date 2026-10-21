(function () {
  'use strict';

  var L = window.TurtleLogic;
  var P = window.TurtleProgress;
  var Cloud = window.Cloud;

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
  var PACK_OPTIONS = [10, 20, 50];
  var MS = { open: 260, lucky: 900, match: 900, clear: 380 };
  var CLOUD_SAVE_DELAY = 3000;
  var LUCKY_KEY = 'turtle.lucky';
  var TYPE_NAME = { pair: '碰', line: '連線', family: '全家福' };

  var $ = function (id) { return document.getElementById(id); };

  var screens = {
    title: $('titleScreen'),
    start: $('startScreen'),
    play: $('playScreen'),
    result: $('resultScreen'),
    ach: $('achScreen')
  };
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
  var cells = [];
  var lucky = loadLucky();

  var account = null;
  var cloudReady = false;
  var syncText = '';
  var cloudTimer = null;

  function loadLucky() {
    try {
      var v = parseInt(localStorage.getItem(LUCKY_KEY), 10);
      if (v >= 0 && v < COLORS.length) return v;
    } catch (e) {}
    return 0;
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function show(name) {
    phase = name;
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle('active', k === name);
    });
    backBtn.classList.toggle('hidden', name === 'title' || name === 'result');
    if (name === 'ach') renderAchievements();
  }

  function toast(def) {
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = '🏆 解鎖成就：' + def.icon + ' ' + def.name;
    $('toasts').appendChild(el);
    setTimeout(function () { el.remove(); }, 3400);
  }

  function record(kind, data) {
    var unlocked = P.record(profile, kind, data, Date.now());
    P.save(profile);
    scheduleCloudSave();
    unlocked.forEach(function (d) {
      if (game) game.unlocked.push(d);
      toast(d);
    });
  }

  /* 雲端存檔 */

  function renderAccount() {
    document.querySelectorAll('.account').forEach(function (bar) {
      if (!Cloud || !Cloud.enabled) { bar.classList.add('hidden'); return; }
      bar.classList.remove('hidden');
      bar.innerHTML = '';
      var status = document.createElement('span');
      status.className = 'status';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn';
      if (account) {
        status.textContent = '☁ ' + account.name + (syncText ? '・' + syncText : '');
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

  function syncFromCloud() {
    syncText = '同步中…';
    renderAccount();
    return Cloud.loadProfile().then(function (remote) {
      profile = P.merge(profile, P.normalize(remote));
      P.save(profile);
      return Cloud.saveProfile(profile);
    }).then(function () {
      cloudReady = true;
      syncText = '已同步';
      renderAccount();
      if (phase === 'ach') renderAchievements();
    }).catch(function () {
      syncText = '同步失敗';
      renderAccount();
    });
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
    return Cloud.saveProfile(profile).then(function () {
      if (account === who) { syncText = '已同步'; renderAccount(); }
    }).catch(function () {
      if (account === who) { syncText = '同步失敗'; renderAccount(); }
    });
  }

  /* 畫面 */

  function buildBoard() {
    board.innerHTML = '';
    cells = [];
    for (var i = 0; i < L.SIZE; i++) {
      var el = document.createElement('div');
      el.className = 'cell';
      el.setAttribute('role', 'gridcell');
      board.appendChild(el);
      cells.push(el);
    }
  }

  function renderCell(i, color, cls) {
    var el = cells[i];
    el.className = 'cell';
    el.innerHTML = '';
    if (color == null) return;
    var img = document.createElement('img');
    img.className = 'icon';
    img.src = COLORS[color].img;
    img.alt = COLORS[color].name + '色烏龜';
    el.appendChild(img);
    if (cls) el.classList.add(cls);
  }

  function renderHud() {
    $('packCount').textContent = game.packs;
    $('roundCount').textContent = game.rounds;
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

  function renderAchievements() {
    var done = P.DEFS.filter(function (d) { return profile.achievements[d.id]; }).length;
    $('achTitle').textContent = '成就 ' + done + '/' + P.DEFS.length;
    var list = $('achList');
    list.innerHTML = '';
    P.DEFS.forEach(function (d) {
      var got = !!profile.achievements[d.id];
      var v = Math.min(P.value(profile, d), d.target);

      var card = document.createElement('div');
      card.className = 'ach ' + (got ? 'done' : 'locked');

      var icon = document.createElement('div');
      icon.className = 'ach-icon';
      icon.textContent = d.icon;

      var body = document.createElement('div');
      var name = document.createElement('div');
      name.className = 'ach-name';
      name.textContent = d.name + (got ? ' ✓' : '');
      var desc = document.createElement('div');
      desc.className = 'ach-desc';
      desc.textContent = d.desc + (got ? '' : '（' + v + '/' + d.target + '）');
      body.appendChild(name);
      body.appendChild(desc);

      if (!got) {
        var bar = document.createElement('div');
        bar.className = 'ach-bar';
        var fill = document.createElement('i');
        fill.style.width = Math.round(v / d.target * 100) + '%';
        bar.appendChild(fill);
        body.appendChild(bar);
      }

      card.appendChild(icon);
      card.appendChild(body);
      list.appendChild(card);
    });
  }

  /* 遊戲流程 */

  function startGame(packs) {
    game = {
      start: packs, packs: packs, rounds: 0, opened: 0, gained: 0,
      grid: L.emptyGrid(), lucky: lucky, finished: false, unlocked: [],
      counts: { pair: 0, line: 0, family: 0, lucky: 0 }
    };
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
      renderHud();
      record('open');
      announce('開包中 ' + (k + 1) + '/' + empties.length);
      await wait(MS.open);

      if (color === game.lucky) {
        game.packs++;
        game.gained++;
        game.counts.lucky++;
        cells[i].classList.add('lucky');
        renderHud();
        record('lucky');
        announce('🍀 幸運色！+1 包', 'lucky');
        await wait(MS.lucky);
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
      await wait(MS.match);

      ev.cells.forEach(function (c) { cells[c].classList.add('clearing'); });
      await wait(MS.clear);

      ev.cells.forEach(function (c) { game.grid[c] = null; renderCell(c, null); });
      game.packs += ev.packs;
      game.gained += ev.packs;
      game.counts[ev.type]++;
      renderHud();
      record('match', { type: ev.type });
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
    if (game.rounds > 0) record('end', { rounds: game.rounds, gained: game.gained });
    flushCloud();

    var c = game.counts;
    $('resultTitle').textContent = game.packs <= 0 ? '包數用完了！' : '本局結算';
    $('resGained').textContent = '+' + game.gained;
    $('resPacks').textContent = game.start + ' → ' + game.packs;
    $('resRounds').textContent = game.rounds + ' / ' + game.opened;
    $('resMatches').textContent = c.pair + ' / ' + c.line;
    $('resBonus').textContent = c.family + ' / ' + c.lucky;

    var resAch = $('resAch');
    resAch.innerHTML = '';
    resAch.classList.toggle('hidden', !game.unlocked.length);
    if (game.unlocked.length) {
      var head = document.createElement('b');
      head.textContent = '🏆 本局解鎖成就';
      resAch.appendChild(head);
      game.unlocked.forEach(function (d) {
        var line = document.createElement('div');
        line.textContent = d.icon + ' ' + d.name + '：' + d.desc;
        resAch.appendChild(line);
      });
    }

    setTimeout(function () { show('result'); }, 600);
  }

  /* 初始化與事件 */

  function buildLuckyPicker() {
    var wrap = $('luckyPicker');
    COLORS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'lucky-opt';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', c.name + '色');
      b.setAttribute('aria-checked', String(c.id === lucky));
      var img = document.createElement('img');
      img.src = c.img;
      img.alt = '';
      b.appendChild(img);
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

  function buildPackButtons() {
    var wrap = $('packOptions');
    PACK_OPTIONS.forEach(function (n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn pack-btn';
      b.textContent = n + ' 包';
      b.addEventListener('click', function () { startGame(n); });
      wrap.appendChild(b);
    });
  }

  screens.title.addEventListener('click', function (e) {
    if (e.target.closest('.account, .menu-row')) return;
    show('start');
  });
  $('achBtn').addEventListener('click', function () { returnTo = 'title'; show('ach'); });
  $('resAchBtn').addEventListener('click', function () { returnTo = 'result'; show('ach'); });
  $('againBtn').addEventListener('click', function () { show('start'); });
  spinBtn.addEventListener('click', playRound);
  cashOutBtn.addEventListener('click', function () { if (!busy && game) finishGame(); });
  backBtn.addEventListener('click', function () {
    if (busy) return;
    if (phase === 'play') show('start');
    else if (phase === 'start') show('title');
    else if (phase === 'ach') show(returnTo);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (phase === 'title') show('start');
    else if (phase === 'play') { e.preventDefault(); playRound(); }
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) flushCloud(); });

  COLORS.forEach(function (c) { new Image().src = c.img; });
  buildLuckyPicker();
  buildPackButtons();
  renderAccount();
  if (Cloud && Cloud.enabled) {
    Cloud.onAuth(function (user) {
      account = user;
      cloudReady = false;
      syncText = '';
      renderAccount();
      if (user) syncFromCloud();
    });
  }
  show('title');
})();
