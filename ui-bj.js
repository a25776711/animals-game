(function (root) {
  'use strict';

  var B = root.TurtleBlackjack;
  var E = root.TurtleEconomy;
  var R = root.TurtleRng;
  var P = root.TurtleProgress;
  var UI = root.TurtleUICommon;

  var MIN_BET = 10;
  var MAX_BET = 1000;
  var REVEAL_MS = 520;

  function create(app) {
    var screen = document.getElementById('bjScreen');
    var shoe = null;
    var game = null;
    var bet = 50;
    var shown = 0;
    var animating = false;
    var message = { text: '', kind: '' };

    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    function cardEl(c, hidden) {
      var red = c && (c.suit === '♥' || c.suit === '♦');
      var node = app.el('div', 'pcard' + (hidden ? ' back' : red ? ' red' : ''));
      if (!hidden) {
        node.appendChild(app.el('span', null, c.rank));
        node.appendChild(app.el('span', null, c.suit));
      }
      return node;
    }

    function handRow(cards, hideFrom) {
      var row = app.el('div', 'hand');
      cards.forEach(function (c, i) { row.appendChild(cardEl(c, hideFrom != null && i >= hideFrom)); });
      return row;
    }

    function totalText(cards) {
      var v = B.handValue(cards);
      return v.total + (v.soft && !v.bust && v.total < 21 ? '（軟）' : '') + (v.bust ? ' 爆牌' : '');
    }

    function inHand() { return game && game.stage === 'player'; }

    function render() {
      var el = app.el;
      var turtles = app.profile().wallet.turtles;
      var live = inHand();
      screen.innerHTML = '';
      screen.appendChild(el('h2', 'heading', '21 點'));
      screen.appendChild(app.walletRow(['turtles']));
      screen.appendChild(el('p', 'game-note', '莊家 17 點以上停牌。Blackjack 賠 6:5，可雙倍，沒有分牌與保險。'));

      var table = el('div', 'bj-table');
      var dealerHead = el('h4', null, '莊家');
      table.appendChild(dealerHead);
      if (game) {
        var holeHidden = game.stage === 'player' ? 1 : null;
        var visible = game.stage === 'player' ? game.dealer : game.dealer.slice(0, Math.max(shown, 2));
        table.appendChild(handRow(visible, holeHidden));
        if (game.stage !== 'player' && shown >= game.dealer.length) dealerHead.textContent = '莊家：' + totalText(game.dealer);
        else if (game.stage !== 'player') dealerHead.textContent = '莊家';
        var playerHead = el('h4', null, '你：' + totalText(game.player));
        table.appendChild(playerHead);
        table.appendChild(handRow(game.player));
      } else {
        table.appendChild(el('div', 'hand'));
        table.appendChild(el('h4', null, '你'));
        table.appendChild(el('div', 'hand'));
      }
      screen.appendChild(table);
      screen.appendChild(el('p', 'game-msg ' + message.kind, message.text));

      if (live && !animating) {
        var actions = el('div', 'bj-actions');
        var hit = el('button', 'btn', '要牌');
        hit.type = 'button';
        hit.addEventListener('click', function () { act('hit'); });
        var stand = el('button', 'btn', '停牌');
        stand.type = 'button';
        stand.addEventListener('click', function () { act('stand'); });
        actions.appendChild(hit);
        actions.appendChild(stand);
        if (B.canDouble(game)) {
          var dbl = el('button', 'btn', '雙倍（-' + game.bet + '）');
          dbl.type = 'button';
          dbl.disabled = turtles < game.bet;
          dbl.addEventListener('click', function () { act('double'); });
          actions.appendChild(dbl);
        }
        screen.appendChild(actions);
      } else if (!live && !animating) {
        bet = UI.clampBet(bet, MIN_BET, MAX_BET, turtles);
        screen.appendChild(UI.betBox(app, {
          bet: bet, min: MIN_BET, max: MAX_BET, turtles: turtles, locked: false,
          onChange: function (v) { bet = v; render(); }
        }));
        var deal = el('button', 'btn primary', game ? '下一局' : '發牌');
        deal.type = 'button';
        deal.disabled = turtles < MIN_BET || bet > turtles;
        deal.addEventListener('click', deal_);
        screen.appendChild(deal);
        if (turtles < MIN_BET) screen.appendChild(el('p', 'game-msg lose', '烏龜不夠，去開幾包吧'));
      }
      app.refreshWallets();
    }

    function deal_() {
      var p = app.profile();
      if (!E.spendTurtles(p, bet, Date.now())) return;
      app.save();
      if (!shoe || B.needsReshuffle(shoe)) shoe = B.newShoe(R.random);
      game = B.start(shoe, bet);
      shown = 0;
      message = { text: '', kind: '' };
      for (var d = 0; d < 4; d++) setTimeout(function () { app.fx('deal'); }, d * 140);
      if (game.stage === 'done') {
        finishHand(true);
      } else {
        app.setBusy(true);
        app.mood('bjPlay');
        render();
      }
    }

    function act(kind) {
      if (!inHand() || animating) return;
      var p = app.profile();
      if (kind === 'double') {
        if (!B.canDouble(game) || !E.spendTurtles(p, game.bet, Date.now())) return;
        app.save();
        app.fx('deal');
        B.double(game);
      } else if (kind === 'hit') {
        app.fx('deal');
        B.hit(game);
      } else {
        B.stand(game);
      }
      if (game.stage === 'done') finishHand(false);
      else render();
    }

    async function finishHand(instant) {
      animating = true;
      app.setBusy(true);
      render();
      if (!instant) {
        shown = 2;
        app.fx('flip');
        render();
        await wait(REVEAL_MS);
        for (var n = 3; n <= game.dealer.length; n++) {
          shown = n;
          app.fx('deal');
          render();
          await wait(REVEAL_MS);
        }
      }
      shown = game.dealer.length;
      settle();
    }

    function settle() {
      var p = app.profile();
      var now = Date.now();
      var net = game.payout - game.bet;
      if (game.payout > 0) E.earnTurtles(p, game.payout, now);
      var unlocked = P.record(p, 'bj', { result: game.outcome }, now);

      if (game.outcome === 'blackjack') message = { text: 'Blackjack！拿回 ' + app.fmt(game.payout) + '（淨賺 ' + app.fmt(net) + '）', kind: 'win' };
      else if (game.outcome === 'win') message = { text: '你贏了，淨賺 ' + app.fmt(net), kind: 'win' };
      else if (game.outcome === 'push') message = { text: '平手，退回本金', kind: '' };
      else message = { text: '輸了 ' + app.fmt(game.bet), kind: 'lose' };

      animating = false;
      app.setBusy(false);
      app.mood(null);
      app.fx(game.outcome === 'blackjack' ? 'bigWin' : game.outcome === 'win' ? 'win' : game.outcome === 'push' ? 'push' : 'lose');
      app.save();
      app.notify(unlocked);
      render();
    }

    return {
      open: function () {
        if (!inHand() && !animating) {
          game = null;
          message = { text: '', kind: '' };
        }
        render();
        app.show('bj');
      }
    };
  }

  root.TurtleBlackjackUI = { create: create };
})(window);
