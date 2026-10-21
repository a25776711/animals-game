(function (root) {
  'use strict';

  var E = root.TurtleEconomy;
  var R = root.TurtleRng;

  var PALETTE = ['#ffd9a8', '#c9e8cf', '#cfe3f7', '#f8cfd8'];
  var SPIN_TURNS = 5;

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function create(app) {
    var screen = document.getElementById('supplyScreen');

    function render() {
      var el = app.el;
      screen.innerHTML = '';
      screen.appendChild(el('h2', 'heading', '補給站'));
      screen.appendChild(app.walletRow(['money']));
      screen.appendChild(el('p', 'ach-note',
        '每天 ' + E.CFG.slotHours.map(function (h) { return pad(h) + ':00'; }).join('、') +
        '（台灣時間）各開放一份，當天內都能領，跨日就過期。可以直接領 ' + E.CFG.dailyFixed + ' 錢，或賭一把轉盤。'));

      var status = E.dailyStatus(app.profile(), Date.now());
      var list = el('div', 'slot-list');
      status.slots.forEach(function (s) {
        var row = el('div', 'slot ' + s.state);
        var left = el('div');
        left.appendChild(el('div', 'when', pad(s.hour) + ':00 補給'));
        left.appendChild(el('div', 'state',
          s.state === 'claimed' ? '已領取' : s.state === 'ready' ? '可以領取' : pad(s.hour) + ':00 開放'));
        row.appendChild(left);
        if (s.state === 'ready') {
          var b = el('button', 'btn claim', '領取');
          b.type = 'button';
          b.addEventListener('click', function () { choose(s.index); });
          row.appendChild(b);
        }
        list.appendChild(row);
      });
      screen.appendChild(list);
      screen.appendChild(el('p', 'ach-note', '錢只能拿來玩「烏龜對對碰」，一包 = 一錢。'));
      app.refreshWallets();
    }

    function oddsText() {
      return E.CFG.wheel.slice().sort(function (a, b) { return a.amount - b.amount; })
        .map(function (w) { return w.amount + '（' + w.weight + '%）'; }).join('　');
    }

    function choose(index) {
      var m = app.openModal({ label: '領取補給' });
      var card = m.card;
      card.appendChild(app.el('h3', null, '領取補給'));
      card.appendChild(app.el('p', null, '直接領比較穩，轉盤可能多也可能少。'));

      var fixed = app.el('button', 'btn choice merge', '直接領 ' + E.CFG.dailyFixed + ' 錢');
      fixed.type = 'button';
      fixed.appendChild(app.el('small', null, '可以玩 ' + (E.CFG.dailyFixed / 50) + ' 次 50 包'));
      fixed.addEventListener('click', function () { m.close(); claim(index, 'fixed'); });

      var wheel = app.el('button', 'btn choice cloud', '轉盤（30～350 錢）');
      wheel.type = 'button';
      wheel.appendChild(app.el('small', null, '最多 350 = 7 次 50 包，最少 30 = 3 次 10 包'));
      wheel.addEventListener('click', function () { m.close(); claim(index, 'wheel'); });

      card.appendChild(fixed);
      card.appendChild(wheel);
      card.appendChild(app.el('p', 'odds-table', '轉盤機率：' + oddsText()));
      var cancel = app.el('button', 'linkbtn', '先不領');
      cancel.type = 'button';
      cancel.addEventListener('click', m.close);
      card.appendChild(cancel);
      fixed.focus();
    }

    function claim(index, mode) {
      var r = E.claimDaily(app.profile(), index, mode, Date.now(), R.random);
      if (!r.ok) {
        app.toastText('這個時段現在不能領');
        render();
        return;
      }
      app.save();
      app.notify(r.unlocked);
      if (mode === 'wheel') wheelModal(r.wheelIndex, r.amount);
      else app.toastText('+' + r.amount + ' 錢');
      render();
    }

    function wheelModal(index, amount) {
      var m = app.openModal({ label: '轉盤', locked: true });
      var card = m.card;
      card.appendChild(app.el('h3', null, '轉盤'));

      var count = E.CFG.wheel.length;
      var seg = 360 / count;
      var wrap = app.el('div', 'wheel-wrap');
      wrap.appendChild(app.el('div', 'wheel-pointer'));
      var wheel = app.el('div', 'wheel');
      var stops = [];
      E.CFG.wheel.forEach(function (w, i) {
        stops.push(PALETTE[i % PALETTE.length] + ' ' + (i * seg) + 'deg ' + ((i + 1) * seg) + 'deg');
        var label = app.el('div', 'wheel-label');
        label.style.transform = 'rotate(' + (i * seg + seg / 2) + 'deg)';
        label.appendChild(app.el('span', null, String(w.amount)));
        wheel.appendChild(label);
      });
      wheel.style.background = 'conic-gradient(' + stops.join(',') + ')';
      wrap.appendChild(wheel);
      card.appendChild(wrap);

      var result = app.el('div', 'wheel-result', '轉轉轉…');
      card.appendChild(result);
      var done = app.el('button', 'btn choice merge', '收下');
      done.type = 'button';
      done.disabled = true;
      done.addEventListener('click', m.close);
      card.appendChild(done);

      var finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        result.textContent = '🎉 +' + amount + ' 錢';
        done.disabled = false;
        done.focus();
        render();
      }

      var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) wheel.style.transitionDuration = '0.01s';
      var jitter = (R.random() - 0.5) * seg * 0.7;
      var target = 360 * SPIN_TURNS - (index * seg + seg / 2) + jitter;
      wheel.addEventListener('transitionend', finish);
      setTimeout(finish, 5200);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { wheel.style.transform = 'rotate(' + target + 'deg)'; });
      });
    }

    setInterval(function () {
      if (screen.classList.contains('active') && !document.querySelector('.modal')) render();
    }, 20000);

    return {
      open: function () {
        render();
        app.show('supply');
      }
    };
  }

  root.TurtleSupplyUI = { create: create };
})(window);
