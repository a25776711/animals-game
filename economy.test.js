const assert = require('node:assert/strict');
const P = require('./progress.js');
const E = require('./economy.js');

const t = (name, fn) => { fn(); console.log('ok  -', name); };
const at = (d, h, m = 0) => Date.UTC(2026, 9, d, h - 8, m);
const states = (p, ms) => E.dailyStatus(p, ms).slots.map(s => s.state).join(',');

t('設定：三個時段、固定 200（= 4 次 50 包）、首次登入 250（= 5 次 50 包）', () => {
  assert.deepEqual(E.CFG.slotHours, [6, 12, 18]);
  assert.equal(E.CFG.dailyFixed, 4 * 50);
  assert.equal(E.CFG.firstLoginMoney, 5 * 50);
});

t('轉盤：最大 350（7 次 50 包）、最小 30（3 次 10 包）、權重總和 100', () => {
  const amounts = E.CFG.wheel.map(w => w.amount);
  assert.equal(Math.max(...amounts), 7 * 50);
  assert.equal(Math.min(...amounts), 3 * 10);
  assert.equal(E.CFG.wheel.reduce((s, w) => s + w.weight, 0), 100);
});

t('轉盤期望值略低於直接領（想賭才轉）', () => {
  const ev = E.wheelExpected();
  assert.ok(ev < E.CFG.dailyFixed && ev > 150, 'ev=' + ev);
});

t('轉盤抽到的機率與權重一致（大量模擬）', () => {
  const counts = new Array(E.CFG.wheel.length).fill(0);
  const N = 200000;
  for (let i = 0; i < N; i++) counts[E.spinWheel()]++;
  E.CFG.wheel.forEach((w, i) => assert.ok(Math.abs(counts[i] / N - w.weight / 100) < 0.01, `第 ${i} 格`));
});

t('spinWheel 邊界：rng=0 → 第 0 格，rng≈1 → 最後一格', () => {
  assert.equal(E.spinWheel(() => 0), 0);
  assert.equal(E.spinWheel(() => 0.999999), E.CFG.wheel.length - 1);
});

t('日期與時段固定用台灣時間（UTC+8），不受手機時區影響', () => {
  assert.equal(E.dayKey(Date.UTC(2026, 9, 20, 15, 59)), '2026-10-20');
  assert.equal(E.dayKey(Date.UTC(2026, 9, 20, 16, 0)), '2026-10-21');
  const p = P.defaultProfile();
  assert.equal(states(p, Date.UTC(2026, 9, 20, 21, 59)), 'locked,locked,locked');
  assert.equal(states(p, Date.UTC(2026, 9, 20, 22, 0)), 'ready,locked,locked');
});

t('一天內的時段狀態：6 點前全鎖、6 / 12 / 18 點依序開放', () => {
  const p = P.defaultProfile();
  assert.equal(states(p, at(21, 5, 59)), 'locked,locked,locked');
  assert.equal(states(p, at(21, 6)), 'ready,locked,locked');
  assert.equal(states(p, at(21, 12)), 'ready,ready,locked');
  assert.equal(states(p, at(21, 23, 59)), 'ready,ready,ready');
});

t('領取固定 200：錢增加、該時段變已領、不能重複領', () => {
  const p = P.defaultProfile();
  const r = E.claimDaily(p, 0, 'fixed', at(21, 7), () => 0);
  assert.deepEqual([r.ok, r.amount, r.wheelIndex], [true, 200, null]);
  assert.equal(p.wallet.money, 200);
  assert.equal(states(p, at(21, 7)), 'claimed,locked,locked');
  assert.equal(E.claimDaily(p, 0, 'fixed', at(21, 8), () => 0).ok, false);
  assert.equal(p.wallet.money, 200);
});

t('還沒到時間的時段不能領', () => {
  const p = P.defaultProfile();
  assert.equal(E.claimDaily(p, 1, 'fixed', at(21, 11, 59), () => 0).ok, false);
  assert.equal(p.wallet.money, 0);
  assert.equal(E.claimDaily(p, 9, 'fixed', at(21, 20), () => 0).ok, false);
});

t('走轉盤：金額由轉盤決定，並記錄轉盤獎', () => {
  const p = P.defaultProfile();
  const r = E.claimDaily(p, 0, 'wheel', at(21, 7), () => 0.15);
  assert.equal(r.wheelIndex, 1);
  assert.equal(r.amount, 350);
  assert.equal(p.wallet.money, 350);
  assert.equal(p.stats.wheelBest, 350);
  assert.ok(r.unlocked.some(d => d.id === 'wheel_350'));
});

