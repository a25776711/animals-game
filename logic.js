(function (root) {
  'use strict';

  var LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  var REWARD = { allDifferent: 5, threeInARow: 3, pair: 1 };

  function checkBestMatch(grid) {
    var i, j;

    var seen = {};
    var allFilled = true, allDistinct = true;
    for (i = 0; i < grid.length; i++) {
      if (grid[i] == null) { allFilled = false; break; }
      if (seen[grid[i]]) allDistinct = false;
      seen[grid[i]] = true;
    }
    if (allFilled && allDistinct) {
      return { type: 'allDifferent', cells: grid.map(function (_, k) { return k; }), packs: REWARD.allDifferent };
    }

    for (i = 0; i < LINES.length; i++) {
      var l = LINES[i], a = grid[l[0]], b = grid[l[1]], c = grid[l[2]];
      if (a != null && a === b && b === c) {
        return { type: 'threeInARow', cells: l.slice(), packs: REWARD.threeInARow };
      }
    }

    for (i = 0; i < grid.length; i++) {
      if (grid[i] == null) continue;
      for (j = i + 1; j < grid.length; j++) {
        if (grid[j] != null && grid[i] === grid[j]) {
          return { type: 'pair', cells: [i, j], packs: REWARD.pair };
        }
      }
    }

    return { type: 'none', cells: [], packs: 0 };
  }

  function fillRandom(grid, animalCount, rng) {
    rng = rng || Math.random;
    return grid.map(function (v) {
      return v == null ? Math.floor(rng() * animalCount) : v;
    });
  }

  var api = { LINES: LINES, REWARD: REWARD, checkBestMatch: checkBestMatch, fillRandom: fillRandom };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AnimalLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
