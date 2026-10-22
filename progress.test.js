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

t('開包解鎖「初次開包」，不會重複解鎖，並讓烏龜錢包 +1', () => {
  const p = P.defaultProfile();
  assert.deepEqual(ids(P.record(p, 'open', {}, 100)), ['first_open']);
  assert.equal(p.wallet.turtles, 1);
  assert.deepEqual(P.record(p, 'open', {}, 200), []);
  assert.equal(p.achievements.first_open, 100);
  assert.equal(p.wallet.turtles, 2);
});

t('每次紀錄都會增加版本號 rev', () => {
  const p = P.defaultProfile();
  P.record(p, 'open', {}, 1);
  P.record(p, 'lucky', {}, 2);
  assert.equal(p.rev, 2);
  assert.equal(p.updatedAt, 2);
});

t('碰 / 連線 / 全家福 各自計數並解鎖', () => {
  const p = P.defaultProfile();
  assert.deepEqual(ids(P.record(p, 'match', { type: 'pair' }, 1)), ['first_pair']);
  assert.deepEqual(ids(P.record(p, 'match', { type: 'line' }, 2)), ['first_line']);
  assert.deepEqual(ids(P.record(p, 'match', { type: 'family' }, 3)), ['first_family']);
  assert.deepEqual([p.stats.pairs, p.stats.lines, p.stats.families], [1, 1, 1]);
});

t('單回合連鎖取最大值；局終統計場次與最佳紀錄', () => {
  const p = P.defaultProfile();
  assert.deepEqual(ids(P.record(p, 'round', { chain: 3 }, 1)), ['chain_3']);
  assert.deepEqual(ids(P.record(p, 'round', { chain: 4 }, 2)), ['chain_4']);
  P.record(p, 'end', { rounds: 12, gained: 35 }, 3);
  P.record(p, 'end', { rounds: 5, gained: 9 }, 4);
  assert.deepEqual([p.stats.games, p.stats.bestRounds, p.stats.bestGained], [2, 12, 35]);
  assert.ok(p.achievements.rounds_10 && p.achievements.gained_30);
});

t('9 種顏色都當過幸運色 → 色彩收藏家', () => {
  const p = P.defaultProfile();
  for (let c = 0; c < 8; c++) assert.ok(!ids(P.record(p, 'start', { lucky: c }, 1)).includes('all_lucky'));
  assert.deepEqual(ids(P.record(p, 'start', { lucky: 8 }, 2)), ['all_lucky']);
});

t('補給與轉盤：次數與最大獎，只有轉盤才算轉盤獎', () => {
  const p = P.defaultProfile();
  assert.deepEqual(ids(P.record(p, 'claim', { amount: 200, wheel: false }, 1)), ['first_claim']);
  assert.equal(p.stats.wheelBest, 0);
  assert.deepEqual(ids(P.record(p, 'claim', { amount: 350, wheel: true }, 2)), ['wheel_350']);
  assert.equal(p.stats.wheelBest, 350);
  assert.equal(p.stats.claims, 2);
});

t('小遊戲成績：賽跑、21 點、翻牌', () => {
  const p = P.defaultProfile();
  assert.deepEqual(ids(P.record(p, 'race', { won: false, odds: 9 }, 1)), []);
  assert.deepEqual(ids(P.record(p, 'race', { won: true, odds: 3 }, 2)), ['race_win']);
  assert.deepEqual(ids(P.record(p, 'race', { won: true, odds: 8.5 }, 3)), ['race_big']);
  assert.deepEqual(ids(P.record(p, 'bj', { result: 'lose' }, 4)), []);
  assert.deepEqual(ids(P.record(p, 'bj', { result: 'win' }, 5)), ['bj_win']);
  assert.deepEqual(ids(P.record(p, 'bj', { result: 'blackjack' }, 6)), ['bj_natural']);
  assert.equal(p.stats.bjWins, 2);
  assert.deepEqual(ids(P.record(p, 'mem', { moves: 11 }, 7)), []);
  assert.deepEqual(ids(P.record(p, 'mem', { moves: 10 }, 8)), ['mem_perfect']);
});

t('抽卡：次數、傳說與收集種類', () => {
  const p = P.defaultProfile();
  assert.deepEqual(ids(P.record(p, 'gacha', { draws: 1, legendaries: 0 }, 1)), ['gacha_1']);
  p.cards['0-0'] = 3;
  P.record(p, 'gacha', { draws: 10, legendaries: 1 }, 2);
  assert.ok(p.achievements.legend_1);
  for (let c = 0; c < 9; c++) for (let r = 0; r < 4; r++) p.cards[c + '-' + r] = 1;
  assert.deepEqual(ids(P.record(p, 'gacha', { draws: 1, legendaries: 0 }, 3)).sort(), ['collect_18', 'collect_36']);
});

