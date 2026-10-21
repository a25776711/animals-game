(function () {
  'use strict';

  var ANIMALS = [
    { id: 0, name: '綠龜',   img: 'img/turtle-green.png' },
    { id: 1, name: '淺藍龜', img: 'img/turtle-lightblue.png' },
    { id: 2, name: '藍龜',   img: 'img/turtle-blue.png' },
    { id: 3, name: '紫龜',   img: 'img/turtle-purple.png' },
    { id: 4, name: '桃龜',   img: 'img/turtle-pink.png' },
    { id: 5, name: '紅龜',   img: 'img/turtle-red.png' },
    { id: 6, name: '橘龜',   img: 'img/turtle-orange.png' },
    { id: 7, name: '橘黃龜', img: 'img/turtle-amber.png' },
    { id: 8, name: '黃龜',   img: 'img/turtle-yellow.png' }
  ];
  var PACK_OPTIONS = [10, 20, 50];
  var COST_PER_ROUND = 2;
  var ANIM_MS = { fill: 350, match: 900, clear: 400 };

  var L = window.AnimalLogic;
  var $ = function (id) { return document.getElementById(id); };

  var screens = {
    title: $('titleScreen'),
    start: $('startScreen'),
    play: $('playScreen'),
    result: $('resultScreen')
  };
  var backBtn = $('backBtn');
  var board = $('board');
  var spinBtn = $('spinBtn');
  var message = $('message');

  var MESSAGES = {
    allDifferent: '🎉 全部都不一樣！全消 +5 包',
    threeInARow: '✨ 三連線！+3 包',
    pair: '👍 一對！+1 包',
    none: '沒有配對…'
  };

  var state = null;
  var phase = 'title';
  var busy = false;
  var cells = [];

  function show(name) {
    phase = name;
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle('active', k === name);
    });
    backBtn.classList.toggle('hidden', name === 'title' || name === 'result');
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function buildBoard() {
    board.innerHTML = '';
    cells = [];
    for (var i = 0; i < 9; i++) {
      var el = document.createElement('div');
      el.className = 'cell';
      el.setAttribute('role', 'gridcell');
      board.appendChild(el);
      cells.push(el);
    }
  }

  function renderCell(i, animalId, animate) {
    var el = cells[i];
    el.className = 'cell';
    el.innerHTML = '';
    if (animalId == null) return;
    var a = ANIMALS[animalId], icon;
    if (a.img) {
      icon = document.createElement('img');
      icon.src = a.img;
      icon.alt = a.name;
    } else {
      icon = document.createElement('span');
      icon.textContent = a.emoji;
      icon.setAttribute('role', 'img');
      icon.setAttribute('aria-label', a.name);
    }
    icon.className = 'icon';
    el.appendChild(icon);
    if (animate) el.classList.add('pop');
  }

  function renderHud() {
    $('packCount').textContent = state.packs;
    $('roundCount').textContent = state.rounds;
  }

  async function playRound() {
    if (busy || !state || state.packs < COST_PER_ROUND) return;
    busy = true;
    spinBtn.disabled = true;

    state.packs -= COST_PER_ROUND;
    state.rounds += 1;
    renderHud();
    message.textContent = '開包中…';

    var before = state.grid;
    state.grid = L.fillRandom(state.grid, ANIMALS.length);
    state.grid.forEach(function (v, i) { renderCell(i, v, before[i] == null); });
    await wait(ANIM_MS.fill);

    var result = L.checkBestMatch(state.grid);
    message.textContent = MESSAGES[result.type];

    if (result.type !== 'none') {
      result.cells.forEach(function (i) { cells[i].classList.add('match'); });
      await wait(ANIM_MS.match);
      result.cells.forEach(function (i) { cells[i].classList.add('clearing'); });
      await wait(ANIM_MS.clear);

      result.cells.forEach(function (i) { state.grid[i] = null; renderCell(i, null); });
      state.packs += result.packs;
      renderHud();
    }

    busy = false;
    spinBtn.disabled = false;
    if (state.packs < COST_PER_ROUND) finishGame();
  }

  function loadBest() {
    try { return parseInt(localStorage.getItem('animals.bestRounds'), 10) || 0; }
    catch (e) { return 0; }
  }

  function saveBest(v) {
    try { localStorage.setItem('animals.bestRounds', String(v)); } catch (e) {}
  }

  function finishGame() {
    var best = Math.max(loadBest(), state.rounds);
    var diff = state.packs - state.start;
    saveBest(best);
    $('resStart').textContent = state.start;
    $('resGained').textContent = (diff >= 0 ? '+' : '') + diff;
    $('resRounds').textContent = state.rounds;
    $('resBest').textContent = best;
    setTimeout(function () { show('result'); }, 700);
  }

  function startGame(packs) {
    state = { start: packs, packs: packs, rounds: 0, grid: new Array(9).fill(null) };
    buildBoard();
    renderHud();
    message.textContent = '按「開包」開始！';
    spinBtn.textContent = '開包（-' + COST_PER_ROUND + ' 包）';
    spinBtn.disabled = false;
    busy = false;
    show('play');
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

  screens.title.addEventListener('click', function () { show('start'); });
  spinBtn.addEventListener('click', playRound);
  $('cashOutBtn').addEventListener('click', function () { if (!busy && state) finishGame(); });
  $('againBtn').addEventListener('click', function () { show('start'); });
  backBtn.addEventListener('click', function () {
    if (busy) return;
    if (phase === 'play') show('start');
    else if (phase === 'start') show('title');
  });

  document.addEventListener('keydown', function (e) {
    var go = e.key === 'Enter' || e.key === ' ';
    if (!go) return;
    if (phase === 'title') show('start');
    else if (phase === 'play') { e.preventDefault(); playRound(); }
  });

  ANIMALS.forEach(function (a) { if (a.img) new Image().src = a.img; });
  buildPackButtons();
  show('title');
})();
