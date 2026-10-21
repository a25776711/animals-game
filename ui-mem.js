(function (root) {
  'use strict';

  var M = root.TurtleMemory;
  var E = root.TurtleEconomy;
  var R = root.TurtleRng;
  var P = root.TurtleProgress;

  var FLIP_BACK_MS = 800;

  function create(app) {
    var screen = document.getElementById('memScreen');
    var game = null;
    var lock = false;
    var finished = false;
    var summary = '';
    var buttons = [];
    var stepsEl = null;

    function rewardText() {
      var tiers = M.REWARDS.map(function (t, i) {
        var from = i === 0 ? 0 : M.REWARDS[i - 1].max + 1;
        return t.max === Infinity ? from + ' 步以上 ' + t.reward : (i === 0 ? '≤' + t.max : from + '～' + t.max) + ' 步 ' + t.reward;
      });
      return '報名 ' + M.FEE + ' 隻烏龜，8 對牌，步數（每翻兩張算一步）越少獎勵越多：' + tiers.join('、') + '。中途離開不退費。';
    }

    function render() {
      var el = app.el;
      var turtles = app.profile().wallet.turtles;
      screen.innerHTML = '';
      screen.appendChild(el('h2', 'heading', '翻牌記憶'));
      screen.appendChild(app.walletRow(['turtles']));
      screen.appendChild(el('p', 'game-note', rewardText()));
      buttons = [];
      stepsEl = null;

      if (!game) {
        var start = el('button', 'btn primary', '開始（-' + M.FEE + '）');
        start.type = 'button';
        start.disabled = turtles < M.FEE;
        start.addEventListener('click', startGame);
        screen.appendChild(start);
        if (turtles < M.FEE) screen.appendChild(el('p', 'game-msg lose', '烏龜不夠，去開幾包吧'));
        if (summary) screen.insertBefore(el('p', 'game-msg ' + (summary.win ? 'win' : 'lose'), summary.text), start);
      } else {
        stepsEl = el('p', 'game-msg', '步數：' + game.moves);
        screen.appendChild(stepsEl);
        var grid = el('div', 'mem-grid');
        game.cards.forEach(function (card, i) {
          var b = el('button', 'mem-card' + (card.matched ? ' open matched' : ''));
          b.type = 'button';
          b.setAttribute('aria-label', '第 ' + (i + 1) + ' 張牌');
          var back = el('div', 'face back');
          var front = el('div', 'face front');
          var img = el('img');
          img.src = app.COLORS[card.color].img;
          img.alt = app.COLORS[card.color].name + '龜';
          front.appendChild(img);
          front.appendChild(el('small', 'color-label', app.COLORS[card.color].name));
          b.appendChild(back);
          b.appendChild(front);
          b.addEventListener('click', function () { flip(i); });
          grid.appendChild(b);
          buttons.push(b);
        });
        screen.appendChild(grid);

        if (!finished) {
          var quit = el('button', 'linkbtn', '放棄這局（不退費）');
          quit.type = 'button';
          quit.addEventListener('click', giveUp);
          screen.appendChild(quit);
        }
      }
      app.refreshWallets();
    }

    function startGame() {
      var p = app.profile();
      if (!E.spendTurtles(p, M.FEE, Date.now())) return;
      app.save();
      game = M.newGame(R.random);
      lock = false;
      finished = false;
      summary = '';
      app.setBusy(true);
      app.mood('memPlay');
      render();
    }

    function giveUp() {
      game = null;
      lock = false;
      summary = { win: false, text: '放棄了，報名費不退' };
      app.setBusy(false);
      app.mood(null);
      render();
    }

    function setOpen(i, on) {
      buttons[i].classList.toggle('open', on);
    }

    function flip(i) {
      if (!game || lock || finished) return;
      var r = M.flip(game, i);
      if (r.type === 'ignore') return;
      setOpen(i, true);
      app.fx('flip');
      if (r.type === 'first') return;

      stepsEl.textContent = '步數：' + game.moves;
      if (r.type === 'mismatch') {
        lock = true;
        setTimeout(function () { app.fx('memMiss'); }, 380);
        setTimeout(function () {
          setOpen(r.a, false);
          setOpen(r.b, false);
          lock = false;
        }, FLIP_BACK_MS);
        return;
      }
      buttons[r.a].classList.add('matched');
      buttons[r.b].classList.add('matched');
      setTimeout(function () { app.fx('memMatch'); }, 300);
      if (r.type === 'win') win();
    }

    function win() {
      var p = app.profile();
      var now = Date.now();
      var reward = M.reward(game.moves);
      if (reward > 0) E.earnTurtles(p, reward, now);
      var unlocked = P.record(p, 'mem', { moves: game.moves }, now);
      var net = reward - M.FEE;
      finished = true;
      summary = {
        win: net >= 0,
        text: game.moves + ' 步完成，獎勵 ' + reward + '（' + (net >= 0 ? '淨賺 ' : '淨虧 ') + Math.abs(net) + '）'
      };
      app.setBusy(false);
      app.mood(null);
      setTimeout(function () { app.fx(net >= 0 ? 'bigWin' : 'win'); }, 600);
      app.save();
      app.notify(unlocked);
      setTimeout(function () {
        game = null;
        finished = false;
        render();
      }, 900);
    }

    return {
      open: function () {
        if (!game) summary = '';
        render();
        app.show('mem');
      }
    };
  }

  root.TurtleMemoryUI = { create: create };
})(window);
