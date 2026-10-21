(function (root) {
  'use strict';

  var VOICE_KEY = 'turtle.voice';
  var VOLUME_KEY = 'turtle.volume';
  var OLD_MUTE_KEY = 'turtle.mute';
  var VOICE_SETS = [
    { id: 'cn', name: '普通話' },
    { id: 'tw', name: '台灣腔' }
  ];
  var NAMES = ['pair', 'line', 'family', 'lucky'];
  var MAX_WAIT_MS = 5000;
  var AC = root.AudioContext || root.webkitAudioContext;

  var ctx = null;
  var gain = null;
  var buffers = {};
  var loading = Promise.resolve();
  var active = [];

  function store(key, value) {
    try { root.localStorage.setItem(key, value); } catch (e) {}
  }

  function readVoiceSet() {
    try {
      var v = root.localStorage.getItem(VOICE_KEY);
      if (VOICE_SETS.some(function (s) { return s.id === v; })) return v;
    } catch (e) {}
    return 'cn';
  }

  function readVolume() {
    try {
      var v = parseFloat(root.localStorage.getItem(VOLUME_KEY));
      if (isFinite(v)) return Math.min(1, Math.max(0, v));
      if (root.localStorage.getItem(OLD_MUTE_KEY) === '1') return 0;
    } catch (e) {}
    return 1;
  }

  var voiceSet = readVoiceSet();
  var volume = readVolume();

  function decode(buf) {
    return new Promise(function (resolve, reject) { ctx.decodeAudioData(buf, resolve, reject); });
  }

  function loadSet(set) {
    var next = {};
    return Promise.all(NAMES.map(function (n) {
      return root.fetch('audio/' + set + '/' + n + '.mp3')
        .then(function (r) { return r.arrayBuffer(); })
        .then(decode)
        .then(function (b) { next[n] = b; });
    })).then(function () {
      if (set === voiceSet) buffers = next;
    }).catch(function () {});
  }

  function init() {
    if (ctx || !AC) return;
    ctx = new AC();
    gain = ctx.createGain();
    gain.gain.value = volume;
    gain.connect(ctx.destination);
    loading = loadSet(voiceSet);
    var silent = ctx.createBufferSource();
    silent.buffer = ctx.createBuffer(1, 1, 22050);
    silent.connect(ctx.destination);
    silent.start(0);
  }

  var gestures = ['pointerdown', 'keydown', 'touchstart'];
  function onFirstGesture() {
    gestures.forEach(function (ev) { root.document.removeEventListener(ev, onFirstGesture, true); });
    init();
    if (ctx && ctx.resume) ctx.resume();
  }
  gestures.forEach(function (ev) { root.document.addEventListener(ev, onFirstGesture, true); });

  function stopAll() {
    active.forEach(function (s) { try { s.stop(); } catch (e) {} });
    active = [];
  }

  function play(name) {
    if (volume === 0 || !AC) return Promise.resolve();
    init();
    return loading.then(function () {
      var buf = buffers[name];
      if (!ctx || !buf) return null;
      return Promise.resolve(ctx.resume && ctx.resume()).then(function () {
        if (ctx.state !== 'running') return null;
        return new Promise(function (resolve) {
          var src = ctx.createBufferSource();
          var done = false;
          function finish() {
            if (done) return;
            done = true;
            active = active.filter(function (s) { return s !== src; });
            resolve();
          }
          src.buffer = buf;
          src.connect(gain);
          src.onended = finish;
          active.push(src);
          setTimeout(finish, MAX_WAIT_MS);
          src.start(0);
        });
      }, function () { return null; });
    });
  }

  function setVolume(v) {
    volume = Math.min(1, Math.max(0, v));
    store(VOLUME_KEY, String(volume));
    if (gain) gain.gain.value = volume;
    if (volume === 0) stopAll();
  }

  function setVoiceSet(id) {
    if (!VOICE_SETS.some(function (s) { return s.id === id; })) return Promise.resolve();
    voiceSet = id;
    store(VOICE_KEY, id);
    stopAll();
    if (!ctx) return Promise.resolve();
    loading = loadSet(id);
    return loading;
  }

  root.TurtleSound = {
    VOICE_SETS: VOICE_SETS,
    play: play,
    setVolume: setVolume,
    getVolume: function () { return volume; },
    setVoiceSet: setVoiceSet,
    getVoiceSet: function () { return voiceSet; }
  };
})(window);
