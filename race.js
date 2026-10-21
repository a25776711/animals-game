(function (root) {
  'use strict';

  var R = typeof module !== 'undefined' && module.exports ? require('./rng.js') : root.TurtleRng;

  var LANES = 9;
  var RETURN_RATE = 0.9;

  function makeRace(rng) {
    rng = rng || R.random;
    var weights = [];
    for (var i = 0; i < LANES; i++) weights.push(0.6 + rng());
    var total = weights.reduce(function (s, w) { return s + w; }, 0);
    var probs = weights.map(function (w) { return w / total; });
    var odds = probs.map(function (p) { return Math.floor(RETURN_RATE / p * 10) / 10; });
    return { weights: weights, probs: probs, odds: odds };
  }

  function drawOrder(weights, rng) {
    rng = rng || R.random;
    var left = weights.map(function (w, i) { return { lane: i, w: w }; });
    var order = [];
    while (left.length) {
      var total = left.reduce(function (s, x) { return s + x.w; }, 0);
      var r = rng() * total;
      var pick = left.length - 1;
      for (var i = 0; i < left.length; i++) {
        r -= left[i].w;
        if (r < 0) { pick = i; break; }
      }
      order.push(left[pick].lane);
      left.splice(pick, 1);
    }
    return order;
  }

  function payout(bet, odds) {
    return Math.floor(bet * odds);
  }

  var api = { LANES: LANES, RETURN_RATE: RETURN_RATE, makeRace: makeRace, drawOrder: drawOrder, payout: payout };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TurtleRace = api;
})(typeof window !== 'undefined' ? window : globalThis);
