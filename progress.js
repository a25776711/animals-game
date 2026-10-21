(function (root) {
  'use strict';

  var KEY = 'turtle.profile.v1';
  var COLOR_COUNT = 9;
  var STAT_KEYS = ['opened', 'pairs', 'lines', 'families', 'lucky', 'games', 'bestRounds', 'bestGained', 'maxChain'];

  function def(id, icon, name, desc, stat, target) {
    return { id: id, icon: icon, name: name, desc: desc, stat: stat, target: target };
  }

  var DEFS = [
    def('first_open', '🎁', '初次開包', '開出第一包', 'opened', 1),
    def('open_100', '📦', '百包達人', '累計開 100 包', 'opened', 100),
    def('open_1000', '🏭', '千包大戶', '累計開 1000 包', 'opened', 1000),
    def('first_pair', '🤝', '第一次碰', '成功碰一次', 'pairs', 1),
    def('pair_50', '🧲', '碰碰達人', '累計碰 50 次', 'pairs', 50),
    def('first_line', '📏', '第一次連線', '湊出第一條三連線', 'lines', 1),
    def('line_10', '🛤️', '連線高手', '累計連線 10 次', 'lines', 10),
    def('first_family', '👨‍👩‍👧‍👦', '全家福', '九隻烏龜顏色全部不同', 'families', 1),
    def('lucky_1', '🍀', '幸運降臨', '開出第一隻幸運色', 'lucky', 1),
    def('lucky_30', '🌟', '幸運之星', '累計開出 30 隻幸運色', 'lucky', 30),
    def('chain_3', '⛓️', '連環對', '一回合內成立 3 組以上', 'maxChain', 3),
    def('chain_4', '🎼', '四重奏', '一回合內成立 4 組', 'maxChain', 4),
    def('rounds_10', '⏳', '小有耐力', '單局撐過 10 回合', 'bestRounds', 10),
    def('rounds_20', '🐢', '持久戰', '單局撐過 20 回合', 'bestRounds', 20),
    def('rounds_40', '🏔️', '烏龜耐力王', '單局撐過 40 回合', 'bestRounds', 40),
    def('gained_30', '💰', '小有收穫', '單局獲得 30 包', 'bestGained', 30),
    def('gained_100', '🤑', '大豐收', '單局獲得 100 包', 'bestGained', 100),
    def('games_10', '🎮', '常客', '玩滿 10 局', 'games', 10),
    def('all_lucky', '🌈', '色彩收藏家', '9 種顏色都當過幸運色', 'luckyColors', COLOR_COUNT)
  ];

  function zeroStats() {
    var s = {};
    STAT_KEYS.forEach(function (k) { s[k] = 0; });
    return s;
  }

  function defaultProfile() {
    return { v: 1, stats: zeroStats(), luckyUsed: {}, achievements: {}, updatedAt: 0 };
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
    p.updatedAt = num(raw.updatedAt);
    return p;
  }

  function value(p, d) {
    return d.stat === 'luckyColors' ? Object.keys(p.luckyUsed).length : p.stats[d.stat];
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

  function record(p, kind, data, now) {
    var s = p.stats;
    data = data || {};
    if (kind === 'start') p.luckyUsed[data.lucky] = true;
    else if (kind === 'open') s.opened++;
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
    }
    p.updatedAt = now;
    return evaluate(p, now);
  }

  function merge(a, b) {
    var out = defaultProfile();
    STAT_KEYS.forEach(function (k) { out.stats[k] = Math.max(a.stats[k], b.stats[k]); });
    [a, b].forEach(function (p) {
      Object.keys(p.luckyUsed).forEach(function (c) { out.luckyUsed[c] = true; });
      Object.keys(p.achievements).forEach(function (id) {
        var t = p.achievements[id];
        out.achievements[id] = out.achievements[id] ? Math.min(out.achievements[id], t) : t;
      });
    });
    out.updatedAt = Math.max(a.updatedAt, b.updatedAt);
    evaluate(out, out.updatedAt || Date.now());
    return out;
  }

  function load() {
    try { return normalize(JSON.parse(root.localStorage.getItem(KEY))); }
    catch (e) { return defaultProfile(); }
  }

  function save(p) {
    try { root.localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
  }

  var api = {
    DEFS: DEFS, COLOR_COUNT: COLOR_COUNT,
    defaultProfile: defaultProfile, normalize: normalize, value: value,
    evaluate: evaluate, record: record, merge: merge, load: load, save: save
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TurtleProgress = api;
})(typeof window !== 'undefined' ? window : globalThis);
