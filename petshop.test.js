const assert = require('node:assert/strict');
const P = require('./progress.js');
const E = require('./economy.js');
const Pet = require('./pet.js');
const Shop = require('./shop.js');

const t = (name, fn) => { fn(); console.log('ok  -', name); };
const MIN = 60 * 1000;
const T0 = Date.UTC(2026, 9, 21, 4, 0);

function rich(turtles = 5000) {
  const p = P.defaultProfile();
  p.wallet.turtles = turtles;
  return p;
}

t('升級門檻：1→2 需 100、2→3 需 200，累計 Lv.5=1000、Lv.10=4500', () => {
  assert.deepEqual(P.petLevelInfo(0), { level: 1, into: 0, need: 100 });
  assert.deepEqual(P.petLevelInfo(99), { level: 1, into: 99, need: 100 });
  assert.deepEqual(P.petLevelInfo(100), { level: 2, into: 0, need: 200 });
  assert.deepEqual(P.petLevelInfo(299), { level: 2, into: 199, need: 200 });
  assert.equal(P.petLevelInfo(1000).level, 5);
  assert.equal(P.petLevelInfo(999).level, 4);
  assert.equal(P.petLevelInfo(4500).level, 10);
  assert.equal(P.petLevelInfo(10 ** 9).level, 99);
});

t('體型階段與餵食費用（等級 × 20，最多 200）', () => {
  assert.deepEqual([1, 4, 5, 9, 10, 19, 20].map(l => Pet.stage(l).name), ['幼龜', '幼龜', '少年龜', '少年龜', '成年龜', '成年龜', '長老龜']);
  assert.ok(Pet.stage(30).scale > Pet.stage(1).scale);
  assert.deepEqual([1, 2, 5, 10, 11, 50].map(Pet.feedCost), [20, 40, 100, 200, 200, 200]);
});

t('飽足度每 10 分鐘 -1，不會低於 0；還沒領養時不變', () => {
  const pet = { since: T0, fedAt: T0, fullness: 60 };
  assert.equal(Pet.fullnessNow(pet, T0), 60);
  assert.equal(Pet.fullnessNow(pet, T0 + 9 * MIN), 60);
  assert.equal(Pet.fullnessNow(pet, T0 + 10 * MIN), 59);
  assert.equal(Pet.fullnessNow(pet, T0 + 3 * 60 * MIN), 42);
  assert.equal(Pet.fullnessNow(pet, T0 + 30 * 24 * 60 * MIN), 0);
  assert.equal(Pet.fullnessNow({ since: 0, fedAt: 0, fullness: 60 }, T0 + 10 ** 9), 60);
  assert.equal(Pet.fullnessNow(pet, T0 - 5 * MIN), 60);
});

t('心情依飽足度分四階', () => {
  assert.deepEqual([100, 70, 69, 40, 39, 15, 14, 0].map(f => Pet.mood(f).text), ['很開心', '很開心', '還不錯', '還不錯', '有點餓了', '有點餓了', '好餓…', '好餓…']);
});

t('領養：只會發生一次，起始飽足度 60，並算作有遊玩', () => {
  const p = rich();
  assert.equal(Pet.adopt(p, T0), true);
  assert.equal(Pet.adopt(p, T0 + 1000), false);
  assert.deepEqual([p.pet.since, p.pet.fedAt, p.pet.fullness], [T0, T0, 60]);
  assert.equal(p.rev, 1);
});

t('餵食：扣烏龜、飽足度 +25、經驗 +20、次數 +1', () => {
  const p = rich(100);
  const r = Pet.feed(p, T0);
  assert.deepEqual([r.ok, r.cost, r.level, r.leveledUp], [true, 20, 1, false]);
  assert.equal(p.wallet.turtles, 80);
  assert.deepEqual([p.pet.fullness, p.pet.xp, p.pet.feeds, p.pet.fedAt], [85, 20, 1, T0]);
});

t('餵食：烏龜不夠 → 不扣、狀態不變', () => {
  const p = rich(19);
  Pet.adopt(p, T0);
  const snap = JSON.stringify(p);
  const r = Pet.feed(p, T0);
  assert.deepEqual([r.ok, r.reason, r.cost], [false, 'poor', 20]);
  assert.equal(JSON.stringify(p), snap);
});

t('餵食：已經吃飽（100）不能再餵；加到上限 100', () => {
  const p = rich();
  Pet.feed(p, T0);
  const r2 = Pet.feed(p, T0);
  assert.equal(p.pet.fullness, 100);
  assert.equal(r2.ok, true);
  const before = p.wallet.turtles;
  const r3 = Pet.feed(p, T0);
  assert.deepEqual([r3.ok, r3.reason, p.wallet.turtles], [false, 'full', before]);
});

