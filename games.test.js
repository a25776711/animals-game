const assert = require('node:assert/strict');
const P = require('./progress.js');
const G = require('./gacha.js');
const B = require('./blackjack.js');
const Race = require('./race.js');
const M = require('./memory.js');
const R = require('./rng.js');

const t = (name, fn) => { fn(); console.log('ok  -', name); };

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const card = (rank, suit = '♠') => ({ rank, suit });
const rigged = (...ranks) => ranks.slice().reverse().map(r => card(r));
const play = (bet, ...ranks) => B.start(rigged(...ranks), bet);

t('rng：shuffle 保留所有元素且不改動原陣列', () => {
  const src = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const out = R.shuffle(src, seeded(1));
  assert.deepEqual(src, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(out.slice().sort(), src);
  const r = R.random();
  assert.ok(r >= 0 && r < 1);
});

t('抽卡：稀有度機率加總 100，十連價為單抽 9 折', () => {
  assert.equal(G.RARITIES.reduce((s, r) => s + r.rate, 0), 100);
  assert.equal(G.COST.ten, G.COST.single * 10 * 0.9);
});

t('抽卡：大量抽出的稀有度分布接近公告機率', () => {
  const rng = seeded(7);
  const N = 300000;
  const count = [0, 0, 0, 0];
  let pity = 0;
  for (let i = 0; i < N; i++) {
    const r = G.drawOne(pity, rng);
    count[r.card.rarity]++;
    pity = r.pity;
  }
  assert.ok(Math.abs(count[0] / N - 0.60) < 0.01, '普通');
  assert.ok(Math.abs(count[1] / N - 0.28) < 0.01, '稀有');
  assert.ok(Math.abs(count[2] / N - 0.10) < 0.01, '史詩');
  const effective = (1 - Math.pow(0.98, 50)) / 0.02;
  assert.ok(Math.abs(count[3] / N - 1 / effective) < 0.002, '傳說（含保底實際約 3.1%）');
});

t('抽卡：保底 —— 累積 49 抽沒傳說，第 50 抽必出傳說並歸零', () => {
  const noLegend = () => 0.01;
  let pity = 0;
  for (let i = 0; i < 49; i++) {
    const r = G.drawOne(pity, () => 0.7);
    assert.notEqual(r.card.rarity, 3);
    pity = r.pity;
  }
  assert.equal(pity, 49);
  const last = G.drawOne(pity, () => 0.7);
  assert.equal(last.card.rarity, 3);
  assert.equal(last.pity, 0);
  assert.equal(G.drawOne(0, () => 0.995).pity, 0);
});

t('抽卡：顏色 0~8 均勻', () => {
  const rng = seeded(11);
  const counts = new Array(9).fill(0);
  for (let i = 0; i < 90000; i++) counts[G.drawOne(0, rng).card.color]++;
  counts.forEach(c => assert.ok(Math.abs(c / 90000 - 1 / 9) < 0.01));
});

t('抽卡：十連保證至少一張稀有以上', () => {
  const rng = seeded(3);
  for (let i = 0; i < 20000; i++) {
    const r = G.drawMany(0, 10, rng);
    assert.equal(r.cards.length, 10);
    assert.ok(r.cards.some(c => c.rarity >= 1));
  }
});

t('抽卡：保底計數跨抽延續（十連最後結果帶回）', () => {
  const r = G.drawMany(45, 10, () => 0.7);
  assert.ok(r.cards.some(c => c.rarity === 3));
  assert.ok(r.pity < 10);
});

t('抽卡：套用結果 → 卡片數量、保底、統計與成就', () => {
  const p = P.defaultProfile();
  const unlocked = G.apply(p, [{ color: 2, rarity: 3 }, { color: 2, rarity: 3 }, { color: 5, rarity: 0 }], 7, 100);
  assert.deepEqual(p.cards, { '2-3': 2, '5-0': 1 });
  assert.equal(p.pity, 7);
  assert.deepEqual([p.stats.gachaDraws, p.stats.legendaries], [3, 2]);
  assert.deepEqual(unlocked.map(d => d.id).sort(), ['gacha_1', 'legend_1']);
});

t('21 點：手牌點數（A 可當 1 或 11）', () => {
  assert.deepEqual(B.handValue([card('A'), card('K')]), { total: 21, soft: true, bust: false, blackjack: true });
  assert.deepEqual(B.handValue([card('A'), card('A'), card('9')]), { total: 21, soft: true, bust: false, blackjack: false });
  assert.deepEqual(B.handValue([card('10'), card('6'), card('9')]), { total: 25, soft: false, bust: true, blackjack: false });
  assert.equal(B.handValue([card('7'), card('7'), card('7')]).blackjack, false);
  assert.equal(B.handValue([card('A'), card('5')]).total, 16);
  assert.equal(B.handValue([card('A'), card('5'), card('K')]).total, 16);
});

t('21 點：牌靴 6 副 312 張，各點數張數正確', () => {
  const shoe = B.newShoe(seeded(2));
  assert.equal(shoe.length, 312);
  assert.equal(shoe.filter(c => c.rank === 'A').length, 24);
  assert.equal(shoe.filter(c => c.rank === 'K').length, 24);
});

t('21 點：玩家 Blackjack 賠 6:5（下注 100 → 拿回 220；下注 50 → 拿回 110）', () => {
  const s = play(100, 'A', '9', 'K', '8');
  assert.deepEqual([s.stage, s.outcome, s.payout], ['done', 'blackjack', 220]);
  assert.equal(play(50, 'A', '9', 'K', '8').payout, 110);
});

t('21 點：雙方 Blackjack 平手退回本金；只有莊家 Blackjack 輸', () => {
  assert.deepEqual([play(100, 'A', 'A', 'K', 'K').outcome, play(100, 'A', 'A', 'K', 'K').payout], ['push', 100]);
  const s = play(100, '9', 'A', '9', 'K');
  assert.deepEqual([s.outcome, s.payout], ['lose', 0]);
});

t('21 點：停牌後莊家補到 17 以上；比大小', () => {
  let s = play(100, '10', '10', '10', '7');
  assert.equal(s.stage, 'player');
  B.stand(s);
  assert.deepEqual([s.outcome, s.payout], ['win', 200]);

  s = play(100, '10', '10', '9', '7');
  B.stand(s);
  assert.deepEqual([s.outcome, s.payout], ['win', 200]);

  s = play(100, '10', '10', '8', '9');
  B.stand(s);
  assert.deepEqual([s.outcome, s.payout], ['lose', 0]);

  s = play(100, '10', '10', '8', '8');
  B.stand(s);
  assert.deepEqual([s.outcome, s.payout], ['push', 100]);
});

t('21 點：莊家 16 以下必補牌；補爆則玩家贏；軟 17 停牌', () => {
  let s = play(100, '10', '10', '10', '6', '9');
  B.stand(s);
  assert.equal(s.dealer.length, 3);
  assert.equal(s.outcome, 'win');

  s = play(100, '10', 'A', '9', '6', '10');
  B.stand(s);
  assert.equal(s.dealer.length, 2);
  assert.deepEqual([B.handValue(s.dealer).total, s.outcome], [17, 'win']);
});

t('21 點：要牌爆掉直接輸；湊到 21 自動停牌', () => {
  let s = play(100, '10', '9', '6', '8', '10');
  B.hit(s);
  assert.deepEqual([s.stage, s.outcome, s.payout], ['done', 'lose', 0]);

  s = play(100, '5', '9', '6', '8', '10');
  B.hit(s);
  assert.equal(s.stage, 'done');
  assert.equal(B.handValue(s.player).total, 21);
});

t('21 點：雙倍只能在兩張牌時用，下注變兩倍、只補一張', () => {
  let s = play(100, '5', '9', '6', '8', '10');
  assert.equal(B.canDouble(s), true);
  B.double(s);
  assert.equal(s.bet, 200);
  assert.equal(s.player.length, 3);
  assert.equal(s.stage, 'done');
  assert.equal(s.outcome, 'win');
  assert.equal(s.payout, 400);

  s = play(100, '5', '9', '2', '8', '2');
  B.hit(s);
  assert.equal(B.canDouble(s), false);
  const before = s.bet;
  B.double(s);
  assert.equal(s.bet, before);
});

t('21 點：結束後的操作不會再改變結果', () => {
  const s = play(100, '10', '10', '10', '7');
  B.stand(s);
  const snap = JSON.stringify([s.player, s.dealer, s.outcome, s.payout]);
  B.hit(s); B.stand(s); B.double(s);
  assert.equal(JSON.stringify([s.player, s.dealer, s.outcome, s.payout]), snap);
});

t('21 點：用「17 點以上停牌」的簡單策略，長期莊家略占優勢（約 -2% ~ -10%）', () => {
  const rng = seeded(21);
  let shoe = B.newShoe(rng);
  let bet = 0, back = 0;
  for (let i = 0; i < 150000; i++) {
    if (B.needsReshuffle(shoe)) shoe = B.newShoe(rng);
    const s = B.start(shoe, 1);
    while (s.stage === 'player') {
      if (B.handValue(s.player).total >= 17) B.stand(s); else B.hit(s);
    }
    bet += 1; back += s.payout;
  }
  const edge = back / bet - 1;
  assert.ok(edge < -0.02 && edge > -0.10, 'edge=' + edge.toFixed(4));
});

t('賽跑：機率加總為 1，賠率約為 0.9 / 機率（無條件捨去到小數一位）', () => {
  const r = Race.makeRace(seeded(5));
  assert.equal(r.probs.length, 9);
  assert.ok(Math.abs(r.probs.reduce((s, p) => s + p, 0) - 1) < 1e-9);
  r.odds.forEach((o, i) => {
    assert.ok(o <= 0.9 / r.probs[i] + 1e-9 && o > 0.9 / r.probs[i] - 0.1 - 1e-9);
  });
});

t('賽跑：任何一隻的期望報酬都不超過 90%（莊家有優勢）', () => {
  for (let k = 0; k < 500; k++) {
    const r = Race.makeRace(seeded(100 + k));
    r.probs.forEach((p, i) => assert.ok(p * r.odds[i] <= 0.9 + 1e-9));
  }
});

t('賽跑：名次是 0~8 的排列，且第一名機率與權重一致', () => {
  const weights = [1, 2, 3, 1, 1, 1, 1, 1, 1];
  const total = weights.reduce((s, w) => s + w, 0);
  const rng = seeded(9);
  const wins = new Array(9).fill(0);
  const N = 100000;
  for (let i = 0; i < N; i++) {
    const order = Race.drawOrder(weights, rng);
    assert.deepEqual(order.slice().sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
    wins[order[0]]++;
  }
  weights.forEach((w, i) => assert.ok(Math.abs(wins[i] / N - w / total) < 0.01, '第 ' + i + ' 道'));
});

t('賽跑：實際押注長期報酬 ≈ 90%', () => {
  const rng = seeded(33);
  let back = 0;
  const N = 100000;
  for (let i = 0; i < N; i++) {
    const r = Race.makeRace(rng);
    const pick = Math.floor(rng() * 9);
    const winner = Race.drawOrder(r.weights, rng)[0];
    if (winner === pick) back += Race.payout(100, r.odds[pick]);
  }
  const rate = back / (N * 100);
  assert.ok(rate > 0.84 && rate < 0.94, 'rate=' + rate.toFixed(4));
});

t('賽跑：賠率回報捨去小數', () => {
  assert.equal(Race.payout(50, 3.3), 165);
  assert.equal(Race.payout(10, 2.55), 25);
});

t('翻牌：16 張牌、8 種顏色各 2 張，id 連續', () => {
  const g = M.newGame(seeded(4));
  assert.equal(g.cards.length, 16);
  const byColor = {};
  g.cards.forEach((c, i) => { assert.equal(c.id, i); byColor[c.color] = (byColor[c.color] || 0) + 1; });
  assert.equal(Object.keys(byColor).length, 8);
  Object.values(byColor).forEach(n => assert.equal(n, 2));
});

t('翻牌：翻第一張、配對成功、配對失敗、忽略重複點擊', () => {
  const g = M.newGame(seeded(4));
  const colorOf = (i) => g.cards[i].color;
  const a = 0;
  const pair = g.cards.findIndex((c, i) => i !== a && c.color === colorOf(a));
  const other = g.cards.findIndex((c, i) => i !== a && i !== pair && c.color !== colorOf(a));

  assert.deepEqual(M.flip(g, a), { type: 'first', index: a });
  assert.deepEqual(M.flip(g, a), { type: 'ignore' });
  assert.deepEqual(M.flip(g, other), { type: 'mismatch', a, b: other });
  assert.equal(g.moves, 1);

  M.flip(g, a);
  assert.deepEqual(M.flip(g, pair), { type: 'match', a, b: pair });
  assert.equal(g.moves, 2);
  assert.deepEqual(M.flip(g, a), { type: 'ignore' });
});

t('翻牌：全部配完回傳 win；完美記憶剛好 8 步', () => {
  const g = M.newGame(seeded(6));
  let last;
  const byColor = {};
  g.cards.forEach((c, i) => { (byColor[c.color] = byColor[c.color] || []).push(i); });
  Object.values(byColor).forEach(([x, y]) => { M.flip(g, x); last = M.flip(g, y); });
  assert.equal(last.type, 'win');
  assert.equal(g.moves, 8);
  assert.equal(M.reward(g.moves), 120);
});

t('翻牌：獎勵門檻（超過 22 步完全沒獎勵，報名費白付）', () => {
  const table = [[8, 120], [9, 120], [10, 70], [12, 70], [13, 45], [16, 45], [17, 20], [22, 20], [23, 0], [99, 0]];
  table.forEach(([moves, reward]) => assert.equal(M.reward(moves), reward, moves + ' 步'));
  assert.equal(M.FEE, 50);
});

function memoryPlayer(k, rng) {
  const g = M.newGame(rng);
  let seen = [];
  const remember = (i) => { seen = seen.filter(s => s.index !== i); seen.push({ index: i, color: g.cards[i].color }); if (seen.length > k) seen.shift(); };
  const unseen = (ex) => {
    const pool = g.cards.map((_, i) => i).filter(i => !g.cards[i].matched && i !== ex && !seen.some(s => s.index === i));
    return pool.length ? pool[Math.floor(rng() * pool.length)] : null;
  };
  const anyLeft = (ex) => g.cards.findIndex((c, i) => !c.matched && i !== ex);
  for (;;) {
    let a = null, b = null;
    for (const x of seen) {
      const y = seen.find(z => z.index !== x.index && z.color === x.color && !g.cards[z.index].matched);
      if (y) { a = x.index; b = y.index; break; }
    }
    if (a === null) {
      a = unseen(-1) ?? anyLeft(-1);
      M.flip(g, a); remember(a);
      const known = seen.find(z => z.index !== a && z.color === g.cards[a].color && !g.cards[z.index].matched);
      b = known ? known.index : (unseen(a) ?? anyLeft(a));
    } else {
      M.flip(g, a);
    }
    const r = M.flip(g, b); remember(b);
    if (r.type === 'win') return g.moves;
  }
}

t('每個小遊戲對一般玩家都是淨扣烏龜（賽跑、21 點、翻牌、抽卡都不會讓人穩賺）', () => {
  const rng = seeded(77);
  [0, 2, 4, 6].forEach(k => {
    let net = 0;
    for (let i = 0; i < 3000; i++) net += M.reward(memoryPlayer(k, rng)) - M.FEE;
    assert.ok(net / 3000 < 0, `翻牌 記${k}張 平均淨值 ${(net / 3000).toFixed(1)}`);
  });

  let shoe = B.newShoe(rng), staked = 0, back = 0;
  for (let i = 0; i < 100000; i++) {
    if (B.needsReshuffle(shoe)) shoe = B.newShoe(rng);
    const s = B.start(shoe, 100);
    staked += 100;
    while (s.stage === 'player') { if (B.handValue(s.player).total >= 17) B.stand(s); else B.hit(s); }
    back += s.payout;
  }
  assert.ok(back < staked, '21 點');

  for (let i = 0; i < 300; i++) {
    const r = Race.makeRace(rng);
    r.probs.forEach((p, lane) => assert.ok(p * r.odds[lane] < 1, '賽跑'));
  }
  assert.ok(G.COST.single > 0 && G.COST.ten > 0, '抽卡');
});

console.log('\n全部通過');
