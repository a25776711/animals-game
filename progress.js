(function (root) {
  'use strict';

  var KEY = 'turtle.profile.v1';
  var COLOR_COUNT = 9;
  var RARITY_COUNT = 4;
  var SLOT_COUNT = 3;
  var STAT_KEYS = [
    'opened', 'pairs', 'lines', 'families', 'lucky', 'games', 'bestRounds', 'bestGained', 'maxChain',
    'claims', 'wheelBest', 'raceWins', 'raceBigWins', 'bjWins', 'bjBlackjacks', 'memPerfects',
    'gachaDraws', 'legendaries'
  ];

  function def(id, name, desc, stat, target) {
    return { id: id, name: name, desc: desc, stat: stat, target: target };
  }

  var DEFS = [
    def('first_open', '初次開包', '開出第一包', 'opened', 1),
    def('open_100', '百包達人', '累計開 100 包', 'opened', 100),
    def('open_1000', '千包大戶', '累計開 1000 包', 'opened', 1000),
    def('first_pair', '第一次碰', '成功碰一次', 'pairs', 1),
    def('pair_50', '碰碰達人', '累計碰 50 次', 'pairs', 50),
    def('first_line', '第一次連線', '湊出第一條三連線', 'lines', 1),
    def('line_10', '連線高手', '累計連線 10 次', 'lines', 10),
    def('first_family', '全家福', '九隻烏龜顏色全部不同', 'families', 1),
    def('lucky_1', '幸運降臨', '開出第一隻幸運色', 'lucky', 1),
    def('lucky_30', '幸運之星', '累計開出 30 隻幸運色', 'lucky', 30),
    def('chain_3', '連環對', '一回合內成立 3 組以上', 'maxChain', 3),
    def('chain_4', '四重奏', '一回合內成立 4 組', 'maxChain', 4),
    def('rounds_10', '小有耐力', '單局撐過 10 回合', 'bestRounds', 10),
    def('rounds_20', '持久戰', '單局撐過 20 回合', 'bestRounds', 20),
    def('rounds_40', '烏龜耐力王', '單局撐過 40 回合', 'bestRounds', 40),
    def('gained_30', '小有收穫', '單局獲得 30 包', 'bestGained', 30),
    def('gained_100', '大豐收', '單局獲得 100 包', 'bestGained', 100),
    def('games_10', '常客', '玩滿 10 局', 'games', 10),
    def('all_lucky', '色彩收藏家', '9 種顏色都當過幸運色', 'luckyColors', COLOR_COUNT),
    def('first_claim', '領補給', '領取第一次補給', 'claims', 1),
    def('claim_10', '補給常客', '累計領取 10 次補給', 'claims', 10),
    def('wheel_350', '轉盤大獎', '轉盤轉到 350 錢', 'wheelBest', 350),
    def('race_win', '賽跑贏家', '烏龜賽跑押中一次', 'raceWins', 1),
    def('race_big', '冷門大贏', '押中賠率 8 倍以上的烏龜', 'raceBigWins', 1),
    def('bj_win', '21 點初勝', '21 點贏一局', 'bjWins', 1),
    def('bj_natural', 'Blackjack', '21 點一開牌就是 21', 'bjBlackjacks', 1),
    def('mem_perfect', '好記性', '翻牌記憶 10 步內完成', 'memPerfects', 1),
    def('gacha_1', '初次抽卡', '抽一次卡', 'gachaDraws', 1),
    def('gacha_100', '抽卡達人', '累計抽 100 次', 'gachaDraws', 100),
    def('legend_1', '傳說降臨', '抽到傳說烏龜', 'legendaries', 1),
    def('collect_18', '收藏家', '集到 18 種不同的卡', 'cardTypes', 18),
    def('collect_36', '圖鑑完成', '集齊 36 種卡', 'cardTypes', 36),
    def('feed_1', '第一次餵食', '餵小龜吃東西', 'feeds', 1),
    def('feed_20', '小龜的好朋友', '累計餵食 20 次', 'feeds', 20),
    def('pet_lv5', '小龜長大了', '小龜升到 Lv.5', 'petLevel', 5),
    def('pet_lv10', '成年龜', '小龜升到 Lv.10', 'petLevel', 10),
    def('shop_1', '第一次購物', '在裝飾商店買一件東西', 'shopItems', 1),
    def('shop_8', '收藏愛好者', '買齊 8 件裝飾', 'shopItems', 8)
  ];

  function xpToNext(level) { return 100 * level; }

  function petLevelInfo(xp) {
    var level = 1;
    var left = xp;
    while (left >= xpToNext(level) && level < 99) {
      left -= xpToNext(level);
      level++;
    }
    return { level: level, into: left, need: xpToNext(level) };
  }

  function zeroStats() {
    var s = {};
    STAT_KEYS.forEach(function (k) { s[k] = 0; });
    return s;
  }

  function defaultProfile() {
    return {
      v: 2, rev: 0,
      stats: zeroStats(), luckyUsed: {}, achievements: {},
      wallet: { money: 0, turtles: 0 },
      daily: { day: '', claimed: [false, false, false] },
      gifts: { starter: false, firstLogin: false },
      cards: {}, pity: 0, timeMark: 0, updatedAt: 0,
      pet: { color: 0, name: '小龜', xp: 0, fullness: 60, fedAt: 0, feeds: 0, since: 0, accessory: '' },
      shop: { owned: {}, theme: 'default', board: 'default' }
    };
  }

  function num(v) {
    v = Number(v);
    return isFinite(v) && v > 0 ? Math.floor(v) : 0;
  }

  function normalize(raw) {
    var p = defaultProfile();
    if (!raw || typeof raw !== 'object') return p;

    var s = raw.stats || {};
    STAT_KEYS.forEach(function (k) { p.stats[k] = num(s[k]); });

    Object.keys(raw.luckyUsed || {}).forEach(function (k) {
      var c = Number(k);
      if (raw.luckyUsed[k] && c >= 0 && c < COLOR_COUNT && c % 1 === 0) p.luckyUsed[c] = true;
    });
    Object.keys(raw.achievements || {}).forEach(function (id) {
      var t = num(raw.achievements[id]);
      if (t) p.achievements[id] = t;
    });

    var w = raw.wallet;
    p.wallet.money = w ? num(w.money) : 0;
    p.wallet.turtles = w ? num(w.turtles) : p.stats.opened;

    var d = raw.daily || {};
    if (typeof d.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.day)) p.daily.day = d.day;
    if (Array.isArray(d.claimed)) {
      for (var i = 0; i < SLOT_COUNT; i++) p.daily.claimed[i] = d.claimed[i] === true;
    }

    var g = raw.gifts || {};
    p.gifts.starter = g.starter === true;
    p.gifts.firstLogin = g.firstLogin === true;

    Object.keys(raw.cards || {}).forEach(function (k) {
      var n = num(raw.cards[k]);
      if (/^[0-8]-[0-3]$/.test(k) && n) p.cards[k] = n;
    });

    p.pity = num(raw.pity);
    p.rev = num(raw.rev);
    var hadProgress = p.stats.opened || p.stats.games || Object.keys(p.achievements).length;
    if (raw.v !== 2 && hadProgress && p.rev === 0) p.rev = 1;
    p.timeMark = num(raw.timeMark);
    p.updatedAt = num(raw.updatedAt);

    var pt = raw.pet || {};
    p.pet.color = num(pt.color) <= 8 ? num(pt.color) : 0;
    var name = typeof pt.name === 'string' ? Array.from(pt.name.replace(/[\x00-\x1f]/g, '').trim()).slice(0, 8).join('') : '';
    p.pet.name = name || '小龜';
    p.pet.xp = num(pt.xp);
    p.pet.fullness = Math.min(100, num(pt.fullness));
    p.pet.fedAt = num(pt.fedAt);
    p.pet.feeds = num(pt.feeds);
    p.pet.since = num(pt.since);
    p.pet.accessory = typeof pt.accessory === 'string' && /^[a-z]+-[a-z]+$/.test(pt.accessory) ? pt.accessory : '';
    if (!pt.since && !('fullness' in pt)) p.pet.fullness = 60;

    var sh = raw.shop || {};
    Object.keys(sh.owned || {}).forEach(function (k) {
      if (sh.owned[k] === true && /^(theme|board|hat)-[a-z]+$/.test(k)) p.shop.owned[k] = true;
    });
    p.shop.theme = typeof sh.theme === 'string' && /^[a-z]{1,12}$/.test(sh.theme) ? sh.theme : 'default';
    p.shop.board = typeof sh.board === 'string' && /^[a-z]{1,12}$/.test(sh.board) ? sh.board : 'default';
    return p;
  }

  function clone(p) {
    return JSON.parse(JSON.stringify(p));
  }

  function cardTypes(p) {
    return Object.keys(p.cards).filter(function (k) { return p.cards[k] > 0; }).length;
  }

  function value(p, d) {
    if (d.stat === 'luckyColors') return Object.keys(p.luckyUsed).length;
    if (d.stat === 'cardTypes') return cardTypes(p);
    if (d.stat === 'feeds') return p.pet.feeds;
    if (d.stat === 'petLevel') return petLevelInfo(p.pet.xp).level;
    if (d.stat === 'shopItems') return Object.keys(p.shop.owned).length;
    return p.stats[d.stat];
  }

  function evaluate(p, now) {
    var unlocked = [];
    DEFS.forEach(function (d) {
      if (!p.achievements[d.id] && value(p, d) >= d.target) {
        p.achievements[d.id] = now;
        unlocked.push(d);
      }
    });
    return unlocked;
  }

  function touch(p, now) {
    p.rev++;
    p.updatedAt = now;
  }

  function record(p, kind, data, now) {
    var s = p.stats;
    data = data || {};
    if (kind === 'start') p.luckyUsed[data.lucky] = true;
    else if (kind === 'open') { s.opened++; p.wallet.turtles++; }
    else if (kind === 'lucky') s.lucky++;
    else if (kind === 'match') {
      if (data.type === 'pair') s.pairs++;
      else if (data.type === 'line') s.lines++;
      else if (data.type === 'family') s.families++;
    } else if (kind === 'round') s.maxChain = Math.max(s.maxChain, data.chain || 0);
    else if (kind === 'end') {
      s.games++;
      s.bestRounds = Math.max(s.bestRounds, data.rounds || 0);
      s.bestGained = Math.max(s.bestGained, data.gained || 0);
    } else if (kind === 'claim') {
      s.claims++;
      if (data.wheel) s.wheelBest = Math.max(s.wheelBest, data.amount || 0);
    } else if (kind === 'race') {
      if (data.won) {
        s.raceWins++;
        if (data.odds >= 8) s.raceBigWins++;
      }
    } else if (kind === 'bj') {
      if (data.result === 'win' || data.result === 'blackjack') s.bjWins++;
      if (data.result === 'blackjack') s.bjBlackjacks++;
    } else if (kind === 'mem') {
      if (data.moves <= 10) s.memPerfects++;
    } else if (kind === 'gacha') {
      s.gachaDraws += data.draws || 0;
      s.legendaries += data.legendaries || 0;
    }
    touch(p, now);
    return evaluate(p, now);
  }

  function isFresh(p) {
    return p.rev === 0;
  }

  function sorted(v) {
    if (Array.isArray(v)) return v.map(sorted);
    if (!v || typeof v !== 'object') return v;
    var out = {};
    Object.keys(v).sort().forEach(function (k) { out[k] = sorted(v[k]); });
    return out;
  }

  function content(p) {
    return JSON.stringify(sorted([p.stats, p.luckyUsed, p.achievements, p.wallet, p.daily, p.gifts, p.cards, p.pity, p.pet, p.shop]));
  }

  function sameContent(a, b) {
    return content(a) === content(b);
  }

  function decideSync(local, remote, baseRev) {
    if (!remote || isFresh(remote)) return 'upload';
    if (isFresh(local)) return 'download';
    if (local.rev === remote.rev && local.updatedAt === remote.updatedAt) return 'same';
    if (sameContent(local, remote)) return 'same';
    if (baseRev != null) {
      var localChanged = local.rev > baseRev;
      var remoteChanged = remote.rev > baseRev;
      if (localChanged && !remoteChanged) return 'upload';
      if (remoteChanged && !localChanged) return 'download';
    }
    return 'ask';
  }

  function unionTimes(a, b) {
    var out = {};
    [a, b].forEach(function (src) {
      Object.keys(src).forEach(function (k) {
        out[k] = out[k] ? Math.min(out[k], src[k]) : src[k];
      });
    });
    return out;
  }

  function resolve(local, remote, side, keepAchievements, now) {
    var base = clone(side === 'cloud' ? remote : local);
    var other = side === 'cloud' ? local : remote;

    if (keepAchievements) {
      base.achievements = unionTimes(base.achievements, other.achievements);
      Object.keys(other.luckyUsed).forEach(function (c) { base.luckyUsed[c] = true; });
    }

    base.gifts.starter = base.gifts.starter || other.gifts.starter;
    base.gifts.firstLogin = base.gifts.firstLogin || other.gifts.firstLogin;

    if (base.daily.day === other.daily.day) {
      for (var i = 0; i < SLOT_COUNT; i++) base.daily.claimed[i] = base.daily.claimed[i] || other.daily.claimed[i];
    } else if (other.daily.day > base.daily.day) {
      base.daily = clone(other.daily);
    }

    base.timeMark = Math.max(local.timeMark, remote.timeMark);
    base.rev = Math.max(local.rev, remote.rev) + 1;
    base.updatedAt = now;
    evaluate(base, now);
    return base;
  }

  function summary(p) {
    return {
      achievements: Object.keys(p.achievements).length,
      opened: p.stats.opened,
      games: p.stats.games,
      money: p.wallet.money,
      turtles: p.wallet.turtles,
      cards: cardTypes(p),
      updatedAt: p.updatedAt
    };
  }

  function load() {
    try { return normalize(JSON.parse(root.localStorage.getItem(KEY))); }
    catch (e) { return defaultProfile(); }
  }

  function save(p) {
    try { root.localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
  }

  var api = {
    DEFS: DEFS, COLOR_COUNT: COLOR_COUNT, RARITY_COUNT: RARITY_COUNT, SLOT_COUNT: SLOT_COUNT,
    defaultProfile: defaultProfile, normalize: normalize, clone: clone, value: value, cardTypes: cardTypes,
    petLevelInfo: petLevelInfo, xpToNext: xpToNext,
    evaluate: evaluate, touch: touch, record: record,
    isFresh: isFresh, sameContent: sameContent, decideSync: decideSync, resolve: resolve, summary: summary,
    load: load, save: save
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TurtleProgress = api;
})(typeof window !== 'undefined' ? window : globalThis);
