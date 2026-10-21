(function (root) {
  'use strict';

  var R = typeof module !== 'undefined' && module.exports ? require('./rng.js') : root.TurtleRng;

  var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var SUITS = ['♠', '♥', '♦', '♣'];
  var DECKS = 6;
  var RESHUFFLE_BELOW = 30;
  var BLACKJACK_RETURN = 2.2;

  function newShoe(rng) {
    var cards = [];
    for (var d = 0; d < DECKS; d++) {
      for (var s = 0; s < SUITS.length; s++) {
        for (var r = 0; r < RANKS.length; r++) cards.push({ rank: RANKS[r], suit: SUITS[s] });
      }
    }
    return R.shuffle(cards, rng);
  }

  function cardValue(rank) {
    if (rank === 'A') return 11;
    if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
    return Number(rank);
  }

  function handValue(cards) {
    var total = 0;
    var aces = 0;
    cards.forEach(function (c) {
      total += cardValue(c.rank);
      if (c.rank === 'A') aces++;
    });
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return {
      total: total,
      soft: aces > 0,
      bust: total > 21,
      blackjack: cards.length === 2 && total === 21
    };
  }

  function draw(state) {
    return state.shoe.pop();
  }

  function settle(state) {
    var p = handValue(state.player);
    var d = handValue(state.dealer);
    var outcome;
    var payout;

    if (p.blackjack && d.blackjack) { outcome = 'push'; payout = state.bet; }
    else if (p.blackjack) { outcome = 'blackjack'; payout = Math.floor(state.bet * BLACKJACK_RETURN); }
    else if (d.blackjack) { outcome = 'lose'; payout = 0; }
    else if (p.bust) { outcome = 'lose'; payout = 0; }
    else if (d.bust || p.total > d.total) { outcome = 'win'; payout = state.bet * 2; }
    else if (p.total === d.total) { outcome = 'push'; payout = state.bet; }
    else { outcome = 'lose'; payout = 0; }

    state.stage = 'done';
    state.outcome = outcome;
    state.payout = payout;
    return state;
  }

  function dealerPlay(state) {
    while (handValue(state.dealer).total < 17) state.dealer.push(draw(state));
  }

  function start(shoe, bet) {
    var state = { shoe: shoe, player: [], dealer: [], bet: bet, doubled: false, stage: 'player', outcome: null, payout: 0 };
    state.player.push(draw(state));
    state.dealer.push(draw(state));
    state.player.push(draw(state));
    state.dealer.push(draw(state));
    if (handValue(state.player).blackjack || handValue(state.dealer).blackjack) settle(state);
    return state;
  }

  function stand(state) {
    if (state.stage !== 'player') return state;
    dealerPlay(state);
    return settle(state);
  }

  function hit(state) {
    if (state.stage !== 'player') return state;
    state.player.push(draw(state));
    var v = handValue(state.player);
    if (v.bust) return settle(state);
    if (v.total === 21) return stand(state);
    return state;
  }

  function canDouble(state) {
    return state.stage === 'player' && state.player.length === 2 && !state.doubled;
  }

  function double(state) {
    if (!canDouble(state)) return state;
    state.bet *= 2;
    state.doubled = true;
    state.player.push(draw(state));
    if (handValue(state.player).bust) return settle(state);
    return stand(state);
  }

  function needsReshuffle(shoe) {
    return shoe.length < RESHUFFLE_BELOW;
  }

  var api = {
    DECKS: DECKS, BLACKJACK_RETURN: BLACKJACK_RETURN, newShoe: newShoe, handValue: handValue, start: start, hit: hit, stand: stand,
    double: double, canDouble: canDouble, needsReshuffle: needsReshuffle
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TurtleBlackjack = api;
})(typeof window !== 'undefined' ? window : globalThis);
