(function (root) {
  'use strict';

  function random() {
    var c = root.crypto;
    if (c && c.getRandomValues) {
      var a = new Uint32Array(1);
      c.getRandomValues(a);
      return a[0] / 4294967296;
    }
    return Math.random();
  }

  function shuffle(list, rng) {
    rng = rng || random;
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  var api = { random: random, shuffle: shuffle };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TurtleRng = api;
})(typeof window !== 'undefined' ? window : globalThis);
