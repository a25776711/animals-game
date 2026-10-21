const assert = require('node:assert/strict');
const D = require('./donate.js');

const t = (name, fn) => { fn(); console.log('ok  -', name); };

t('連結格式：名字加金額加幣別', () => {
  assert.equal(D.paypalUrl('turtle-fan', 100), 'https://paypal.me/turtle-fan/100TWD');
  assert.equal(D.paypalUrl('turtle-fan'), 'https://paypal.me/turtle-fan');
});

t('名字空的或有奇怪字元就不產生連結，避免被塞進別的網址', () => {
  ['', null, undefined, 'a/b', 'a b', 'a?x=1', 'a#b', '../x', 'a@b', 'x'.repeat(41), 'https://evil.com'].forEach((h) => {
    assert.equal(D.paypalUrl(h, 100), null, String(h));
    assert.equal(D.paypalUrl(h), null, String(h));
  });
});

t('金額一定要是合理的正整數', () => {
  ['50', 0, -5, 1.5, NaN, Infinity, 100001, null].forEach((a) => {
    assert.equal(D.paypalUrl('name', a), null, String(a));
  });
  assert.equal(D.paypalUrl('name', 100000), 'https://paypal.me/name/100000TWD');
});

t('預設金額選項都能產生連結', () => {
  assert.deepEqual(D.AMOUNTS, [50, 100, 200, 500]);
  D.AMOUNTS.forEach((n) => assert.ok(D.paypalUrl('name', n)));
});

console.log('\n全部通過');
