const assert = require('node:assert/strict');
const C = require('./chat.js');

const t = (name, fn) => { fn(); console.log('ok  -', name); };

t('暱稱：中英文數字底線減號可以，前後空白會去掉', () => {
  ['小龜', 'turtle', 'Turtle_01', 'a-b', '烏龜AB12', '  小龜王  '].forEach((n) => assert.ok(C.checkNick(n).ok, n));
  assert.equal(C.checkNick('  小龜王  ').name, '小龜王');
});

t('暱稱：長度 2～12 個字（用字數算，不是位元組）', () => {
  assert.equal(C.checkNick('a').ok, false);
  assert.equal(C.checkNick('龜').ok, false);
  assert.equal(C.checkNick('').ok, false);
  assert.equal(C.checkNick(null).ok, false);
  assert.ok(C.checkNick('一二三四五六七八九十一二').ok);
  assert.equal(C.checkNick('一二三四五六七八九十一二三').ok, false);
});

t('暱稱：空格、符號、emoji、全形字母都不行', () => {
  ['a b', 'a.b', 'a@b', '小龜!', '🐢龜龜', 'ＡＢＣ', 'a\tb', '<b>', "a'b", 'a/b'].forEach((n) => assert.equal(C.checkNick(n).ok, false, n));
});

t('暱稱：不能冒充官方或作者', () => {
  ['admin', 'Admin01', 'SYSTEM', '作者', '我是作者', '管理員', '客服小姐', '官方帳號'].forEach((n) => assert.equal(C.checkNick(n).ok, false, n));
});

t('暱稱獨特：大小寫視為同一個', () => {
  assert.equal(C.checkNick('Turtle').key, 'turtle');
  assert.equal(C.checkNick('TURTLE').key, C.checkNick('turtle').key);
  assert.notEqual(C.checkNick('turtle1').key, C.checkNick('turtle').key);
  assert.equal(C.checkNick('小龜').key, '小龜');
});

t('訊息：多餘空白與換行會整理成一個空格', () => {
  assert.equal(C.checkMessage('  哈囉  \n\n大家好 ').text, '哈囉 大家好');
});

t('訊息：空的不送出，也不顯示錯誤字', () => {
  assert.deepEqual(C.checkMessage('   \n '), { ok: false, reason: '' });
  assert.equal(C.checkMessage(null).ok, false);
});

t('訊息：最多 200 個字', () => {
  assert.ok(C.checkMessage('龜'.repeat(200)).ok);
  assert.equal(C.checkMessage('龜'.repeat(201)).ok, false);
});

t('訊息：不能貼網址（各種寫法）', () => {
  ['看 http://a.b', 'HTTPS://x.y', 'www.example.com', '去 WWW.x.y', 'a://b', 'ftp://x', '\nhttp://x'].forEach((m) => assert.equal(C.checkMessage(m).ok, false, m));
  assert.ok(C.checkMessage('我今天抽到傳說龜！').ok);
});

t('時間顯示：兩位數的時:分', () => {
  const d = new Date(2026, 9, 22, 7, 5).getTime();
  assert.equal(C.timeLabel(d), '07:05');
});

console.log('\n全部通過');
