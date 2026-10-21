(function (root) {
  'use strict';

  var Race = root.TurtleRace;
  var E = root.TurtleEconomy;
  var R = root.TurtleRng;
  var P = root.TurtleProgress;
  var UI = root.TurtleUICommon;

  var MIN_BET = 10;
  var MAX_BET = 1000;
  var BASE_TIME = 5.0;
  var RANK_GAP = 0.22;
  var RUNNER = 34;

  function create(app) {
    var screen = document.getElementById('raceScreen');
    var state = { race: null, pick: null, bet: 50, running: false, order: null, result: null };

    function fresh() {
      state.race = Race.makeRace(R.random);
      state.pick = null;
      state.running = false;
      state.order = null;
      state.result = null;
    }

    function place(runner, p) {
      runner.style.left = 'calc(' + (p * 100) + '% - ' + (p * RUNNER) + 'px)';
    }

    function render() {
      var el = app.el;
      var turtles = app.profile().wallet.turtles;
      state.bet = UI.clampBet(state.bet, MIN_BET, MAX_BET, turtles);
      var settled = !!state.result;

      screen.innerHTML = '';
      screen.appendChild(el('h2', 'heading', '烏龜賽跑'));
      screen.appendChild(app.walletRow(['turtles']));
      screen.appendChild(el('p', 'game-note', '點一隻烏龜下注。賠率是押中時拿回的倍數（含本金），長期約回收 90%。'));

      var track = el('div', 'track');
      for (var i = 0; i < Race.LANES; i++) {
        (function (lane) {
          var row = el('div', 'lane' + (state.pick === lane ? ' picked' : ''));
          var run = el('div', 'lane-run');
          var img = el('img', 'runner');
          img.src = app.COLORS[lane].img;
          img.alt = app.COLORS[lane].name + '龜';
          place(img, settled ? 1 : 0);
          run.appendChild(img);
          if (settled) {
            var rank = state.order.indexOf(lane) + 1;
            run.appendChild(el('span', 'rank-badge', String(rank)));
          }
          row.appendChild(run);
          row.appendChild(el('div', 'odds', '×' + state.race.odds[lane].toFixed(1)));
          row.addEventListener('click', function () {
            if (state.running || settled) return;
            state.pick = lane;
            render();
          });
          track.appendChild(row);
        })(i);
      }
      screen.appendChild(track);

      if (settled) {
        var r = state.result;
        screen.appendChild(el('p', 'game-msg ' + (r.won ? 'win' : 'lose'), r.text));
        var again = el('button', 'btn primary', '再來一場');
        again.type = 'button';
        again.addEventListener('click', function () { fresh(); render(); });
        screen.appendChild(again);
      } else {
        screen.appendChild(UI.betBox(app, {
          bet: state.bet, min: MIN_BET, max: MAX_BET, turtles: turtles, locked: state.running,
          onChange: function (v) { state.bet = v; render(); }
        }));
        var go = el('button', 'btn primary', state.running ? '比賽中…' : '開跑！');
        go.type = 'button';
        go.disabled = state.running || state.pick === null || turtles < MIN_BET || state.bet > turtles;
        go.addEventListener('click', start);
        screen.appendChild(go);
        if (turtles < MIN_BET) screen.appendChild(el('p', 'game-msg lose', '烏龜不夠，去開幾包吧'));
      }
      app.refreshWallets();
    }

    function start() {
      var p = app.profile();
      var bet = state.bet;
      if (state.pick === null || !E.spendTurtles(p, bet, Date.now())) return;
      app.save();
      state.running = true;
      app.setBusy(true);
      var pick = state.pick;
      var order = Race.drawOrder(state.race.weights, R.random);
      render();

      var finish = [];
      var phase = [];
      order.forEach(function (lane, rank) {
        finish[lane] = BASE_TIME + rank * RANK_GAP + R.random() * 0.05;
        phase[lane] = R.random() * Math.PI * 2;
      });
      var last = BASE_TIME + (Race.LANES - 1) * RANK_GAP + 0.6;
      var runners = screen.querySelectorAll('.runner');
      var runs = screen.querySelectorAll('.lane-run');
      var badged = {};
      var next = 1;
      var t0 = performance.now();

      function frame(now) {
        var t = (now - t0) / 1000;
        for (var lane = 0; lane < Race.LANES; lane++) {
          var u = Math.min(1, t / finish[lane]);
          var wobble = Math.sin(u * 18.8 + phase[lane]) * 0.05 * u * (1 - u) * 4;
          place(runners[lane], Math.max(0, Math.min(1, u + wobble)));
          if (u >= 1 && !badged[lane]) {
            badged[lane] = true;
            var badge = app.el('span', 'rank-badge', String(next++));
            runs[lane].appendChild(badge);
          }
        }
        if (t < last) requestAnimationFrame(frame);
        else settle(pick, bet, order);
      }
      requestAnimationFrame(frame);
    }

    function settle(pick, bet, order) {
      var p = app.profile();
      var now = Date.now();
      var winner = order[0];
      var odds = state.race.odds[pick];
      var won = winner === pick;
      var payout = won ? Race.payout(bet, odds) : 0;
      if (payout > 0) E.earnTurtles(p, payout, now);
      var unlocked = P.record(p, 'race', { won: won, odds: odds }, now);

      var winName = app.COLORS[winner].name + '龜';
      var pickName = app.COLORS[pick].name + '龜';
      state.running = false;
      state.order = order;
      state.result = {
        won: won,
        text: won
          ? winName + '贏了！押中 ×' + odds.toFixed(1) + '，拿回 ' + app.fmt(payout) + '（淨賺 ' + app.fmt(payout - bet) + '）'
          : winName + '贏了，你押的' + pickName + '第 ' + (order.indexOf(pick) + 1) + ' 名，輸了 ' + app.fmt(bet)
      };
      app.setBusy(false);
      app.save();
      app.notify(unlocked);
      render();
    }

    return {
      open: function () {
        if (!state.running) fresh();
        render();
        app.show('race');
      }
    };
  }

  root.TurtleRaceUI = { create: create };
})(window);
