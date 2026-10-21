(function (root) {
  'use strict';

  var isNode = typeof module !== 'undefined' && module.exports;
  var R = isNode ? require('./rng.js') : root.TurtleRng;
  var P = isNode ? require('./progress.js') : root.TurtleProgress;

  var COLOR_COUNT = 9;
  var RARITIES = [
    { id: 0, name: '普通', rate: 60 },
    { id: 1, name: '稀有', rate: 28 },
    { id: 2, name: '史詩', rate: 10 },
    { id: 3, name: '傳說', rate: 2 }
  ];
  var COST = { single: 100, ten: 900 };
  var PITY_LIMIT = 50;
  var TEN_MIN_RARITY = 1;

  function pickRarity(rng) {
    var r = rng() * 100;
    for (var i = 0; i < RARITIES.length; i++) {
      r -= RARITIES[i].rate;
      if (r < 0) return RARITIES[i].id;
    }
    return 0;
  }

  function drawOne(pity, rng) {
    rng = rng || R.random;
    var rarity = pity >= PITY_LIMIT - 1 ? 3 : pickRarity(rng);
    var color = Math.floor(rng() * COLOR_COUNT);
    return { card: { color: color, rarity: rarity }, pity: rarity === 3 ? 0 : pity + 1 };
  }

  function drawMany(pity, count, rng) {
    rng = rng || R.random;
    var cards = [];
    var cur = pity;
    for (var i = 0; i < count; i++) {
      var r = drawOne(cur, rng);
      cards.push(r.card);
      cur = r.pity;
    }
    if (count >= 10 && !cards.some(function (c) { return c.rarity >= TEN_MIN_RARITY; })) {
      cards[cards.length - 1].rarity = TEN_MIN_RARITY;
    }
    return { cards: cards, pity: cur };
  }

  function apply(p, cards, pity, nowMs) {
    cards.forEach(function (c) {
      var key = c.color + '-' + c.rarity;
      p.cards[key] = (p.cards[key] || 0) + 1;
    });
    p.pity = pity;
    return P.record(p, 'gacha', {
      draws: cards.length,
      legendaries: cards.filter(function (c) { return c.rarity === 3; }).length
    }, nowMs);
  }

  var api = {
    RARITIES: RARITIES, COST: COST, PITY_LIMIT: PITY_LIMIT, TEN_MIN_RARITY: TEN_MIN_RARITY,
    drawOne: drawOne, drawMany: drawMany, apply: apply
  };

  if (isNode) module.exports = api;
  else root.TurtleGacha = api;
})(typeof window !== 'undefined' ? window : globalThis);
