(function (root) {
  'use strict';

  var CHIPS = [10, 50, 100, 500];

  function betBox(app, opts) {
    var el = app.el;
    var cap = Math.min(opts.max, opts.turtles);
    var box = el('div', 'bet-box');
    box.appendChild(el('div', 'bet-amount', '下注 ' + app.fmt(opts.bet) + ' 烏龜'));

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

  root.TurtleUICommon = { betBox: betBox, clampBet: clampBet };
})(window);