t('normalize：壞資料變回預設、負數與 NaN 變 0、保留合法成就', () => {
  assert.deepEqual(P.normalize(null), P.defaultProfile());
  assert.deepEqual(P.normalize('xx'), P.defaultProfile());
  const p = P.normalize({
    v: 2,
    stats: { opened: -5, pairs: 'abc', lines: 3.9, games: Infinity },
    luckyUsed: { 2: true, 99: true, x: true, 4: false },
    achievements: { first_open: 123, bad: 'no', future_one: 456 },
    wallet: { money: 12.7, turtles: -3 },
    daily: { day: '2026-10-21', claimed: [true, 'yes', false, true] },
    gifts: { starter: true, firstLogin: 'true' },
    cards: { '0-0': 2, '9-0': 5, '1-4': 1, 'x': 3, '8-3': 1.9 },
    pity: -1, rev: 7, timeMark: 99
  });
  assert.deepEqual([p.stats.opened, p.stats.pairs, p.stats.lines, p.stats.games], [0, 0, 3, 0]);
  assert.deepEqual(Object.keys(p.luckyUsed), ['2']);
  assert.deepEqual(p.achievements, { first_open: 123, future_one: 456 });
  assert.deepEqual(p.wallet, { money: 12, turtles: 0 });
  assert.deepEqual(p.daily, { day: '2026-10-21', claimed: [true, false, false] });
  assert.deepEqual(p.gifts, { starter: true, firstLogin: false });
  assert.deepEqual(p.cards, { '0-0': 2, '8-3': 1 });
  assert.deepEqual([p.pity, p.rev, p.timeMark], [0, 7, 99]);
});

t('舊版（v1）存檔遷移：過去開出的烏龜算進錢包、錢從 0 開始', () => {
  const p = P.normalize({ v: undefined, stats: { opened: 49, pairs: 3 }, luckyUsed: { 2: true }, achievements: { first_open: 5 }, updatedAt: 9 });
  assert.equal(p.wallet.turtles, 49);
  assert.equal(p.wallet.money, 0);
  assert.equal(p.rev, 1);
  assert.deepEqual(p.gifts, { starter: false, firstLogin: false });
  assert.equal(p.achievements.first_open, 5);
});

t('舊版存檔只要有進度就不算「全新」，避免登入時被空白檔覆蓋', () => {
  const old = P.normalize({ stats: { opened: 3 }, achievements: {} });
  assert.equal(P.isFresh(old), false);
  assert.equal(P.isFresh(P.normalize({ stats: {}, achievements: { first_open: 5 } })), false);
  assert.equal(P.isFresh(P.normalize({ stats: {}, achievements: {} })), true);
  assert.equal(P.decideSync(P.defaultProfile(), old, null), 'download');
  assert.equal(P.decideSync(old, null, null), 'upload');
});

t('normalize 後再 JSON 往返結果不變', () => {
  const p = P.defaultProfile();
  P.record(p, 'open', {}, 5);
  P.record(p, 'start', { lucky: 1 }, 6);
  p.cards['2-1'] = 4;
  p.daily = { day: '2026-01-02', claimed: [true, false, true] };
  assert.deepEqual(P.normalize(JSON.parse(JSON.stringify(p))), p);
});

const touched = (fn) => { const p = P.defaultProfile(); fn(p); return p; };
const rich = () => touched(p => { P.record(p, 'open', {}, 10); p.wallet.money = 100; });

t('同步判斷：雲端沒有或只是空白 → 上傳；本機只是空白 → 下載', () => {
  assert.equal(P.decideSync(rich(), null, null), 'upload');
  assert.equal(P.decideSync(rich(), P.defaultProfile(), null), 'upload');
  assert.equal(P.decideSync(P.defaultProfile(), rich(), null), 'download');
  assert.equal(P.decideSync(P.defaultProfile(), P.defaultProfile(), null), 'upload');
});

t('同步判斷：內容相同不打擾', () => {
  const a = rich();
  assert.equal(P.decideSync(a, P.clone(a), null), 'same');
});

// Firestore 讀回來時，物件的欄位是照字母排序，不是照寫入的先後
const sortKeys = (v) => Array.isArray(v) ? v.map(sortKeys)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])]))
  : v;

const unsorted = () => touched(p => {
  P.record(p, 'open', {}, 10);
  p.achievements = { [P.DEFS[3].id]: 30, [P.DEFS[0].id]: 10, [P.DEFS[5].id]: 20 };
  p.cards = { '8-3': 1, '0-0': 2, '3-1': 1 };
  p.shop.owned = { 'theme-sakura': true, 'hat-bow': true };
});

t('同步判斷：只是欄位順序不同（Firestore 會照字母排）不算不一致', () => {
  const a = unsorted();
  const remote = P.normalize(sortKeys(JSON.parse(JSON.stringify(a))));
  assert.notEqual(JSON.stringify(Object.keys(a.achievements)), JSON.stringify(Object.keys(remote.achievements)));
  assert.ok(P.sameContent(a, remote));
  assert.equal(P.decideSync(a, remote, a.rev), 'same');
  assert.equal(P.decideSync(a, remote, null), 'same');
});

