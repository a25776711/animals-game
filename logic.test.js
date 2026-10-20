const assert = require('node:assert/strict');
const { checkBestMatch, fillRandom } = require('./logic.js');

const t = (name, fn) => { fn(); console.log('ok  -', name); };

t('全 9 格不同 → +5 全消', () => {
  const r = checkBestMatch([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(r.type, 'allDifferent');
  assert.equal(r.packs, 5);
  assert.equal(r.cells.length, 9);
});

t('橫列三連 → +3，消該 3 格', () => {
  const r = checkBestMatch([1, 1, 1, 0, 2, 3, 4, 5, 6]);
  assert.deepEqual([r.type, r.packs, r.cells], ['threeInARow', 3, [0, 1, 2]]);
});

t('直行三連', () => {
  const r = checkBestMatch([4, 0, 1, 4, 2, 3, 4, 5, 6]);
  assert.deepEqual([r.type, r.cells], ['threeInARow', [0, 3, 6]]);
});

t('兩條對角線', () => {
  assert.deepEqual(checkBestMatch([7, 0, 1, 2, 7, 3, 4, 5, 7]).cells, [0, 4, 8]);
  assert.deepEqual(checkBestMatch([0, 1, 8, 2, 8, 3, 8, 4, 5]).cells, [2, 4, 6]);
});

t('三連優先於一對（同盤面多種組合時）', () => {
  const r = checkBestMatch([1, 1, 1, 2, 0, 2, 3, 4, 5]);
  assert.equal(r.type, 'threeInARow');
});

t('多條三連時取優先序最前（橫列先於直行）', () => {
  const r = checkBestMatch([1, 1, 1, 1, 0, 2, 1, 3, 4]);
  assert.deepEqual(r.cells, [0, 1, 2]);
});

t('任意兩個相同 → +1，取左→右、上→下第一組', () => {
  const r = checkBestMatch([0, 1, 2, 3, 2, 5, 1, 7, 8]);
  assert.deepEqual([r.type, r.packs, r.cells], ['pair', 1, [1, 6]]);
});

t('全不同但有空格 → 不算全消', () => {
  const r = checkBestMatch([0, 1, 2, 3, 4, 5, 6, 7, null]);
  assert.equal(r.type, 'none');
});

t('空格不參與配對', () => {
  const r = checkBestMatch([null, null, null, 0, 1, 2, 3, 4, 5]);
  assert.equal(r.type, 'none');
});

t('fillRandom 只補空格、不動既有動物', () => {
  const g = fillRandom([3, null, null, 5, null, null, null, null, 8], 9, () => 0);
  assert.deepEqual(g, [3, 0, 0, 5, 0, 0, 0, 0, 8]);
});

t('fillRandom 範圍正確', () => {
  for (let n = 0; n < 500; n++) {
    fillRandom(new Array(9).fill(null), 9).forEach(v => assert.ok(v >= 0 && v < 9));
  }
});

console.log('\n全部通過');
