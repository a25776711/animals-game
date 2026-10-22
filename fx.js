(function (root) {
  'use strict';

  var isNode = typeof module !== 'undefined' && module.exports;

  var SFX_KEY = 'turtle.sfx';
  var MUSIC_KEY = 'turtle.music';
  var FADE = 0.9;
  var LOOKAHEAD = 0.3;
  var TICK_MS = 80;
  var STEPS = 16;

  var SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10]
  };
  var PENTA = { major: [0, 1, 2, 4, 5], minor: [0, 2, 3, 4, 6], dorian: [0, 2, 3, 4, 5] };

  /* 曲目：每首只是一組參數，旋律由種子決定、每次播放都一樣 */

  var BASE = {
    scale: 'major', root: 57, swing: 0, seventh: false,
    prog: [0, 5, 3, 4],
    pad: { wave: 'triangle', vol: 0.06 },
    bass: { wave: 'triangle', vol: 0.2, pat: 'r.......r.......' },
    arp: { wave: 'triangle', vol: 0.07, pat: '0.1.2.1.0.1.2.1.', oct: 12, decay: 0.3 },
    lead: { wave: 'sine', vol: 0.09, rhythm: 'x...x.x.x...x...', fill: 0.1, rest: 0.25, low: 7, high: 12, start: 9, len: 3, decay: 0.55 },
    drums: { kick: '', snare: '', hat: '', vol: 1 },
    seed: 1
  };

  function track(over) {
    var t = {};
    Object.keys(BASE).forEach(function (k) { t[k] = BASE[k]; });
    Object.keys(over).forEach(function (k) {
      var v = over[k];
      t[k] = v && typeof v === 'object' && !Array.isArray(v) && BASE[k] && typeof BASE[k] === 'object' && !Array.isArray(BASE[k])
        ? Object.assign({}, BASE[k], v) : v;
    });
    return t;
  }

  var TRACKS = {
    title: track({ bpm: 114, root: 57, swing: 0.05, prog: [0, 3, 4, 0, 0, 5, 3, 4], seed: 11,
      pad: { wave: 'triangle', vol: 0.05 },
      bass: { pat: 'r..r..r.r..r..f.', vol: 0.21 },
      arp: { vol: 0.08, decay: 0.25 },
      lead: { wave: 'triangle', vol: 0.11, rhythm: 'x.x.x...x.x.x.x.', fill: 0.2, rest: 0.1 },
      drums: { kick: 'k...k...k...k...', snare: '........s.......', hat: '..h...h...h...h.', vol: 0.55 } }),
    play: track({ bpm: 120, root: 57, swing: 0.05, prog: [0, 3, 4, 0, 0, 5, 3, 4], seed: 23,
      bass: { pat: 'r..r..r.r..r..f.', vol: 0.22 },
      arp: { vol: 0.08, decay: 0.22 },
      lead: { wave: 'triangle', vol: 0.11, rhythm: 'x.x.x.x.x.x.x...', fill: 0.2, rest: 0.08 },
      drums: { kick: 'k...k...k...k...', snare: '........s.......', hat: '..h...h...h...h.', vol: 0.7 } }),
    playLow: track({ bpm: 132, root: 57, prog: [0, 5, 3, 4, 0, 5, 3, 4], seed: 37,
      pad: { wave: 'triangle', vol: 0.04 },
      bass: { pat: 'r.r.r.r.r.r.r.f.', vol: 0.23 },
      arp: { pat: '0.20.20.0.20.20.', vol: 0.07, decay: 0.18 },
      lead: { wave: 'square', vol: 0.05, rhythm: 'x.x.x.x.x.x.x.x.', fill: 0.3, rest: 0.05 },
      drums: { kick: 'k...k...k...k...', snare: '....s.......s...', hat: '.h.h.h.h.h.h.h.h', vol: 0.85 } }),
    result: track({ bpm: 110, root: 60, swing: 0.05, prog: [0, 4, 5, 3], seed: 41,
      pad: { wave: 'triangle', vol: 0.06 },
      bass: { pat: 'r..r..r.r..r..f.', vol: 0.2 },
      arp: { vol: 0.08, pat: '0.1.2.1.0.1.2.3.' },
      lead: { wave: 'triangle', vol: 0.11, rest: 0.05, rhythm: 'x.x.x...x.x.x.x.', fill: 0.2 },
      drums: { kick: 'k.......k.......', hat: 'h.h.h.h.h.h.h.h.', vol: 0.5 } }),
    hub: track({ bpm: 120, root: 58, swing: 0.1, prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 53,
      bass: { pat: 'r..r..f.r..r..o.', vol: 0.21 },
      arp: { pat: '.0.1.2.1.0.1.2.3', vol: 0.08 },
      lead: { wave: 'triangle', vol: 0.11, rest: 0.08, fill: 0.25 },
      drums: { kick: 'k...k...k...k...', snare: '....s.......s...', hat: 'h.h.h.h.h.h.h.h.', vol: 0.6 } }),
    supply: track({ bpm: 108, root: 57, swing: 0.05, prog: [0, 4, 5, 3], seed: 61,
      pad: { wave: 'triangle', vol: 0.05 },
      bass: { pat: 'r..r..r.r..r..f.', vol: 0.2 },
      arp: { wave: 'sine', vol: 0.09, pat: '0.1.2.1.3.1.2.1.', oct: 24, decay: 0.45 },
      lead: { wave: 'triangle', vol: 0.1, rest: 0.12, fill: 0.2 },
      drums: { kick: 'k.......k.......', hat: 'h.h.h.h.h.h.h.h.', vol: 0.45 } }),
    race: track({ bpm: 118, root: 57, swing: 0.05, prog: [0, 4, 5, 3], seed: 71,
      bass: { pat: 'r.r...f.r.r...o.', vol: 0.22 },
      lead: { wave: 'triangle', vol: 0.11, rhythm: 'x.x..x.xx.x..x..', fill: 0.2, rest: 0.05 },
      drums: { kick: 'k...k...k...k...', snare: '....s.......s...', hat: 'h.h.h.h.h.h.h.h.', vol: 0.7 } }),
    raceGo: track({ bpm: 154, root: 57, prog: [0, 4, 5, 3], seed: 83,
      bass: { pat: 'r.r.r.rfr.r.r.rf', vol: 0.24 },
      arp: { pat: '0102010201020102', vol: 0.07, decay: 0.15 },
      lead: { wave: 'square', vol: 0.045, rhythm: 'x.x.x.x.x.x.x.x.', fill: 0.5, rest: 0, low: 7, high: 13, len: 2 },
      drums: { kick: 'k...k...k...k...', snare: '....s.......s...', hat: '.h.h.h.h.h.h.h.h', vol: 0.9 } }),
    bj: track({ bpm: 108, root: 52, swing: 0.2, seventh: true, prog: [0, 5, 1, 4, 0, 5, 3, 4], seed: 97,
      pad: { wave: 'triangle', vol: 0.05 },
      bass: { pat: 'r..rf..fr..ro..f', vol: 0.21 },
      arp: { vol: 0.07, pat: '.0.1.2.1.0.1.2.1', decay: 0.22 },
      lead: { wave: 'triangle', vol: 0.1, rest: 0.2, fill: 0.15 },
      drums: { kick: 'k.......k.......', snare: '....s.......s...', hat: 'h.h.h.h.h.h.h.h.', vol: 0.5 } }),
    bjPlay: track({ bpm: 116, root: 52, swing: 0.15, seventh: true, prog: [0, 5, 3, 4], seed: 101,
      pad: { wave: 'triangle', vol: 0.05 },
      bass: { pat: 'r.r.r.r.r.r.r.f.', vol: 0.21 },
      arp: { vol: 0.075, pat: '0.1.2.1.0.1.2.1.', decay: 0.2 },
      lead: { wave: 'triangle', vol: 0.1, rest: 0.25 },
      drums: { kick: 'k...k...k...k...', snare: '....s.......s...', hat: '.h.h.h.h.h.h.h.h', vol: 0.65 } }),
    mem: track({ bpm: 116, root: 62, swing: 0.05, prog: [0, 3, 4, 0], seed: 113,
      bass: { pat: 'r..r..r.f..r..r.', vol: 0.2 },
      arp: { pat: '0.1.0.2.0.1.0.2.', decay: 0.18, vol: 0.085 },
      lead: { wave: 'triangle', vol: 0.11, rest: 0.12 },
      drums: { kick: 'k.......k.......', hat: '..h...h...h...h.', vol: 0.5 } }),
    memPlay: track({ bpm: 128, root: 62, prog: [0, 4, 5, 3], seed: 127,
      bass: { pat: 'r...r...f...r...', vol: 0.21 },
      arp: { pat: '0.1.0.2.0.1.0.2.', decay: 0.16, vol: 0.085 },
      lead: { wave: 'triangle', vol: 0.11, rest: 0.08 },
      drums: { kick: 'k...k...k...k...', hat: '..h...h...h...h.', vol: 0.6 } }),
    gacha: track({ bpm: 104, root: 57, swing: 0.05, prog: [0, 5, 3, 4, 0, 5, 3, 4], seed: 139,
      pad: { wave: 'triangle', vol: 0.05 },
      bass: { vol: 0.17, pat: 'r..r..r.r..r..f.' },
      arp: { wave: 'sine', vol: 0.085, pat: '0.1.2.3.2.1.0.1.', oct: 24, decay: 0.5 },
      lead: { wave: 'triangle', vol: 0.1, rest: 0.2 },
      drums: { kick: 'k.......k.......', hat: '..h...h...h...h.', vol: 0.45 } }),
    pet: track({ bpm: 104, root: 60, swing: 0.05, prog: [0, 3, 4, 0, 5, 3, 4, 0], seed: 151,
      pad: { wave: 'triangle', vol: 0.045 },
      bass: { vol: 0.15, pat: 'r...r...f...r...' },
      arp: { wave: 'sine', vol: 0.09, pat: '0.1.2.1.0.1.2.1.', oct: 12, decay: 0.4 },
      lead: { wave: 'triangle', vol: 0.1, rhythm: 'x.x...x.x.x...x.', fill: 0.1, rest: 0.1 },
      drums: { hat: 'h...h...h...h...', vol: 0.4 } }),
    shop: track({ bpm: 112, root: 55, swing: 0.12, seventh: true, prog: [0, 3, 1, 4], seed: 163,
      pad: { wave: 'triangle', vol: 0.05 },
      bass: { pat: 'r..f..r..f..r.f.', vol: 0.21 },
      arp: { pat: '.0.1.2.1.0.1.2.1', vol: 0.07 },
      lead: { wave: 'triangle', vol: 0.11, rest: 0.12 },
      drums: { kick: 'k..k..k.k..k..k.', hat: 'h.h.h.h.h.h.h.h.', vol: 0.55 } })
  };

  var SCENES = {
    title: 'title', start: 'title', play: 'play', result: 'result', ach: 'hub', supply: 'supply',
    hub: 'hub', pet: 'pet', shop: 'shop', race: 'race', bj: 'bj', mem: 'mem', gacha: 'gacha', chat: 'hub'
  };

  function mulberry(seed) {
    return function () {
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function midiFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function degMidi(tr, d) {
    var s = SCALES[tr.scale];
    return tr.root + 12 * Math.floor(d / 7) + s[((d % 7) + 7) % 7];
  }

  function chordDegrees(tr, d) {
    var c = [d, d + 2, d + 4];
    if (tr.seventh) c.push(d + 6);
    return c;
  }

  function buildMelody(tr) {
    var rnd = mulberry(tr.seed);
    var allowed = PENTA[tr.scale];
    var L = tr.lead;
    var deg = L.start;
    function ok(d) { return allowed.indexOf(((d % 7) + 7) % 7) >= 0; }
    function snap(d) {
      d = Math.max(L.low, Math.min(L.high, d));
      var tries = [0, 1, -1, 2, -2, 3, -3];
      for (var i = 0; i < tries.length; i++) {
        var c = d + tries[i];
        if (c >= L.low && c <= L.high && ok(c)) return c;
      }
      return d;
    }
    return tr.prog.map(function (chord) {
      var row = [];
      for (var s = 0; s < STEPS; s++) row.push(null);
      if (rnd() < L.rest) return row;
      var tones = chordDegrees(tr, chord).map(function (x) { return ((x % 7) + 7) % 7; });
      for (var i = 0; i < STEPS; i++) {
        if (L.rhythm.charAt(i) !== 'x' && rnd() > L.fill * 0.5) continue;
        var d = deg + Math.floor(rnd() * 5) - 2;
        if (i % 4 === 0) {
          var near = [0, 1, -1, 2, -2, 3, -3];
          for (var k = 0; k < near.length; k++) {
            var c = d + near[k];
            if (tones.indexOf(((c % 7) + 7) % 7) >= 0 && ok(c)) { d = c; break; }
          }
        }
        d = snap(d);
        row[i] = d;
        deg = d;
      }
      return row;
    });
  }

  var melodyCache = {};
  function melodyOf(id) {
    if (!melodyCache[id]) melodyCache[id] = buildMelody(TRACKS[id]);
    return melodyCache[id];
  }

  function stepEvents(id, i) {
    var tr = TRACKS[id];
    var bars = tr.prog.length;
    var bar = Math.floor(i / STEPS) % bars;
    var s = i % STEPS;
    var chord = tr.prog[bar];
    var tones = chordDegrees(tr, chord);
    var ev = [];

    if (s === 0 && tr.pad.vol > 0) {
      tones.forEach(function (d) { ev.push({ k: 'pad', m: degMidi(tr, d), steps: STEPS, v: tr.pad.vol }); });
    }
    var b = tr.bass.pat.charAt(s);
    if (b !== '.' && tr.bass.vol > 0) {
      var bd = b === 'f' ? chord + 4 : b === 'o' ? chord + 7 : chord;
      ev.push({ k: 'bass', m: degMidi(tr, bd) - 12, steps: 2, v: tr.bass.vol });
    }
    var a = tr.arp.pat.charAt(s);
    if (a !== '.' && tr.arp.vol > 0) {
      var ad = tones[Number(a) % tones.length];
      ev.push({ k: 'arp', m: degMidi(tr, ad) + tr.arp.oct, steps: 2, v: tr.arp.vol });
    }
    var ld = melodyOf(id)[bar][s];
    if (ld !== null && tr.lead.vol > 0) ev.push({ k: 'lead', m: degMidi(tr, ld), steps: tr.lead.len, v: tr.lead.vol });
    var D = tr.drums;
    if (D.kick.charAt(s) === 'k') ev.push({ k: 'kick', v: 0.32 * D.vol });
    if (D.snare.charAt(s) === 's') ev.push({ k: 'snare', v: 0.14 * D.vol });
    var h = D.hat.charAt(s);
    if (h === 'h' || h === 'H') ev.push({ k: 'hat', v: (h === 'H' ? 0.07 : 0.04) * D.vol });
    return ev;
  }

  var api = { TRACKS: TRACKS, SCENES: SCENES, STEPS: STEPS, stepEvents: stepEvents, melodyOf: melodyOf, degMidi: degMidi, midiFreq: midiFreq };

  if (isNode) {
    module.exports = api;
    return;
  }

  /* 以下需要瀏覽器的 Web Audio */

  var Sound = root.TurtleSound;
  var ctx = null;
  var sfxBus = null;
  var musicBus = null;
  var duckBus = null;
  var noiseBuf = null;
  var sfxVol = readVol(SFX_KEY, 0.8);
  var musicVol = readVol(MUSIC_KEY, 0.45);
  var sceneTrack = null;
  var moodTrack = null;
  var current = null;

  function readVol(key, fallback) {
    try {
      var v = parseFloat(root.localStorage.getItem(key));
      if (isFinite(v)) return Math.min(1, Math.max(0, v));
    } catch (e) {}
    return fallback;
  }

  function store(key, v) {
    try { root.localStorage.setItem(key, String(v)); } catch (e) {}
  }

  function now() { return ctx.currentTime; }

  function use(context, out) {
    ctx = context;
    var comp = ctx.createWaveShaper();
    var curve = new Float32Array(1024);
    for (var c = 0; c < curve.length; c++) {
      var x = c / (curve.length - 1) * 2 - 1;
      var ax = Math.abs(x);
      curve[c] = (x < 0 ? -1 : 1) * (ax <= 0.6 ? ax : 0.6 + 0.4 * Math.tanh((ax - 0.6) / 0.4));
    }
    comp.curve = curve;
    comp.oversample = '2x';
    comp.connect(out);
    sfxBus = ctx.createGain();
    sfxBus.connect(comp);
    musicBus = ctx.createGain();
    musicBus.connect(comp);
    duckBus = ctx.createGain();
    duckBus.connect(musicBus);
    var len = Math.floor(ctx.sampleRate);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    applyVolumes();
  }

  function applyVolumes() {
    if (!ctx) return;
    var t = now();
    sfxBus.gain.setTargetAtTime(sfxVol * 2.2, t, 0.02);
    musicBus.gain.setTargetAtTime(musicVol * 1.1, t, 0.05);
  }

  function ready() { return !!ctx && ctx.state !== 'closed'; }

  /* 發聲零件 */

  function note(freq, dur, o) {
    var t = o.t != null ? o.t : now();
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.slide || dur));
    var a = o.attack || 0.006;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vol, t + a);
    if (o.hold) {
      var rel = Math.min(o.release || 0.4, dur / 2);
      g.gain.setValueAtTime(o.vol, t + Math.max(a, dur - rel));
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
    } else {
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }
    osc.connect(g);
    g.connect(o.bus || sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function noise(dur, o) {
    var t = o.t != null ? o.t : now();
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    f.Q.value = o.q || 1;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(o.bus || sfxBus);
    src.start(t, Math.random() * 0.4);
    src.stop(t + dur + 0.05);
  }

  function bell(f, t, vol, dur) {
    [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]].forEach(function (p, i) {
      note(f * p[0], dur / (1 + i * 0.7), { t: t, vol: vol * p[1], attack: 0.002 });
    });
  }

  function arp(freqs, gap, o) {
    var t = now() + (o.delay || 0);
    freqs.forEach(function (f, i) {
      note(f, o.dur || 0.25, { t: t + i * gap, vol: o.vol, type: o.type || 'triangle' });
    });
  }

  function cardFlip(t) {
    noise(0.09, { t: t, type: 'bandpass', f: 1200, to: 3200, q: 0.8, vol: 0.4 });
    note(210, 0.05, { t: t, vol: 0.1, to: 120 });
  }

  var F = { C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568, C7: 2093 };

  var SFX = {
    tap: function () { note(900, 0.04, { vol: 0.14, type: 'triangle', to: 700 }); },
    nav: function () { noise(0.14, { type: 'bandpass', f: 500, to: 1400, q: 0.7, vol: 0.5 }); },
    open: function () { note(420, 0.1, { vol: 0.12, to: 600 }); },
    toast: function () { note(F.G5, 0.1, { vol: 0.14, type: 'triangle' }); },
    pop: function (k) {
      var f = 300 * Math.pow(2, (k || 0) * 2 / 12);
      var t = now();
      note(f, 0.13, { t: t, vol: 0.5, attack: 0.003, to: f * 1.9, slide: 0.07 });
      note(f * 2, 0.06, { t: t, vol: 0.08, type: 'triangle', to: f * 3 });
      noise(0.03, { t: t, type: 'highpass', f: 2500, vol: 0.05 });
    },
    lucky: function () { arp([F.E6, F.G6, F.C7, F.E6 * 2], 0.07, { vol: 0.07, type: 'sine', dur: 0.4 }); },
    pair: function () { arp([F.E5, F.G5], 0.08, { vol: 0.1, dur: 0.3 }); },
    line: function () { arp([F.C5, F.E5, F.G5], 0.08, { vol: 0.1, dur: 0.3 }); },
    family: function () { arp([F.C5, F.E5, F.G5, F.C6, F.E6], 0.07, { vol: 0.1, dur: 0.45 }); },
    clear: function () { noise(0.32, { type: 'bandpass', f: 400, to: 2400, q: 0.7, vol: 0.6 }); },
    ready: function () { note(660, 0.14, { vol: 0.14, type: 'square' }); },
    gun: function () {
      var t = now();
      noise(0.28, { t: t, type: 'bandpass', f: 1800, to: 500, q: 0.4, vol: 0.5 });
      noise(0.7, { t: t, type: 'lowpass', f: 900, to: 150, vol: 0.16 });
      note(160, 0.25, { t: t, vol: 0.4, to: 40 });
    },
    finish: function (rank) {
      var r = rank || 1;
      var f = r === 1 ? F.G6 : r === 2 ? F.E6 : r === 3 ? F.C6 : F.G5;
      note(f, r === 1 ? 0.5 : 0.16, { vol: r === 1 ? 0.16 : 0.07, type: 'triangle' });
      if (r === 1) bell(F.C7, now(), 0.1, 0.9);
    },
    win: function () { arp([F.C5, F.E5, F.G5, F.C6], 0.09, { vol: 0.12, dur: 0.5 }); },
    bigWin: function () {
      arp([F.C5, F.E5, F.G5, F.C6, F.G5, F.C6, F.E6], 0.1, { vol: 0.13, dur: 0.6 });
      bell(F.C7, now() + 0.5, 0.1, 1.2);
    },
    lose: function () {
      var t = now();
      note(392, 0.3, { t: t, vol: 0.12, type: 'triangle', to: 370 });
      note(311, 0.55, { t: t + 0.22, vol: 0.12, type: 'triangle', to: 250 });
    },
    push: function () { arp([F.G5, F.G5], 0.12, { vol: 0.08, dur: 0.2 }); },
    deal: function () {
      var t = now();
      noise(0.06, { t: t, type: 'highpass', f: 3000, to: 1500, vol: 0.3 });
      note(900, 0.02, { t: t, vol: 0.06, type: 'square' });
    },
    flip: function () { cardFlip(now()); },
    memMatch: function () { arp([F.A5, F.E6], 0.09, { vol: 0.1, dur: 0.3 }); },
    memMiss: function () { note(220, 0.14, { vol: 0.18, type: 'triangle', to: 160 }); },
    gachaDraw: function () { noise(0.5, { type: 'bandpass', f: 600, to: 5000, q: 0.7, vol: 0.5 }); },
    reveal: function (r, delay) {
      var t = now() + (delay || 0);
      if (r === 0) note(520, 0.1, { t: t, vol: 0.07, type: 'triangle' });
      else if (r === 1) bell(F.E6, t, 0.08, 0.7);
      else if (r === 2) [F.G5, F.C6, F.E6, F.G6].forEach(function (f, i) { bell(f, t + i * 0.07, 0.07, 0.8); });
      else {
        [F.C5, F.E5, F.G5, F.C6, F.E6, F.G6].forEach(function (f, i) { bell(f, t + i * 0.08, 0.09, 1.2); });
        noise(0.9, { t: t, type: 'highpass', f: 5000, vol: 0.05 });
      }
    },
    shopBell: function () {
      var t = now();
      bell(2093, t, 0.09, 1.2);
      bell(2637, t + 0.12, 0.08, 1.2);
      bell(2093, t + 0.26, 0.07, 1.4);
      bell(3136, t + 0.38, 0.05, 1.6);
    },
    buy: function () {
      var t = now();
      bell(F.G6, t, 0.1, 0.6);
      bell(F.C7, t + 0.08, 0.1, 0.9);
      noise(0.12, { t: t, type: 'highpass', f: 6000, vol: 0.05 });
    },
    equip: function () { note(600, 0.08, { vol: 0.16, type: 'triangle', to: 900 }); },
    coin: function () { arp([1760, 2093, 2637], 0.05, { vol: 0.08, type: 'sine', dur: 0.25 }); },
    wheelTick: function () {
      var t = now();
      note(1400, 0.025, { t: t, vol: 0.14, type: 'triangle' });
      noise(0.015, { t: t, type: 'highpass', f: 4000, vol: 0.2 });
    },
    feed: function () {
      var t = now();
      for (var i = 0; i < 3; i++) noise(0.07, { t: t + i * 0.11, type: 'lowpass', f: 900, to: 400, q: 2, vol: 0.6 });
    },
    levelUp: function () { arp([F.C5, F.E5, F.G5, F.C6, F.E6], 0.08, { vol: 0.11, dur: 0.5 }); bell(F.G6, now() + 0.4, 0.09, 1); },
    pat: function () { note(700, 0.1, { vol: 0.16, to: 1100 }); },
    unlock: function () {
      var t = now();
      bell(F.G6, t, 0.09, 0.8);
      bell(F.C7, t + 0.1, 0.09, 0.8);
      bell(F.E6 * 2, t + 0.2, 0.09, 1.1);
    },
    hint: function () {
      var t = now();
      note(880, 0.35, { t: t, vol: 0.06 });
      note(1175, 0.5, { t: t + 0.14, vol: 0.06 });
    }
  };

  function play(name, arg, arg2) {
    if (!ready() || sfxVol === 0) return;
    var fn = SFX[name];
    if (!fn) return;
    try { fn(arg, arg2); } catch (e) {}
  }

  function duck(sec) {
    if (!ready()) return;
    var t = now();
    duckBus.gain.cancelScheduledValues(t);
    duckBus.gain.setTargetAtTime(0.35, t, 0.05);
    duckBus.gain.setTargetAtTime(1, t + (sec || 1.6), 0.4);
  }

  /* 背景音樂 */

  function stepSeconds(tr) { return 60 / tr.bpm / 4; }

  function playEvent(inst, e, t) {
    var tr = inst.tr;
    var sd = stepSeconds(tr);
    var bus = inst.bus;
    var f = e.m != null ? midiFreq(e.m) : 0;
    if (e.k === 'pad') note(f, e.steps * sd, { t: t, vol: e.v, type: tr.pad.wave, attack: 0.4, hold: true, release: 0.6, bus: bus });
    else if (e.k === 'bass') note(f, e.steps * sd * 1.2, { t: t, vol: e.v, type: tr.bass.wave, attack: 0.01, bus: bus });
    else if (e.k === 'arp') note(f, tr.arp.decay, { t: t, vol: e.v, type: tr.arp.wave, attack: 0.004, bus: bus });
    else if (e.k === 'lead') note(f, tr.lead.decay, { t: t, vol: e.v, type: tr.lead.wave, attack: 0.01, bus: bus });
    else if (e.k === 'kick') note(150, 0.16, { t: t, vol: e.v, to: 45, bus: bus });
    else if (e.k === 'snare') {
      noise(0.12, { t: t, type: 'bandpass', f: 1800, q: 0.6, vol: e.v, bus: bus });
      note(200, 0.08, { t: t, vol: e.v * 0.5, type: 'triangle', bus: bus });
    } else if (e.k === 'hat') noise(0.04, { t: t, type: 'highpass', f: 7000, vol: e.v, bus: bus });
  }

  function scheduleUntil(inst, until) {
    var tr = inst.tr;
    var sd = stepSeconds(tr);
    while (inst.next < until) {
      var swing = inst.step % 2 === 1 ? tr.swing * sd : 0;
      var events = stepEvents(inst.id, inst.step);
      for (var i = 0; i < events.length; i++) playEvent(inst, events[i], inst.next + swing);
      inst.next += sd;
      inst.step++;
    }
  }

  function startTrack(id) {
    var bus = ctx.createGain();
    var t = now();
    bus.gain.setValueAtTime(0.0001, t);
    bus.gain.linearRampToValueAtTime(1, t + FADE);
    bus.connect(duckBus);
    var inst = { id: id, tr: TRACKS[id], bus: bus, step: 0, next: t + 0.08, timer: null };
    inst.timer = setInterval(function () {
      try { scheduleUntil(inst, now() + LOOKAHEAD); } catch (e) { clearInterval(inst.timer); }
    }, TICK_MS);
    scheduleUntil(inst, t + LOOKAHEAD);
    return inst;
  }

  function stopTrack(inst) {
    clearInterval(inst.timer);
    var t = now();
    inst.bus.gain.cancelScheduledValues(t);
    inst.bus.gain.setValueAtTime(inst.bus.gain.value, t);
    inst.bus.gain.linearRampToValueAtTime(0.0001, t + FADE);
    setTimeout(function () { try { inst.bus.disconnect(); } catch (e) {} }, FADE * 1000 + 700);
  }

  function musicWanted() {
    return ready() && musicVol > 0 && Sound && Sound.getVolume() > 0 && !root.document.hidden;
  }

  function sync() {
    var want = musicWanted() ? (moodTrack || sceneTrack) : null;
    if (current && current.id === want) return;
    if (current) { stopTrack(current); current = null; }
    if (want && TRACKS[want]) current = startTrack(want);
  }

  function scene(name) {
    sceneTrack = SCENES[name] || null;
    moodTrack = null;
    sync();
  }

  function mood(id) {
    moodTrack = id && TRACKS[id] ? id : null;
    sync();
  }

  function setSfxVolume(v) {
    sfxVol = Math.min(1, Math.max(0, v));
    store(SFX_KEY, sfxVol);
    applyVolumes();
  }

  function setMusicVolume(v) {
    musicVol = Math.min(1, Math.max(0, v));
    store(MUSIC_KEY, musicVol);
    applyVolumes();
    sync();
  }

  function refresh() {
    applyVolumes();
    sync();
  }

  function attach() {
    var a = Sound && Sound.audio();
    if (!a || ctx) return;
    use(a.ctx, a.out);
    sync();
  }

  if (Sound && Sound.onReady) Sound.onReady(attach);

  root.document.addEventListener('visibilitychange', function () {
    if (!ctx || !ctx.suspend) return;
    if (root.document.hidden) {
      sync();
      ctx.suspend();
    } else {
      Promise.resolve(ctx.resume()).then(sync);
    }
  });

  api.play = play;
  api.scene = scene;
  api.mood = mood;
  api.duck = duck;
  api.refresh = refresh;
  api.getSfxVolume = function () { return sfxVol; };
  api.getMusicVolume = function () { return musicVol; };
  api.setSfxVolume = setSfxVolume;
  api.setMusicVolume = setMusicVolume;
  api.current = function () { return current ? current.id : null; };
  api.SFX_NAMES = Object.keys(SFX);
  api._use = use;
  api._renderTrack = function (id, seconds) {
    var inst = { id: id, tr: TRACKS[id], bus: ctx.createGain(), step: 0, next: 0, timer: null };
    inst.bus.connect(duckBus);
    scheduleUntil(inst, seconds);
  };
  root.TurtleFx = api;
})(typeof window !== 'undefined' ? window : globalThis);
