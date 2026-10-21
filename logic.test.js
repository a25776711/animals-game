const assert = require('node:assert/strict');
const L = require('./logic.js');

const t = (name, fn) => { fn(); console.log('ok  -', name); };
const summary = (events) => events.map(e => [e.type, e.cells, e.packs]);

t('全家福：9 格都不同 → +5，全清', () => {
  const ev = L.resolveAll([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(summary(ev), [['family', [0, 1, 2, 3, 4, 5, 6, 7, 8], 5]]);
});

t('只有一對 → 碰 +1', () => {
  assert.deepEqual(summary(L.resolveAll([0, 1, 2, 3, 4, 5, 6, 7, 0])), [['pair', [0, 8], 1]]);
});

t('橫列三連 → 連線 +3', () => {
  assert.deepEqual(summary(L.resolveAll([1, 1, 1, 0, 2, 3, 4, 5, 6])), [['line', [0, 1, 2], 3]]);
});

t('直行與對角三連', () => {
  assert.deepEqual(summary(L.resolveAll([4, 0, 1, 4, 2, 3, 4, 5, 6])), [['line', [0, 3, 6], 3]]);
  assert.deepEqual(summary(L.resolveAll([7, 0, 1, 2, 7, 3, 4, 5, 7])), [['line', [0, 4, 8], 3]]);
  assert.deepEqual(summary(L.resolveAll([0, 1, 8, 2, 8, 3, 8, 4, 5])), [['line', [2, 4, 6], 3]]);
});

t('有多組時全部都要對完（4 組碰）', () => {
  const ev = L.resolveAll([0, 0, 1, 1, 2, 2, 3, 3, 4]);
  assert.deepEqual(summary(ev), [
    ['pair', [0, 1], 1], ['pair', [2, 3], 1], ['pair', [4, 5], 1], ['pair', [6, 7], 1]
  ]);
});

t('連線 + 兩組碰，依左→右、上→下順序', () => {
  const ev = L.resolveAll([1, 1, 1, 2, 3, 2, 3, 4, 5]);
  assert.deepEqual(summary(ev), [['line', [0, 1, 2], 3], ['pair', [3, 5], 1], ['pair', [4, 6], 1]]);
});

t('事件依最前面那格排序（碰在前、連線在後）', () => {
  const ev = L.resolveAll([7, 0, 1, 2, 3, 7, 5, 5, 5]);
  assert.deepEqual(summary(ev), [['pair', [0, 5], 1], ['line', [6, 7, 8], 3]]);
});

t('五格同色 L 形：連線先取，剩下的湊成碰', () => {
  const ev = L.resolveAll([4, 4, 4, 4, 0, 1, 4, 2, 3]);
  assert.deepEqual(summary(ev), [['line', [0, 1, 2], 3], ['pair', [3, 6], 1]]);
});

t('四格同色（非連線）→ 兩組碰', () => {
  assert.deepEqual(summary(L.resolveAll([5, 0, 5, 1, 2, 3, 5, 4, 5])), [['pair', [0, 2], 1], ['pair', [6, 8], 1]]);
});

t('單回合最多 4 個事件', () => {
  let max = 0;
  for (let n = 0; n < 20000; n++) {
    const g = Array.from({ length: 9 }, () => L.drawColor(9));
    max = Math.max(max, L.resolveAll(g).length);
  }
  assert.ok(max <= 4, `max=${max}`);
});

t('未填滿的盤面：空格不參與，也不算全家福', () => {
  assert.deepEqual(L.resolveAll([0, 1, 2, 3, 4, 5, 6, 7, null]), []);
  assert.deepEqual(L.resolveAll([null, null, null, null, null, null, null, null, null]), []);
  assert.deepEqual(summary(L.resolveAll([2, null, 2, null, null, null, null, null, null])), [['pair', [0, 2], 1]]);
});

t('每個格子只會被使用一次', () => {
  for (let n = 0; n < 5000; n++) {
    const g = Array.from({ length: 9 }, () => L.drawColor(9));
    const used = L.resolveAll(g).flatMap(e => e.cells);
    assert.equal(new Set(used).size, used.length);
  }
});

t('resolveAll 不改動輸入', () => {
  const g = [1, 1, 1, 0, 2, 3, 4, 5, 6];
  const copy = g.slice();
  L.resolveAll(g);
  assert.deepEqual(g, copy);
});

t('emptyIndexes 依左→右、上→下，drawColor 範圍正確', () => {
  assert.deepEqual(L.emptyIndexes([1, null, 2, null, 3, null, 4, null, 5]), [1, 3, 5, 7]);
  assert.equal(L.emptyGrid().length, 9);
  assert.equal(L.drawColor(9, () => 0), 0);
  assert.equal(L.drawColor(9, () => 0.9999), 8);
});

console.log('\n全部通過');
