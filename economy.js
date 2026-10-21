(function (root) {
  'use strict';

  var P = typeof module !== 'undefined' && module.exports ? require('./progress.js') : root.TurtleProgress;

  var CFG = {
    starterMoney: 50,
    firstLoginMoney: 250,
    dailyFixed: 200,
    slotHours: [6, 12, 18],
    wheel: [
      { amount: 100, weight: 12 },
      { amount: 350, weight: 10 },
      { amount: 30, weight: 8 },
      { amount: 200, weight: 16 },
      { amount: 60, weight: 10 },
      { amount: 300, weight: 14 },
      { amount: 150, weight: 14 },
      { amount: 250, weight: 16 }
    ]
  };

  var HOUR_MS = 3600000;
  var DAY_MS = 24 * HOUR_MS;
  var TW_OFFSET = 8 * HOUR_MS;

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function dayKey(ms) {
    var d = new Date(ms + TW_OFFSET);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }

  function slotStart(ms, hour) {
    var dayStart = Math.floor((ms + TW_OFFSET) / DAY_MS) * DAY_MS - TW_OFFSET;
    return dayStart + hour * HOUR_MS;
  }

  function clock(p, nowMs) {
    var t = Math.max(nowMs, p.timeMark);
    p.timeMark = t;
    return t;
  }

  function dailyStatus(p, nowMs) {
    var t = clock(p, nowMs);
    var key = dayKey(t);
    if (p.daily.day !== key) p.daily = { day: key, claimed: [false, false, false] };
    return {
      day: key,
      now: t,
      slots: CFG.slotHours.map(function (hour, i) {
        var at = slotStart(t, hour);
        return {
          index: i,
          hour: hour,
          unlockAt: at,
          state: p.daily.claimed[i] ? 'claimed' : (t >= at ? 'ready' : 'locked')
        };
      })
    };
  }

  function spinWheel(rng) {
    var total = CFG.wheel.reduce(function (s, w) { return s + w.weight; }, 0);
    var r = (rng || Math.random)() * total;
    for (var i = 0; i < CFG.wheel.length; i++) {
      r -= CFG.wheel[i].weight;
      if (r < 0) return i;
    }
    return CFG.wheel.length - 1;
  }

  function wheelExpected() {
    var total = CFG.wheel.reduce(function (s, w) { return s + w.weight; }, 0);
    return CFG.wheel.reduce(function (s, w) { return s + w.amount * w.weight / total; }, 0);
  }

  function claimDaily(p, index, mode, nowMs, rng) {
    var st = dailyStatus(p, nowMs);
    var slot = st.slots[index];
    if (!slot || slot.state !== 'ready') return { ok: false };

    var wheelIndex = null;
    var amount = CFG.dailyFixed;
    if (mode === 'wheel') {
      wheelIndex = spinWheel(rng);
      amount = CFG.wheel[wheelIndex].amount;
    }
    p.daily.claimed[index] = true;
    p.wallet.money += amount;
    var unlocked = P.record(p, 'claim', { amount: amount, wheel: mode === 'wheel' }, st.now);
    return { ok: true, amount: amount, wheelIndex: wheelIndex, unlocked: unlocked };
  }

  function grantStarter(p) {
    if (p.gifts.starter) return false;
    p.gifts.starter = true;
    p.wallet.money += CFG.starterMoney;
    return true;
  }

  function grantFirstLogin(p, nowMs) {
    if (p.gifts.firstLogin) return false;
    p.gifts.firstLogin = true;
    p.wallet.money += CFG.firstLoginMoney;
    P.touch(p, nowMs);
    return true;
  }

  function buyPacks(p, packs, nowMs) {
    if (!(packs > 0) || p.wallet.money < packs) return false;
    p.wallet.money -= packs;
    P.touch(p, nowMs);
    return true;
  }

  function refundPacks(p, packs, nowMs) {
    if (!(packs > 0)) return;
    p.wallet.money += packs;
    P.touch(p, nowMs);
  }

  function spendTurtles(p, n, nowMs) {
    if (!(n > 0) || p.wallet.turtles < n) return false;
    p.wallet.turtles -= n;
    P.touch(p, nowMs);
    return true;
  }

  function earnTurtles(p, n, nowMs) {
    if (!(n > 0)) return;
    p.wallet.turtles += n;
    P.touch(p, nowMs);
  }

  var api = {
    CFG: CFG, clock: clock, dayKey: dayKey, dailyStatus: dailyStatus, spinWheel: spinWheel, wheelExpected: wheelExpected,
    claimDaily: claimDaily, grantStarter: grantStarter, grantFirstLogin: grantFirstLogin,
    buyPacks: buyPacks, refundPacks: refundPacks, spendTurtles: spendTurtles, earnTurtles: earnTurtles
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TurtleEconomy = api;
})(typeof window !== 'undefined' ? window : globalThis);
