const assert = require('node:assert/strict');
const Fx = require('./fx.js');

const t = (name, fn) => { fn(); console.log('ok  -', name); };
const ids = Object.keys(Fx.TRACKS);

t('每個畫面都對得到一首存在的曲子', () => {
  const screens = ['title', 'start', 'play', 'result', 'ach', 'supply', 'hub', 'pet', 'shop', 'race', 'bj', 'mem', 'gacha'];
  screens.forEach((s) => assert.ok(Fx.TRACKS[Fx.SCENES[s]], s));
});

t('動作用的曲子（賽跑中、21 點出牌中、剩幾包、翻牌中）都存在', () => {
  ['raceGo', 'bjPlay', 'playLow', 'memPlay'].forEach((id) => assert.ok(Fx.TRACKS[id], id));
});

t('每首曲子的節奏字串都是 16 格', () => {
  ids.forEach((id) => {
    const tr = Fx.TRACKS[id];
    assert.equal(tr.bass.pat.length, 16, id + ' bass');
    assert.equal(tr.arp.pat.length, 16, id + ' arp');
    assert.equal(tr.lead.rhythm.length, 16, id + ' lead');
    ['kick', 'snare', 'hat'].forEach((k) => {
      assert.ok(tr.drums[k] === '' || tr.drums[k].length === 16, id + ' ' + k);
    });
    assert.ok(tr.bpm >= 60 && tr.bpm <= 160, id + ' bpm');
  });
});

t('整首曲子每一步的音高都在手機喇叭聽得到又不刺耳的範圍', () => {
  ids.forEach((id) => {
    const tr = Fx.TRACKS[id];
    const steps = tr.prog.length * Fx.STEPS;
    let notes = 0;
    for (let i = 0; i < steps; i++) {
      Fx.stepEvents(id, i).forEach((e) => {
        if (e.m == null) return;
        notes++;
        const f = Fx.midiFreq(e.m);
        const lo = e.k === 'bass' ? 70 : 100;
        assert.ok(f >= lo && f <= 2500, id + ' ' + e.k + ' ' + f.toFixed(0) + 'Hz @' + i);
        assert.ok(e.v > 0 && e.v < 0.4);
      });
    }
    assert.ok(notes > 8, id + ' 太空');
  });
});

t('旋律音階只用五聲音階、落在設定的音域內，而且每次都一樣', () => {
  ids.forEach((id) => {
    const tr = Fx.TRACKS[id];
    const rows = Fx.melodyOf(id);
    assert.equal(rows.length, tr.prog.length);
    const again = JSON.stringify(rows);
    rows.forEach((row) => {
      assert.equal(row.length, Fx.STEPS);
      row.forEach((d) => {
        if (d === null) return;
        assert.ok(d >= tr.lead.low && d <= tr.lead.high, id + ' degree ' + d);
      });
    });
    assert.equal(JSON.stringify(Fx.melodyOf(id)), again);
  });
});

t('每首曲子都有旋律（不是整首都休止）', () => {
  ids.forEach((id) => {
    const has = Fx.melodyOf(id).some((row) => row.some((d) => d !== null));
    assert.ok(has, id);
  });
});

t('有鼓的曲子，每一小節都有鼓點', () => {
  ['play', 'playLow', 'race', 'raceGo', 'shop'].forEach((id) => {
    const tr = Fx.TRACKS[id];
    for (let bar = 0; bar < tr.prog.length; bar++) {
      let drums = 0;
      for (let s = 0; s < Fx.STEPS; s++) {
        drums += Fx.stepEvents(id, bar * Fx.STEPS + s).filter((e) => e.k === 'kick' || e.k === 'hat' || e.k === 'snare').length;
      }
      assert.ok(drums > 0, id + ' bar ' + bar);
    }
  });
});

t('曲子是循環的：跑完一圈回到開頭的音一樣', () => {
  ids.forEach((id) => {
    const tr = Fx.TRACKS[id];
    const loop = tr.prog.length * Fx.STEPS;
    for (let i = 0; i < Fx.STEPS; i++) {
      assert.deepEqual(Fx.stepEvents(id, i), Fx.stepEvents(id, i + loop), id + ' @' + i);
    }
  });
});

console.log('\n全部通過');