t('三個時段可以在同一天晚上一次領完（只要都已開放）', () => {
  const p = P.defaultProfile();
  [0, 1, 2].forEach(i => assert.ok(E.claimDaily(p, i, 'fixed', at(21, 20), () => 0).ok));
  assert.equal(p.wallet.money, 600);
  assert.equal(states(p, at(21, 20)), 'claimed,claimed,claimed');
});

t('跨日不可領：昨天沒領的過期，新的一天重新計算', () => {
  const p = P.defaultProfile();
  E.claimDaily(p, 0, 'fixed', at(21, 7), () => 0);
  assert.equal(states(p, at(22, 5)), 'locked,locked,locked');
  assert.equal(states(p, at(22, 7)), 'ready,locked,locked');
  assert.equal(p.daily.day, '2026-10-22');
  const r = E.claimDaily(p, 1, 'fixed', at(22, 13), () => 0);
  assert.ok(r.ok);
  assert.equal(p.wallet.money, 400);
});

t('領了新的一天之後，昨天的時段不會被補領', () => {
  const p = P.defaultProfile();
  E.dailyStatus(p, at(21, 20));
  assert.equal(states(p, at(22, 6)), 'ready,locked,locked');
});

t('調整手機時間往回：時間不會倒退，不能重複領同一天', () => {
  const p = P.defaultProfile();
  E.claimDaily(p, 0, 'fixed', at(21, 7), () => 0);
  assert.equal(E.claimDaily(p, 0, 'fixed', at(20, 7), () => 0).ok, false);
  assert.equal(states(p, at(20, 7)), 'claimed,locked,locked');
});

t('調整手機時間往前再改回：要等真實時間追上，沒有多賺', () => {
  const p = P.defaultProfile();
  E.claimDaily(p, 0, 'fixed', at(25, 7), () => 0);
  assert.equal(E.dailyStatus(p, at(21, 7)).day, '2026-10-25');
  assert.equal(E.claimDaily(p, 0, 'fixed', at(21, 7), () => 0).ok, false);
  assert.equal(p.wallet.money, 200);
});

t('領補給會增加版本號（算作有遊玩）；讀狀態不會', () => {
  const p = P.defaultProfile();
  E.dailyStatus(p, at(21, 7));
  assert.equal(p.rev, 0);
  E.claimDaily(p, 0, 'fixed', at(21, 7), () => 0);
  assert.equal(p.rev, 1);
});

t('新手禮 50 只給一次，且不算有遊玩（rev 仍為 0）', () => {
  const p = P.defaultProfile();
  assert.equal(E.grantStarter(p), true);
  assert.equal(E.grantStarter(p), false);
  assert.deepEqual([p.wallet.money, p.rev], [50, 0]);
});

t('首次登入禮 250 只給一次', () => {
  const p = P.defaultProfile();
  assert.equal(E.grantFirstLogin(p, 5), true);
  assert.equal(E.grantFirstLogin(p, 6), false);
  assert.deepEqual([p.wallet.money, p.rev], [250, 1]);
});

t('買包：錢不夠不能買、買了扣錢；退回剩餘包數加回錢', () => {
  const p = P.defaultProfile();
  p.wallet.money = 60;
  assert.equal(E.buyPacks(p, 50, 1), true);
  assert.equal(p.wallet.money, 10);
  assert.equal(E.buyPacks(p, 20, 2), false);
  assert.equal(p.wallet.money, 10);
  E.refundPacks(p, 7, 3);
  assert.equal(p.wallet.money, 17);
  assert.equal(E.buyPacks(p, 0, 4), false);
  assert.equal(E.buyPacks(p, -5, 4), false);
});

t('烏龜收支：不夠不能花、不能花負數', () => {
  const p = P.defaultProfile();
  E.earnTurtles(p, 100, 1);
  assert.equal(E.spendTurtles(p, 101, 2), false);
  assert.equal(E.spendTurtles(p, 30, 3), true);
  assert.equal(p.wallet.turtles, 70);
  assert.equal(E.spendTurtles(p, -10, 4), false);
  assert.equal(p.wallet.turtles, 70);
});

console.log('\n全部通過');
