(function (root) {
  'use strict';

  var G = root.TurtleGacha;
  var E = root.TurtleEconomy;
  var R = root.TurtleRng;
  var P = root.TurtleProgress;

  function create(app) {
    var screen = document.getElementById('gachaScreen');
    var lastDraw = null;

    function cardEl(color, rarity, count, locked, delay) {
      var cls = 'gcard r' + rarity + (locked ? ' locked' : '') + (delay != null ? ' reveal' : '');
      var c = app.el('div', cls);
      var name = app.COLORS[color].name + '·' + G.RARITIES[rarity].name;
      c.title = name;
      if (delay != null) c.style.animationDelay = delay + 's';
      var img = app.el('img');
      img.src = app.COLORS[color].img;
      img.alt = name;
      c.appendChild(img);
      c.appendChild(app.el('small', null, name));
      if (count > 1) c.appendChild(app.el('span', 'count', '×' + count));
      return c;
    }

    function render() {
      var el = app.el;
      var p = app.profile();
      var turtles = p.wallet.turtles;
      screen.innerHTML = '';
      screen.appendChild(el('h2', 'heading', '抽卡圖鑑'));
      screen.appendChild(app.walletRow(['turtles']));

      var rates = G.RARITIES.map(function (r) { return r.name + ' ' + r.rate + '%'; }).join('・');
      screen.appendChild(el('p', 'game-note',
        rates + '。連續 ' + G.PITY_LIMIT + ' 抽沒出傳說，第 ' + G.PITY_LIMIT + ' 抽必出（含保底實際約 3.1%）。十連至少一張稀有。'));
      screen.appendChild(el('p', 'game-note', '距離保底還有 ' + (G.PITY_LIMIT - p.pity) + ' 抽'));

      var actions = el('div', 'gacha-actions');
      [[1, G.COST.single, '單抽'], [10, G.COST.ten, '十連']].forEach(function (o) {
        var b = el('button', 'btn', o[2]);
        b.type = 'button';
        b.appendChild(el('small', null, '-' + o[1] + ' 隻烏龜'));
        b.disabled = turtles < o[1];
        b.addEventListener('click', function () { draw(o[0], o[1]); });
        actions.appendChild(b);
      });
      screen.appendChild(actions);

      if (lastDraw) {
        screen.appendChild(el('h3', 'section-title', '這次抽到'));
        var grid = el('div', 'draw-grid' + (lastDraw.length === 1 ? ' single' : ''));
        lastDraw.forEach(function (c, i) { grid.appendChild(cardEl(c.color, c.rarity, 1, false, i * 0.12)); });
        screen.appendChild(grid);
      }

      screen.appendChild(el('h3', 'section-title', '圖鑑 ' + P.cardTypes(p) + '/' + (app.COLORS.length * G.RARITIES.length)));
      var collection = el('div', 'collection');
      app.COLORS.forEach(function (color) {
        collection.appendChild(el('div', 'row-label', color.name + '色'));
        G.RARITIES.forEach(function (r) {
          var n = p.cards[color.id + '-' + r.id] || 0;
          collection.appendChild(cardEl(color.id, r.id, n, n === 0));
        });
      });
      screen.appendChild(collection);
      app.refreshWallets();
    }

    function draw(n, cost) {
      var p = app.profile();
      var now = Date.now();
      if (!E.spendTurtles(p, cost, now)) {
        app.toastText('烏龜不夠，去開幾包吧');
        return;
      }
      var res = G.drawMany(p.pity, n, R.random);
      var unlocked = G.apply(p, res.cards, res.pity, now);
      lastDraw = res.cards;
      app.save();
      app.notify(unlocked);
      if (res.cards.some(function (c) { return c.rarity === 3; })) app.toastText('抽到傳說烏龜！');
      render();
    }

    return {
      open: function () {
        lastDraw = null;
        render();
        app.show('gacha');
      }
    };
  }

  root.TurtleGachaUI = { create: create };
})(window);