t('過了幾小時會變餓，又可以餵', () => {
  const p = rich();
  Pet.feed(p, T0);
  Pet.feed(p, T0);
  assert.equal(Pet.fullnessNow(p.pet, T0 + 5 * 60 * MIN), 70);
  assert.equal(Pet.feed(p, T0 + 5 * 60 * MIN).ok, true);
  assert.equal(p.pet.fullness, 95);
});

t('升級：經驗滿了升一級，之後餵食變貴', () => {
  const p = rich();
  p.pet.xp = 80;
  const r = Pet.feed(p, T0);
  assert.deepEqual([r.leveledUp, r.level], [true, 2]);
  assert.equal(Pet.feedCost(r.level), 40);
});

t('餵食的成就：第一次、累計 20 次、升到 Lv.5', () => {
  const p = rich(100000);
  const r1 = Pet.feed(p, T0);
  assert.deepEqual(r1.unlocked.map(d => d.id), ['feed_1']);
  let ids = [];
  for (let i = 1; i < 20; i++) {
    p.pet.fullness = 0; p.pet.fedAt = T0 + i * 1000 * MIN;
    ids = ids.concat(Pet.feed(p, T0 + i * 1000 * MIN).unlocked.map(d => d.id));
  }
  assert.ok(ids.includes('feed_20'));
  p.pet.xp = 980; p.pet.fullness = 0;
  const lv = Pet.feed(p, T0 + 99999 * MIN);
  assert.ok(lv.unlocked.some(d => d.id === 'pet_lv5'));
});

t('調整手機時間往回：時間標記擋住，不會讓小龜變餓或重複計算', () => {
  const p = rich();
  p.timeMark = T0 + 100 * MIN;
  Pet.adopt(p, T0);
  assert.equal(p.pet.since, T0 + 100 * MIN);
  Pet.feed(p, T0 - 999 * MIN);
  assert.equal(p.pet.fedAt, T0 + 100 * MIN);
});

t('改名：去掉控制字元與前後空白、最多 8 個字（算 emoji 為一個字）、空白變回預設', () => {
  assert.equal(Pet.cleanName('  小綠  '), '小綠');
  assert.equal(Pet.cleanName('一二三四五六七八九十'), '一二三四五六七八');
  assert.equal(Pet.cleanName('🐢🐢🐢🐢🐢🐢🐢🐢🐢'), '🐢🐢🐢🐢🐢🐢🐢🐢');
  assert.equal(Pet.cleanName('a\u0000b\nc'), 'abc');
  assert.equal(Pet.cleanName('   '), '小龜');
  assert.equal(Pet.cleanName(null), '小龜');
  const p = rich();
  assert.equal(Pet.rename(p, '阿龜', T0), '阿龜');
  assert.equal(p.pet.name, '阿龜');
});

t('換顏色：只接受 0~8 的整數', () => {
  const p = rich();
  assert.equal(Pet.setColor(p, 5, T0), true);
  assert.equal(p.pet.color, 5);
  [-1, 9, 2.5, NaN, undefined].forEach(c => assert.equal(Pet.setColor(p, c, T0), false));
  assert.equal(p.pet.color, 5);
});

t('商品目錄：id 不重複、價格是非負整數、預設品免費、配件都有圖示', () => {
  assert.equal(new Set(Shop.ITEMS.map(i => i.id)).size, Shop.ITEMS.length);
  Shop.ITEMS.forEach(i => {
    assert.ok(Number.isInteger(i.price) && i.price >= 0, i.id);
    assert.ok(Shop.TYPES.some(ty => ty.id === i.type), i.id);
    assert.match(i.id, /^(theme|board|hat)-[a-z]+$/);
    if (i.type === 'hat') assert.ok(i.emoji, i.id);
    else assert.match(i.skin, /^[a-z]+$/);
  });
  assert.equal(Shop.find('theme-default').price, 0);
  assert.equal(Shop.find('board-default').price, 0);
});

t('預設品一開始就擁有並已裝備，其他沒有', () => {
  const p = rich();
  assert.equal(Shop.isOwned(p, 'theme-default'), true);
  assert.equal(Shop.isEquipped(p, 'theme-default'), true);
  assert.equal(Shop.isEquipped(p, 'board-default'), true);
  assert.equal(Shop.isOwned(p, 'theme-sakura'), false);
  assert.equal(Shop.isOwned(p, 'nope'), false);
});

t('購買：扣烏龜、取得、算成就；不能買第二次也不會重複扣', () => {
  const p = rich(1000);
  const r = Shop.buy(p, 'theme-sakura', T0);
  assert.equal(r.ok, true);
  assert.equal(p.wallet.turtles, 700);
  assert.equal(Shop.isOwned(p, 'theme-sakura'), true);
  assert.deepEqual(r.unlocked.map(d => d.id), ['shop_1']);
  const again = Shop.buy(p, 'theme-sakura', T0);
  assert.deepEqual([again.ok, again.reason, p.wallet.turtles], [false, 'owned', 700]);
});

