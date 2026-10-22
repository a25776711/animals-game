(function (root) {
  'use strict';

  function icon(name, cls) {
    var img = document.createElement('img');
    img.className = cls || 'ink-icon';
    img.src = 'img/ink-' + name + '.svg';
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    return img;
  }

  function help(app, label, lines) {
    var hover = !!(root.matchMedia && root.matchMedia('(hover: hover)').matches);
    var btn = app.el('button', 'help-btn', '?');
    btn.type = 'button';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('aria-expanded', 'false');
    var pop = null;

    function close() {
      if (!pop) return;
      pop.remove();
      pop = null;
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', away, true);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousemove', wander);
    }
    function wander(e) { if (pop && !btn.contains(e.target) && !pop.contains(e.target)) close(); }
    function away(e) { if (e.target !== btn && !(pop && pop.contains(e.target))) close(); }
    function onKey(e) { if (e.key === 'Escape') close(); }

    function open() {
      if (pop) return;
      pop = app.el('div', 'help-pop');
      pop.setAttribute('role', 'tooltip');
      lines.forEach(function (l) {
        if (!Array.isArray(l)) { pop.appendChild(app.el('p', null, l)); return; }
        var row = app.el('p', 'help-grid');
        l.forEach(function (x) { row.appendChild(app.el('span', null, x)); });
        pop.appendChild(row);
      });
      document.body.appendChild(pop);
      var r = btn.getBoundingClientRect();
      var w = Math.min(300, root.innerWidth - 16);
      pop.style.width = w + 'px';
      pop.style.left = Math.max(8, Math.min(root.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
      var h = pop.offsetHeight;
      var below = r.bottom + 8;
      pop.style.top = (below + h > root.innerHeight - 8 && r.top - 8 - h > 8 ? r.top - 8 - h : below) + 'px';
      btn.setAttribute('aria-expanded', 'true');
      document.addEventListener('pointerdown', away, true);
      document.addEventListener('keydown', onKey);
      if (hover) document.addEventListener('mousemove', wander);
    }

    if (hover) {
      btn.addEventListener('mouseenter', open);
      btn.addEventListener('mouseleave', close);
      btn.addEventListener('focus', open);
      btn.addEventListener('blur', close);
      btn.addEventListener('click', open);
    } else {
      btn.addEventListener('click', function () { if (pop) close(); else open(); });
    }
    return btn;
  }

  var CHIPS = [10, 50, 100, 500];

  function betBox(app, opts) {
    var el = app.el;
    var cap = Math.min(opts.max, opts.turtles);
    var box = el('div', 'bet-box');
    box.appendChild(el('div', 'bet-amount', '下注 ' + app.fmt(opts.bet) + ' 隻烏龜'));

    var chips = el('div', 'chips');
    CHIPS.forEach(function (v) {
      var b = el('button', 'chip', '+' + v);
      b.type = 'button';
      b.disabled = opts.locked || opts.bet + v > cap;
      b.addEventListener('click', function () { opts.onChange(Math.min(cap, opts.bet + v)); });
      chips.appendChild(b);
    });
    var clear = el('button', 'chip clear', '歸零重設');
    clear.type = 'button';
    clear.disabled = opts.locked || opts.bet === opts.min;
    clear.addEventListener('click', function () { opts.onChange(opts.min); });
    chips.appendChild(clear);
    box.appendChild(chips);
    return box;
  }

  function clampBet(bet, min, max, turtles) {
    return Math.max(min, Math.min(bet, max, Math.max(min, turtles)));
  }

  root.TurtleUICommon = { icon: icon, help: help, betBox: betBox, clampBet: clampBet };
})(window);
