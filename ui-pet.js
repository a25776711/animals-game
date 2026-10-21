(function (root) {
  'use strict';

  var Pet = root.TurtlePet;
  var Shop = root.TurtleShop;
  var E = root.TurtleEconomy;
  var P = root.TurtleProgress;

  var REFRESH_MS = 30000;
  var BUBBLE_MS = 1800;
  var DAY_MS = 86400000;

  function create(app) {
    var screen = document.getElementById('petScreen');
    var bubbleTimer = null;
    var bubble = '';

    function say(text) {
      bubble = text;
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(function () { bubble = ''; if (screen.classList.contains('active')) render(); }, BUBBLE_MS);
    }

    function meter(label, value, max, cls) {
      var wrap = app.el('div', 'meter-wrap');
      var head = app.el('div', 'meter-head');
      head.appendChild(app.el('span', null, label));
      head.appendChild(app.el('span', null, value + ' / ' + max));
      var bar = app.el('div', 'meter ' + (cls || ''));
      var fill = app.el('i');
      fill.style.width = Math.min(100, Math.round(value / max * 100)) + '%';
      bar.appendChild(fill);
      wrap.appendChild(head);
      wrap.appendChild(bar);
      return wrap;
    }

    function render() {
      var el = app.el;
      var p = app.profile();
      var now = E.clock(p, Date.now());
      var pet = p.pet;
      var info = P.petLevelInfo(pet.xp);
      var stage = Pet.stage(info.level);
      var fullness = Pet.fullnessNow(pet, now);
      var mood = Pet.mood(fullness);
      var cost = Pet.feedCost(info.level);
      var days = pet.since ? Math.floor((now - pet.since) / DAY_MS) + 1 : 1;

      screen.innerHTML = '';
      screen.appendChild(el('h2', 'heading', '養龜'));
      screen.appendChild(app.walletRow(['turtles']));

      var box = el('div', 'pet-stage');
      box.setAttribute('role', 'button');
      box.setAttribute('aria-label', '摸摸' + pet.name);
      box.tabIndex = 0;
      var scale = el('div', 'pet-scale');
      scale.style.transform = 'scale(' + stage.scale + ')';
      var body = el('div', 'pet');
      var img = el('img');
      img.src = app.COLORS[pet.color].img;
      img.alt = pet.name;
      body.appendChild(img);
      var hat = pet.accessory && Shop.find(pet.accessory);
      if (hat && hat.emoji) body.appendChild(el('span', 'pet-hat', hat.emoji));
      scale.appendChild(body);
      box.appendChild(scale);
      if (bubble) box.appendChild(el('div', 'pet-bubble', bubble));
      var pat = function () {
        body.classList.remove('bounce');
        void body.offsetWidth;
        body.classList.add('bounce');
        say(fullness >= 40 ? '嘿嘿～' : '肚子餓了…');
        var b = box.querySelector('.pet-bubble');
        if (!b) {
          b = el('div', 'pet-bubble');
          box.appendChild(b);
        }
        b.textContent = bubble;
      };
      box.addEventListener('click', pat);
      box.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pat(); } });
      screen.appendChild(box);

      var nameRow = el('div', 'pet-name');
      nameRow.appendChild(el('b', null, pet.name));
      var edit = el('button', 'linkbtn', '✎ 改名');
      edit.type = 'button';
      edit.addEventListener('click', renameDialog);
      nameRow.appendChild(edit);
      screen.appendChild(nameRow);
      screen.appendChild(el('p', 'game-note', stage.name + '　Lv.' + info.level + '　陪伴第 ' + days + ' 天'));

      var meters = el('div', 'meters');
      meters.appendChild(meter('經驗', info.into, info.need, 'xp'));
      meters.appendChild(meter('飽足度 ' + mood.face + ' ' + mood.text, fullness, 100, fullness < 40 ? 'low' : ''));
      screen.appendChild(meters);

      var feed = el('button', 'btn primary', '餵食（-' + cost + ' 隻烏龜）');
      feed.type = 'button';
      feed.disabled = fullness >= 100 || p.wallet.turtles < cost;
      feed.addEventListener('click', doFeed);
      screen.appendChild(feed);
      if (fullness >= 100) screen.appendChild(el('p', 'game-note', '吃飽了，過一陣子才會餓'));
      else if (p.wallet.turtles < cost) screen.appendChild(el('p', 'game-note', '烏龜不夠，去開幾包吧'));
      else screen.appendChild(el('p', 'game-note', '每次餵食 +' + Pet.FEED_XP + ' 經驗、飽足度 +' + Pet.FEED_GAIN + '，等級越高越貴'));

      screen.appendChild(el('h3', 'section-title', '顏色'));
      var colors = el('div', 'lucky-picker pet-colors');
      colors.setAttribute('role', 'radiogroup');
      app.COLORS.forEach(function (c) {
        var b = el('button', 'lucky-opt');
        b.type = 'button';
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-label', c.name + '色');
        b.setAttribute('aria-checked', String(c.id === pet.color));
        var im = el('img');
        im.src = c.img;
        im.alt = '';
        b.appendChild(im);
        b.addEventListener('click', function () {
          Pet.setColor(p, c.id, Date.now());
          app.save();
          render();
        });
        colors.appendChild(b);
      });
      screen.appendChild(colors);

      screen.appendChild(el('h3', 'section-title', '配件'));
      var hats = Shop.ITEMS.filter(function (i) { return i.type === 'hat' && Shop.isOwned(p, i.id); });
      if (!hats.length) {
        screen.appendChild(el('p', 'game-note', '還沒有配件，到裝飾商店買一個吧'));
      } else {
        var seg = el('div', 'seg hat-seg');
        seg.setAttribute('role', 'radiogroup');
        var none = el('button', null, '不戴');
        none.type = 'button';
        none.setAttribute('role', 'radio');
        none.setAttribute('aria-checked', String(!pet.accessory));
        none.addEventListener('click', function () { Shop.removeHat(p, Date.now()); app.save(); render(); });
        seg.appendChild(none);
        hats.forEach(function (h) {
          var b = el('button', null, h.emoji + ' ' + h.name);
          b.type = 'button';
          b.setAttribute('role', 'radio');
          b.setAttribute('aria-checked', String(pet.accessory === h.id));
          b.addEventListener('click', function () { Shop.equip(p, h.id, Date.now()); app.save(); render(); });
          seg.appendChild(b);
        });
        screen.appendChild(seg);
      }
      var go = el('button', 'btn secondary', '🛍️ 去裝飾商店');
      go.type = 'button';
      go.addEventListener('click', function () { app.open('shop'); });
      screen.appendChild(go);
      app.refreshWallets();
    }

    function doFeed() {
      var p = app.profile();
      var r = Pet.feed(p, Date.now());
      if (!r.ok) {
        app.toastText(r.reason === 'full' ? '吃飽了，晚點再餵' : '烏龜不夠，需要 ' + r.cost + ' 隻');
        render();
        return;
      }
      app.save();
      app.notify(r.unlocked);
      say(r.leveledUp ? '我長大了！' : '好吃！');
      if (r.leveledUp) app.toastText('🎉 ' + p.pet.name + ' 升到 Lv.' + r.level);
      render();
    }

    function renameDialog() {
      var p = app.profile();
      var m = app.openModal({ label: '幫小龜取名字' });
      m.card.appendChild(app.el('h3', null, '幫小龜取名字'));
      var input = app.el('input', 'name-input');
      input.type = 'text';
      input.maxLength = Pet.MAX_NAME;
      input.value = p.pet.name;
      input.setAttribute('aria-label', '名字');
      m.card.appendChild(input);
      m.card.appendChild(app.el('p', null, '最多 ' + Pet.MAX_NAME + ' 個字'));
      var ok = app.el('button', 'btn choice merge', '確定');
      ok.type = 'button';
      function submit() {
        Pet.rename(p, input.value, Date.now());
        app.save();
        m.close();
        render();
      }
      ok.addEventListener('click', submit);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
      var cancel = app.el('button', 'linkbtn', '取消');
      cancel.type = 'button';
      cancel.addEventListener('click', m.close);
      m.card.appendChild(ok);
      m.card.appendChild(cancel);
      input.focus();
      input.select();
    }

    setInterval(function () {
      if (screen.classList.contains('active') && !document.querySelector('.modal')) render();
    }, REFRESH_MS);

    return {
      open: function () {
        var p = app.profile();
        if (Pet.adopt(p, Date.now())) app.save();
        bubble = '';
        render();
        app.show('pet');
      }
    };
  }

  root.TurtlePetUI = { create: create };
})(window);
