(function (root) {
  'use strict';

  var isNode = typeof module !== 'undefined' && module.exports;
  var P = isNode ? require('./progress.js') : root.TurtleProgress;
  var E = isNode ? require('./economy.js') : root.TurtleEconomy;

  var TYPES = [
    { id: 'theme', name: '背景' },
    { id: 'board', name: '棋盤' },
    { id: 'hat', name: '配件' }
  ];

  var ITEMS = [
    { id: 'theme-default', type: 'theme', skin: 'default', name: '預設', price: 0 },
    { id: 'theme-sakura', type: 'theme', skin: 'sakura', name: '櫻花', price: 300 },
    { id: 'theme-mint', type: 'theme', skin: 'mint', name: '薄荷', price: 300 },
    { id: 'theme-sunset', type: 'theme', skin: 'sunset', name: '夕陽', price: 500 },
    { id: 'theme-ocean', type: 'theme', skin: 'ocean', name: '海洋', price: 500 },
    { id: 'theme-galaxy', type: 'theme', skin: 'galaxy', name: '星空', price: 800, level: 5 },
    { id: 'board-default', type: 'board', skin: 'default', name: '預設', price: 0 },
    { id: 'board-shell', type: 'board', skin: 'shell', name: '龜殼紋', price: 400 },
    { id: 'board-check', type: 'board', skin: 'check', name: '方格', price: 400 },
    { id: 'board-dots', type: 'board', skin: 'dots', name: '點點', price: 400 },
    { id: 'hat-flower', type: 'hat', name: '小花', price: 150 },
    { id: 'hat-glasses', type: 'hat', name: '墨鏡', price: 200 },
    { id: 'hat-bow', type: 'hat', name: '蝴蝶結', price: 200 },
    { id: 'hat-grad', type: 'hat', name: '學士帽', price: 300 },
    { id: 'hat-top', type: 'hat', name: '紳士帽', price: 400, level: 10 },
    { id: 'hat-crown', type: 'hat', name: '皇冠', price: 800, level: 10 }
  ];

  function find(id) {
    for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i];
    return null;
  }

  function isOwned(p, id) {
    var item = find(id);
    if (!item) return false;
    return item.price === 0 || p.shop.owned[id] === true;
  }

  function level(p) {
    return P.petLevelInfo(p.pet.xp).level;
  }

  function isEquipped(p, id) {
    var item = find(id);
    if (!item) return false;
    if (item.type === 'theme') return p.shop.theme === item.skin;
    if (item.type === 'board') return p.shop.board === item.skin;
    return p.pet.accessory === id;
  }

  function check(p, id) {
    var item = find(id);
    if (!item) return { ok: false, reason: 'unknown' };
    if (isOwned(p, id)) return { ok: false, reason: 'owned' };
    if (item.level && level(p) < item.level) return { ok: false, reason: 'level', need: item.level };
    if (p.wallet.turtles < item.price) return { ok: false, reason: 'poor', need: item.price };
    return { ok: true };
  }

  function buy(p, id, nowMs) {
    var c = check(p, id);
    if (!c.ok) return c;
    var item = find(id);
    if (!E.spendTurtles(p, item.price, nowMs)) return { ok: false, reason: 'poor', need: item.price };
    p.shop.owned[id] = true;
    var unlocked = P.evaluate(p, nowMs);
    return { ok: true, item: item, unlocked: unlocked };
  }

  function equip(p, id, nowMs) {
    var item = find(id);
    if (!item || !isOwned(p, id)) return false;
    if (item.type === 'theme') p.shop.theme = item.skin;
    else if (item.type === 'board') p.shop.board = item.skin;
    else p.pet.accessory = id;
    P.touch(p, nowMs);
    return true;
  }

  function removeHat(p, nowMs) {
    p.pet.accessory = '';
    P.touch(p, nowMs);
  }

  var api = {
    TYPES: TYPES, ITEMS: ITEMS, find: find, isOwned: isOwned, isEquipped: isEquipped,
    check: check, buy: buy, equip: equip, removeHat: removeHat
  };

  if (isNode) module.exports = api;
  else root.TurtleShop = api;
})(typeof window !== 'undefined' ? window : globalThis);