t('購買：烏龜不夠、商品不存在、預設品 → 不扣錢', () => {
  const p = rich(100);
  assert.deepEqual(Shop.buy(p, 'theme-sakura', T0), { ok: false, reason: 'poor', need: 300 });
  assert.equal(Shop.buy(p, 'nope', T0).reason, 'unknown');
  assert.equal(Shop.buy(p, 'theme-default', T0).reason, 'owned');
  assert.equal(p.wallet.turtles, 100);
});

t('購買：需要小龜等級的商品，等級不夠買不了、夠了才行', () => {
  const p = rich(5000);
  assert.deepEqual(Shop.buy(p, 'hat-crown', T0), { ok: false, reason: 'level', need: 10 });
  assert.equal(Shop.buy(p, 'theme-galaxy', T0).reason, 'level');
  assert.equal(p.wallet.turtles, 5000);
  p.pet.xp = 4500;
  assert.equal(Shop.buy(p, 'hat-crown', T0).ok, true);
  assert.equal(p.wallet.turtles, 4200);
});

t('裝備：沒買過不能裝備；背景、棋盤、配件各自獨立', () => {
  const p = rich(5000);
  assert.equal(Shop.equip(p, 'theme-sakura', T0), false);
  Shop.buy(p, 'theme-sakura', T0);
  Shop.buy(p, 'board-shell', T0);
  Shop.buy(p, 'hat-bow', T0);
  assert.equal(Shop.equip(p, 'theme-sakura', T0), true);
  assert.equal(Shop.equip(p, 'board-shell', T0), true);
  assert.equal(Shop.equip(p, 'hat-bow', T0), true);
  assert.deepEqual([p.shop.theme, p.shop.board, p.pet.accessory], ['sakura', 'shell', 'hat-bow']);
  assert.deepEqual(['theme-sakura', 'board-shell', 'hat-bow'].map(id => Shop.isEquipped(p, id)), [true, true, true]);
  assert.equal(Shop.isEquipped(p, 'theme-default'), false);
  Shop.equip(p, 'theme-default', T0);
  assert.equal(p.shop.theme, 'default');
  Shop.removeHat(p, T0);
  assert.equal(p.pet.accessory, '');
});

t('買齊 8 件解鎖「收藏愛好者」', () => {
  const p = rich(100000);
  const ids = ['theme-sakura', 'theme-mint', 'theme-sunset', 'theme-ocean', 'board-shell', 'board-check', 'board-dots', 'hat-flower'];
  let last;
  ids.forEach(id => { last = Shop.buy(p, id, T0); });
  assert.ok(last.unlocked.some(d => d.id === 'shop_8'));
});

t('小龜與商店資料：存檔往返、壞資料會被清理', () => {
  const p = rich();
  Pet.feed(p, T0);
  Pet.rename(p, '阿龜', T0);
  Shop.buy(p, 'theme-mint', T0);
  Shop.equip(p, 'theme-mint', T0);
  assert.deepEqual(P.normalize(JSON.parse(JSON.stringify(p))), p);

  const bad = P.normalize({
    v: 2,
    pet: { color: 99, name: 12345, xp: -5, fullness: 500, fedAt: 'x', feeds: 1.9, since: -1, accessory: 'DROP TABLE' },
    shop: { owned: { 'theme-mint': true, 'hack': true, 'hat-x': false, 'board-dots': 'yes' }, theme: 'a b', board: 'x'.repeat(50) }
  });
  assert.deepEqual(bad.pet, { color: 0, name: '小龜', xp: 0, fullness: 100, fedAt: 0, feeds: 1, since: 0, accessory: '' });
  assert.deepEqual(bad.shop, { owned: { 'theme-mint': true }, theme: 'default', board: 'default' });
});

t('舊存檔（沒有小龜與商店欄位）載入會補上預設值', () => {
  const old = P.normalize({ v: 2, stats: { opened: 3 }, wallet: { money: 5, turtles: 3 } });
  assert.deepEqual(old.pet, P.defaultProfile().pet);
  assert.deepEqual(old.shop, P.defaultProfile().shop);
});

t('小龜、商店資料不同也算「內容不同」，同步時會被比對', () => {
  const a = rich(), b = JSON.parse(JSON.stringify(a));
  assert.equal(P.sameContent(a, b), true);
  b.pet.name = '別隻';
  assert.equal(P.sameContent(a, b), false);
  const c = JSON.parse(JSON.stringify(a));
  c.shop.owned['theme-mint'] = true;
  assert.equal(P.sameContent(a, c), false);
});

console.log('\n全部通過');
