(function (root) {
  'use strict';

  var R = typeof module !== 'undefined' && module.exports ? require('./rng.js') : root.TurtleRng;

  var FEE = 50;
  var PAIRS = 8;
  var COLOR_COUNT = 9;
  var REWARDS = [
    { max: 9, reward: 120 },
    { max: 12, reward: 70 },
    { max: 16, reward: 45 },
    { max: 22, reward: 20 },
    { max: Infinity, reward: 0 }
  ];

  function newGame(rng) {
    var all = [];
    for (var i = 0; i < COLOR_COUNT; i++) all.push(i);
    var colors = R.shuffle(all, rng).slice(0, PAIRS);
    var cards = R.shuffle(colors.concat(colors), rng).map(function (color, id) {
      return { id: id, color: color, matched: false };
    });
    return { cards: cards, moves: 0, first: null, matchedCount: 0 };
  }

  function flip(game, index) {
    var card = game.cards[index];
    if (!card || card.matched || game.first === index) return { type: 'ignore' };
    if (game.first === null) {
      game.first = index;
      return { type: 'first', index: index };
    }
    var a = game.first;
    game.first = null;
    game.moves++;
    if (game.cards[a].color === card.color) {
      game.cards[a].matched = true;
      card.matched = true;
      game.matchedCount += 2;
      return { type: game.matchedCount === game.cards.length ? 'win' : 'match', a: a, b: index };
    }
    return { type: 'mismatch', a: a, b: index };
  }

  function reward(moves) {
    for (var i = 0; i < REWARDS.length; i++) {
      if (moves <= REWARDS[i].max) return REWARDS[i].reward;
    }
    return 0;
  }

  var api = { FEE: FEE, PAIRS: PAIRS, REWARDS: REWARDS, newGame: newGame, flip: flip, reward: reward };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TurtleMemory = api;
})(typeof window !== 'undefined' ? window : globalThis);
