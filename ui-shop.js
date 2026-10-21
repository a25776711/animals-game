(function (root) {
  'use strict';

  var Shop = root.TurtleShop;
  var P = root.TurtleProgress;

  function create(app) {
    var screen = document.getElementById('shopScreen');
    var tab = 'theme';

    function preview(item) {
      var el = app.el;
      if (item.type === 'hat') return root.TurtleUICommon.icon(item.id.replace('hat-', ''), 'shop-preview hat');
      if (item.type === 'theme') {
        var sw = el('div', 'shop-preview theme');
        sw.setAttribute('data-skin', item.skin);
        return sw;
      }
      var b = el('div', 'shop-preview board-preview');
      b.setAttribute('data-board', item.skin);
      return b;
    }

    function stateButton(p, item) {
      var el = app.el;
      var b = el('button', 'btn');
      b.type = 'button';
      if (Shop.isEquipped(p, item.id) && (item.type !== 'hat' || p.pet.accessory === item.id)) {
        b.textContent = '使用中';
        b.disabled = true;
        b.classList.add('using');
      } else if (Shop.isOwned(p, item.id)) {
        b.textContent = '裝備';
        b.classList.add('equip');
        b.addEventListener('click', function () {
          Shop.equip(p, item.id, Date.now());
          app.applySkin();
          app.save();
          render();
        });
      } else {
        var c = Shop.check(p, item.id);
        if (!c.ok && c.reason === 'level') {
          b.textContent = '小龜要 Lv.' + c.need;
          b.disabled = true;
        } else {
          b.textContent = '購買 ' + app.fmt(item.price) + ' 隻烏龜';
          b.classList.add('buy');
          b.disabled = !c.ok;
          b.addEventListener('click', function () { confirmBuy(item); });
        }
      }
      return b;
    }

    function render() {
      var el = app.el;
      var p = app.profile();
      screen.innerHTML = '';
      screen.appendChild(el('h2', 'heading', '裝飾商店'));
      screen.appendChild(app.walletRow(['turtles']));
      screen.appendChild(el('p', 'game-note', '用烏龜買背景、棋盤花紋和小龜的配件。有些要小龜長到一定等級才能買。'));

      var seg = el('div', 'seg shop-tabs');
      seg.setAttribute('role', 'radiogroup');
      Shop.TYPES.forEach(function (ty) {
        var b = el('button', null, ty.name);
        b.type = 'button';
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', String(tab === ty.id));
        b.addEventListener('click', function () { tab = ty.id; render(); });
        seg.appendChild(b);
      });
      screen.appendChild(seg);

      var grid = el('div', 'shop-grid');
      Shop.ITEMS.filter(function (i) { return i.type === tab; }).forEach(function (item) {
        var card = el('div', 'shop-item' + (Shop.isOwned(p, item.id) ? ' owned' : ''));
        card.appendChild(preview(item));
        card.appendChild(el('div', 'shop-name', item.name));
        if (item.level && !Shop.isOwned(p, item.id)) card.appendChild(el('small', 'shop-req', '需要小龜 Lv.' + item.level));
        card.appendChild(stateButton(p, item));
        grid.appendChild(card);
      });
      screen.appendChild(grid);

      var owned = Object.keys(p.shop.owned).length;
      screen.appendChild(el('p', 'game-note', '已擁有 ' + owned + ' 件'));
      app.refreshWallets();
    }

    function confirmBuy(item) {
      var m = app.openModal({ label: '確認購買' });
      m.card.appendChild(app.el('h3', null, '買「' + item.name + '」？'));
      m.card.appendChild(app.el('p', null, '會花 ' + app.fmt(item.price) + ' 隻烏龜，買了不能退。'));
      var ok = app.el('button', 'btn choice merge', '買！');
      ok.type = 'button';
      ok.addEventListener('click', function () {
        m.close();
        var p = app.profile();
        var r = Shop.buy(p, item.id, Date.now());
        if (!r.ok) {
          app.toastText(r.reason === 'level' ? '小龜等級不夠' : '烏龜不夠');
        } else {
          app.save();
          app.notify(r.unlocked);
          app.toastText('買到了：' + item.name);
        }
        render();
      });
      var cancel = app.el('button', 'linkbtn', '再想想');
      cancel.type = 'button';
      cancel.addEventListener('click', m.close);
      m.card.appendChild(ok);
      m.card.appendChild(cancel);
      cancel.focus();
    }

    return {
      open: function () {
        render();
        app.show('shop');
      }
    };
  }

  root.TurtleShopUI = { create: create };
})(window);
