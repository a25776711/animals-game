(function (root) {
  'use strict';

  var isNode = typeof module !== 'undefined' && module.exports;

  var AMOUNTS = [50, 100, 200, 500];
  var HANDLE = /^[A-Za-z0-9._-]{1,40}$/;
  var MAX_AMOUNT = 100000;

  function paypalUrl(handle, amount) {
    if (!HANDLE.test(handle || '')) return null;
    var base = 'https://paypal.me/' + handle;
    if (amount === undefined) return base;
    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_AMOUNT) return null;
    return base + '/' + amount + 'TWD';
  }

  var api = { AMOUNTS: AMOUNTS, paypalUrl: paypalUrl };

  if (isNode) {
    module.exports = api;
    return;
  }

  function handle() {
    return root.DonateConfig && root.DonateConfig.paypalMe;
  }

  function go(url) {
    if (url) root.open(url, '_blank', 'noopener,noreferrer');
  }

  api.enabled = function () { return !!paypalUrl(handle()); };

  api.open = function (app) {
    var m = app.openModal({ label: '請作者喝杯飲料' });
    var card = m.card;
    card.appendChild(app.el('h3', null, '請作者喝杯飲料'));
    card.appendChild(app.el('p', null, '遊戲免費，也不會因為斗內多給任何東西。想支持的話，選一個金額，會另開 PayPal 付款頁，付款在 PayPal 完成。'));

    var grid = app.el('div', 'donate-amounts');
    AMOUNTS.forEach(function (n) {
      var b = app.el('button', 'btn choice merge', 'NT$ ' + n);
      b.type = 'button';
      b.addEventListener('click', function () { go(paypalUrl(handle(), n)); m.close(); });
      grid.appendChild(b);
    });
    card.appendChild(grid);

    var custom = app.el('button', 'btn choice local', '自己輸入金額');
    custom.type = 'button';
    custom.addEventListener('click', function () { go(paypalUrl(handle())); m.close(); });
    card.appendChild(custom);

    var cancel = app.el('button', 'linkbtn', '不用了，謝謝');
    cancel.type = 'button';
    cancel.addEventListener('click', m.close);
    card.appendChild(cancel);
    cancel.focus();
  };

  root.TurtleDonate = api;
})(typeof window !== 'undefined' ? window : globalThis);