t('同步判斷：關分頁時來不及記下同步點，也不會誤問（兩邊版本和更新時間一樣就是同一份）', () => {
  const a = unsorted();
  const remote = P.clone(a);
  remote.pet.fullness = (remote.pet.fullness + 7) % 100;
  assert.equal(P.sameContent(a, remote), false);
  assert.equal(P.decideSync(a, remote, a.rev - 1), 'same');
  assert.equal(P.decideSync(a, remote, null), 'same');
});

t('同步判斷：真的各自有新進度，版本一樣也要問', () => {
  const base = unsorted();
  const a = P.clone(base), b = P.clone(base);
  P.record(a, 'open', {}, 50);
  P.record(b, 'lucky', {}, 60);
  assert.equal(a.rev, b.rev);
  assert.equal(P.decideSync(a, b, base.rev - 1), 'ask');
  assert.equal(P.decideSync(a, b, null), 'ask');
});

t('同步判斷：只有一邊在上次同步後有變動 → 不用問', () => {
  const base = rich();
  const local = P.clone(base);
  const remote = P.clone(base);
  P.record(local, 'open', {}, 20);
  assert.equal(P.decideSync(local, remote, base.rev), 'upload');
  assert.equal(P.decideSync(remote, local, base.rev), 'download');
});

t('同步判斷：兩邊都有新變動、或不知道上次同步點 → 要問', () => {
  const base = rich();
  const a = P.clone(base), b = P.clone(base);
  P.record(a, 'open', {}, 20);
  P.record(b, 'lucky', {}, 21);
  assert.equal(P.decideSync(a, b, base.rev), 'ask');
  assert.equal(P.decideSync(a, b, null), 'ask');
});

t('resolve：選這台 / 選雲端，且不改動輸入', () => {
  const local = rich(); local.wallet.money = 10;
  const remote = rich(); remote.wallet.money = 999; remote.rev = 9;
  const snap = JSON.stringify([local, remote]);
  const a = P.resolve(local, remote, 'local', false, 50);
  const b = P.resolve(local, remote, 'cloud', false, 50);
  assert.equal(a.wallet.money, 10);
  assert.equal(b.wallet.money, 999);
  assert.equal(a.rev, 10);
  assert.equal(a.updatedAt, 50);
  assert.equal(JSON.stringify([local, remote]), snap);
});

t('resolve：成就可選擇保留兩邊（聯集、時間取較早），不保留則只用選的那邊', () => {
  const local = rich(); local.achievements = { first_pair: 30, first_open: 10 };
  const remote = rich(); remote.achievements = { first_open: 5, open_100: 40 };
  const keep = P.resolve(local, remote, 'cloud', true, 50);
  assert.deepEqual(Object.keys(keep.achievements).sort(), ['first_open', 'first_pair', 'open_100']);
  assert.equal(keep.achievements.first_open, 5);
  const only = P.resolve(local, remote, 'cloud', false, 50);
  assert.deepEqual(Object.keys(only.achievements).sort(), ['first_open', 'open_100']);
});

t('resolve：禮物旗標一律聯集（避免靠切換選項重複領）', () => {
  const local = rich(); local.gifts = { starter: true, firstLogin: true };
  const remote = rich(); remote.gifts = { starter: true, firstLogin: false };
  assert.deepEqual(P.resolve(local, remote, 'cloud', false, 1).gifts, { starter: true, firstLogin: true });
});

t('resolve：同一天的補給領取紀錄取聯集；不同天用較新的那天', () => {
  const local = rich(); local.daily = { day: '2026-10-21', claimed: [true, false, false] };
  const remote = rich(); remote.daily = { day: '2026-10-21', claimed: [false, true, false] };
  assert.deepEqual(P.resolve(local, remote, 'cloud', false, 1).daily.claimed, [true, true, false]);
  remote.daily = { day: '2026-10-22', claimed: [false, false, false] };
  assert.deepEqual(P.resolve(local, remote, 'local', false, 1).daily, { day: '2026-10-22', claimed: [false, false, false] });
});

t('resolve：時間標記取較大值', () => {
  const local = rich(); local.timeMark = 500;
  const remote = rich(); remote.timeMark = 900;
  assert.equal(P.resolve(local, remote, 'local', false, 1).timeMark, 900);
});

t('summary 摘要欄位', () => {
  const p = P.defaultProfile();
  P.record(p, 'open', {}, 1);
  p.wallet.money = 70;
  p.cards['0-0'] = 2;
  assert.deepEqual(P.summary(p), { achievements: 1, opened: 1, games: 0, money: 70, turtles: 1, cards: 1, updatedAt: 1 });
});

console.log('\n全部通過');
