(function (root) {
  'use strict';

  var KEY = 'turtle.mute';
  var VOICE_SET = 'cn';
  var NAMES = ['pair', 'line', 'family', 'lucky'];
  var MAX_WAIT_MS = 5000;

  var clips = {};
  var muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}

  NAMES.forEach(function (n) {
    var a = new Audio('audio/' + VOICE_SET + '/' + n + '.mp3');
    a.preload = 'auto';
    clips[n] = a;
  });

  function unlock() {
    NAMES.forEach(function (n) {
      var a = clips[n];
      a.muted = true;
      var p = a.play();
      var restore = function () { a.pause(); a.currentTime = 0; a.muted = false; };
      if (p && p.then) p.then(restore, function () { a.muted = false; });
      else restore();
    });
  }

  var events = ['pointerdown', 'keydown', 'touchstart'];
  function onFirstGesture() {
    events.forEach(function (ev) { document.removeEventListener(ev, onFirstGesture, true); });
    unlock();
  }
  events.forEach(function (ev) { document.addEventListener(ev, onFirstGesture, true); });

  function stopAll() {
    NAMES.forEach(function (n) { clips[n].pause(); clips[n].currentTime = 0; });
  }

  function play(name) {
    var a = clips[name];
    if (!a || muted) return Promise.resolve();
    return new Promise(function (resolve) {
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        a.removeEventListener('ended', finish);
        a.removeEventListener('error', finish);
        resolve();
      }
      a.addEventListener('ended', finish);
      a.addEventListener('error', finish);
      setTimeout(finish, MAX_WAIT_MS);
      a.currentTime = 0;
      var p = a.play();
      if (p && p.catch) p.catch(finish);
    });
  }

  function setMuted(m) {
    muted = !!m;
    if (muted) stopAll();
    try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) {}
  }

  root.TurtleSound = {
    play: play,
    setMuted: setMuted,
    isMuted: function () { return muted; }
  };
})(window);
