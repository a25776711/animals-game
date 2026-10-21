(function (root) {
  'use strict';

  var SIZE = 9;

  var LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  var REWARD = { family: 5, line: 3, pair: 1, lucky: 1 };

  function emptyGrid() {
    var g = [];
    for (var i = 0; i < SIZE; i++) g.push(null);
    return g;
  }

  function emptyIndexes(grid) {
    var out = [];
    for (var i = 0; i < grid.length; i++) if (grid[i] == null) out.push(i);
    return out;
  }

  function drawColor(colorCount, rng) {
    return Math.floor((rng || Math.random)() * colorCount);
  }

  function isFamily(grid) {
    var seen = {};
    for (var i = 0; i < grid.length; i++) {
      if (grid[i] == null || seen[grid[i]]) return false;
      seen[grid[i]] = true;
    }
    return true;
  }

  function resolveAll(grid) {
    var events = [], i, j;

    if (isFamily(grid)) {
      return [{ type: 'family', cells: grid.map(function (_, k) { return k; }), packs: REWARD.family }];
    }

    var used = [];
    for (i = 0; i < grid.length; i++) used.push(false);

    LINES.forEach(function (l) {
      var c = grid[l[0]];
      if (c == null || used[l[0]] || used[l[1]] || used[l[2]]) return;
      if (grid[l[1]] === c && grid[l[2]] === c) {
        l.forEach(function (k) { used[k] = true; });
        events.push({ type: 'line', cells: l.slice(), packs: REWARD.line });
      }
    });

    for (i = 0; i < grid.length; i++) {
      if (grid[i] == null || used[i]) continue;
      for (j = i + 1; j < grid.length; j++) {
        if (!used[j] && grid[j] === grid[i]) {
          used[i] = used[j] = true;
          events.push({ type: 'pair', cells: [i, j], packs: REWARD.pair });
          break;
        }
      }
    }

    return events.sort(function (a, b) { return Math.min.apply(null, a.cells) - Math.min.apply(null, b.cells); });
  }

  var api = {
    SIZE: SIZE, LINES: LINES, REWARD: REWARD,
    emptyGrid: emptyGrid, emptyIndexes: emptyIndexes,
    drawColor: drawColor, isFamily: isFamily, resolveAll: resolveAll
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TurtleLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
