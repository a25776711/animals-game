const assert = require('node:assert/strict');
const P = require('./progress.js');

const t = (name, fn) => { fn(); console.log('ok  -', name); };
const ids = (list) => list.map(d => d.id);

t('成就定義：id 不重複、門檻為正、統計欄位存在', () => {
  const p = P.defaultProfile();
  assert.equal(new Set(P.DEFS.map(d => d.id)).size, P.DEFS.length);
  P.DEFS.forEach(d => {
    assert.ok(d.target > 0);
    assert.ok(Number.isInteger(P.value(p, d)), d.id);
  });
});

t('開包解鎖「初次開包」，且不會重複解鎖', () => {
  const p = P.defaultProfile();
  assert.deepEqual(ids(P.record(p, 'open', {}, 100)), ['first_open']);
  assert.equal(p.achievements.first_open, 100);
  assert.deepEqual(P.record(p, 'open', {}, 200), []);
  assert.equal(p.achievements.first_open, 100);
});

t('碰 / 連線 / 全家福 各自計數並解鎖', () => {
  const p = P.defaultProfile();
  assert.deepEqual(ids(P.record(p, 'match', { type: 'pair' }, 1)), ['first_pair']);
  assert.deepEqual(ids(P.record(p, 'match', { type: 'line' }, 2)), ['first_line']);
  assert.deepEqual(ids(P.record(p, 'match', { type: 'family' }, 3)), ['first_family']);
  assert.deepEqual([p.stats.pairs, p.stats.lines, p.stats.families], [1, 1, 1]);
});

t('幸運色計數與成就', () => {
  const p = P.defaultProfile();
  assert.deepEqual(ids(P.record(p, 'lucky', {}, 1)), ['lucky_1']);
  for (let i = 0; i < 28; i++) P.record(p, 'lucky', {}, 2);
  assert.deepEqual(ids(P.record(p, 'lucky', {}, 3)), ['lucky_30']);
});

t('單回合連鎖：取最大值，3 組與 4 組分別解鎖', () => {
  const p = P.defaultProfile();
  assert.deepEqual(ids(P.record(p, 'round', { chain: 3 }, 1)), ['chain_3']);
  assert.deepEqual(ids(P.record(p, 'round', { chain: 2 }, 2)), []);
  assert.equal(p.stats.maxChain, 3);
  assert.deepEqual(ids(P.record(p, 'round', { chain: 4 }, 3)), ['chain_4']);
});

t('局終：場次、最佳回合數、最佳獲得包數', () => {
  const p = P.defaultProfile();
  P.record(p, 'end', { rounds: 12, gained: 35 }, 1);
  assert.deepEqual([p.stats.games, p.stats.bestRounds, p.stats.bestGained], [1, 12, 35]);
  assert.ok(p.achievements.rounds_10 && p.achievements.gained_30);
  P.record(p, 'end', { rounds: 5, gained: 9 }, 2);
  assert.deepEqual([p.stats.games, p.stats.bestRounds, p.stats.bestGained], [2, 12, 35]);
});

t('9 種顏色都當過幸運色 → 色彩收藏家', () => {
  const p = P.defaultProfile();
  for (let c = 0; c < 8; c++) assert.ok(!ids(P.record(p, 'start', { lucky: c }, 1)).includes('all_lucky'));
  assert.deepEqual(ids(P.record(p, 'start', { lucky: 8 }, 2)), ['all_lucky']);
});

t('合併：數值取較大、成就與幸運色取聯集、時間取較早', () => {
  const a = P.defaultProfile(), b = P.defaultProfile();
  P.record(a, 'open', {}, 100);
  for (let i = 0; i < 99; i++) P.record(a, 'open', {}, 150);
  P.record(b, 'match', { type: 'pair' }, 50);
  P.record(b, 'open', {}, 60);
  P.record(b, 'start', { lucky: 3 }, 70);
  const m = P.merge(a, b);
  assert.equal(m.stats.opened, 100);
  assert.equal(m.stats.pairs, 1);
  assert.deepEqual(Object.keys(m.luckyUsed), ['3']);
  assert.equal(m.achievements.first_open, 60);
  assert.ok(m.achievements.first_pair && m.achievements.open_100);
  assert.equal(m.updatedAt, 150);
});

t('合併不會改動輸入', () => {
  const a = P.defaultProfile(), b = P.defaultProfile();
  P.record(a, 'open', {}, 1);
  const snap = JSON.stringify([a, b]);
  P.merge(a, b);
  assert.equal(JSON.stringify([a, b]), snap);
});

t('normalize：壞資料變回預設、負數與 NaN 變 0、保留合法成就', () => {
  assert.deepEqual(P.normalize(null), P.defaultProfile());
  assert.deepEqual(P.normalize('xx'), P.defaultProfile());
  const p = P.normalize({
    stats: { opened: -5, pairs: 'abc', lines: 3.9, games: Infinity },
    luckyUsed: { 2: true, 99: true, x: true, 4: false },
    achievements: { first_open: 123, bad: 'no', future_one: 456 }
  });
  assert.deepEqual([p.stats.opened, p.stats.pairs, p.stats.lines, p.stats.games], [0, 0, 3, 0]);
  assert.deepEqual(Object.keys(p.luckyUsed), ['2']);
  assert.deepEqual(p.achievements, { first_open: 123, future_one: 456 });
});

t('normalize 後再 JSON 往返結果不變', () => {
  const p = P.defaultProfile();
  P.record(p, 'open', {}, 5);
  P.record(p, 'start', { lucky: 1 }, 6);
  assert.deepEqual(P.normalize(JSON.parse(JSON.stringify(p))), p);
});

console.log('\n全部通過');
