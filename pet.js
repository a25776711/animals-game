(function (root) {
  'use strict';

  var isNode = typeof module !== 'undefined' && module.exports;
  var P = isNode ? require('./progress.js') : root.TurtleProgress;
  var E = isNode ? require('./economy.js') : root.TurtleEconomy;

  var DECAY_MS = 10 * 60 * 1000;
  var FEED_GAIN = 25;
  var FEED_XP = 20;
  var START_FULLNESS = 60;
  var MAX_NAME = 8;
  var STAGES = [
    { from: 1, name: '幼龜', scale: 0.8 },
    { from: 5, name: '少年龜', scale: 0.95 },
    { from: 10, name: '成年龜', scale: 1.05 },
    { from: 20, name: '長老龜', scale: 1.15 }
  ];

  function stage(level) {
    var s = STAGES[0];
    STAGES.forEach(function (x) { if (level >= x.from) s = x; });
    return s;
  }

  function feedCost(level) {
    return Math.min(200, 20 * level);
  }

  function fullnessNow(pet, nowMs) {
    if (!pet.since) return pet.fullness;
    var steps = Math.floor(Math.max(0, nowMs - pet.fedAt) / DECAY_MS);
    return Math.max(0, pet.fullness - steps);
  }

  function mood(fullness) {
    if (fullness >= 70) return { face: '😊', text: '很開心' };
    if (fullness >= 40) return { face: '🙂', text: '還不錯' };
    if (fullness >= 15) return { face: '😟', text: '有點餓了' };
    return { face: '😢', text: '好餓…' };
  }

  function adopt(p, nowMs) {
    if (p.pet.since) return false;
    var t = E.clock(p, nowMs);
    p.pet.since = t;
    p.pet.fedAt = t;
    p.pet.fullness = START_FULLNESS;
    P.touch(p, t);
    return true;
  }

  function feed(p, nowMs) {
    adopt(p, nowMs);
    var t = E.clock(p, nowMs);
    var pet = p.pet;
    var cur = fullnessNow(pet, t);
    if (cur >= 100) return { ok: false, reason: 'full' };
    var before = P.petLevelInfo(pet.xp).level;
    var cost = feedCost(before);
    if (!E.spendTurtles(p, cost, t)) return { ok: false, reason: 'poor', cost: cost };
    pet.fullness = Math.min(100, cur + FEED_GAIN);
    pet.fedAt = t;
    pet.xp += FEED_XP;
    pet.feeds += 1;
    var after = P.petLevelInfo(pet.xp).level;
    var unlocked = P.evaluate(p, t);
    return { ok: true, cost: cost, level: after, leveledUp: after > before, unlocked: unlocked };
  }

  function cleanName(name) {
    var s = String(name == null ? '' : name).replace(/[\u0000-\u001f]/g, '').trim();
    return Array.from(s).slice(0, MAX_NAME).join('') || '小龜';
  }

  function rename(p, name, nowMs) {
    p.pet.name = cleanName(name);
    P.touch(p, nowMs);
    return p.pet.name;
  }

  function setColor(p, color, nowMs) {
    if (!(color >= 0 && color <= 8) || color % 1 !== 0) return false;
    p.pet.color = color;
    P.touch(p, nowMs);
    return true;
  }

  var api = {
    DECAY_MS: DECAY_MS, FEED_GAIN: FEED_GAIN, FEED_XP: FEED_XP, START_FULLNESS: START_FULLNESS, MAX_NAME: MAX_NAME,
    stage: stage, feedCost: feedCost, fullnessNow: fullnessNow, mood: mood,
    adopt: adopt, feed: feed, cleanName: cleanName, rename: rename, setColor: setColor
  };

  if (isNode) module.exports = api;
  else root.TurtlePet = api;
})(typeof window !== 'undefined' ? window : globalThis);
