(function (root) {
  'use strict';

  var Chat = root.TurtleChat;

  function create(app) {
    var screen = document.getElementById('chatScreen');
    var nick;
    var nickFor = null;
    var messages = [];
    var stop = null;
    var listEl = null;
    var lastSent = 0;
    var sending = false;

    function cloud() { return root.Cloud; }
    function user() { return app.account(); }

    function reportLink() {
      var url = root.ReportConfig && root.ReportConfig.url;
      if (!/^https:\/\//.test(url || '')) return null;
      var a = app.el('a', 'linkbtn report-link', '有人亂講話？回報給作者');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      return a;
    }

    function header() {
      screen.innerHTML = '';
      screen.appendChild(app.el('h2', 'heading', '聊天室'));
      screen.appendChild(app.el('p', 'game-note', '所有玩家都看得到你說的話，請不要留真實姓名、電話或住址。'));
    }

    function renderNeedLogin() {
      header();
      var c = cloud();
      if (!c || !c.enabled) {
        screen.appendChild(app.el('p', 'game-msg lose', '這個環境沒有開放聊天室'));
        return;
      }
      screen.appendChild(app.el('p', 'game-note', '要先用 Google 登入才能聊天，這樣才能防止亂發言。'));
      var b = app.el('button', 'btn primary', '使用 Google 登入');
      b.type = 'button';
      b.addEventListener('click', function () { app.signIn(); });
      screen.appendChild(b);
    }

    function renderNickForm() {
      header();
      screen.appendChild(app.el('h3', 'section-title', '先取一個暱稱'));
      screen.appendChild(app.el('p', 'game-note', Chat.NICK_MIN + '～' + Chat.NICK_MAX + ' 個字，可以用中文、英文、數字、底線和減號。暱稱不能跟別人重複，取了就不能改。'));
      var input = app.el('input', 'name-input');
      input.type = 'text';
      input.maxLength = 24;
      input.placeholder = '你的暱稱';
      input.setAttribute('aria-label', '暱稱');
      input.autocomplete = 'off';
      var msg = app.el('p', 'game-msg lose', '');
      var ok = app.el('button', 'btn primary', '就用這個');
      ok.type = 'button';

      function submit() {
        var r = Chat.checkNick(input.value);
        if (!r.ok) { msg.textContent = r.reason; return; }
        ok.disabled = true;
        msg.textContent = '檢查中…';
        cloud().chat.nickTaken(r.key).then(function (taken) {
          if (taken) throw { code: 'taken' };
          return cloud().chat.claimNick(r.name, r.key);
        }).then(function () {
          nick = r.name;
          nickFor = user() && user().uid;
          app.fx('unlock');
          render();
        }).catch(function (e) {
          ok.disabled = false;
          msg.textContent = e && (e.code === 'taken' || e.code === 'permission-denied')
            ? '這個暱稱已經有人用了，換一個吧'
            : '連線失敗，請稍後再試';
        });
      }

      ok.addEventListener('click', submit);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
      screen.appendChild(input);
      screen.appendChild(msg);
      screen.appendChild(ok);
      input.focus();
    }

    function atBottom() {
      return !listEl || listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight < 80;
    }

    function drawMessages() {
      if (!listEl) return;
      var stick = atBottom();
      listEl.innerHTML = '';
      if (!messages.length) listEl.appendChild(app.el('p', 'game-note', '還沒有人說話，當第一個吧'));
      var me = user() && user().uid;
      messages.forEach(function (m) {
        var row = app.el('div', 'chat-msg' + (m.uid === me ? ' mine' : ''));
        var head = app.el('div', 'chat-head');
        head.appendChild(app.el('b', null, m.name));
        head.appendChild(app.el('time', null, Chat.timeLabel(m.t)));
        row.appendChild(head);
        row.appendChild(app.el('div', 'chat-text', m.text));
        listEl.appendChild(row);
      });
      if (stick) listEl.scrollTop = listEl.scrollHeight;
    }

    function startWatch() {
      if (stop) return;
      stop = cloud().chat.watch(function (list) {
        messages = list;
        drawMessages();
      }, function () {
        if (listEl) {
          listEl.innerHTML = '';
          listEl.appendChild(app.el('p', 'game-msg lose', '聊天室暫時連不上，請稍後再來'));
        }
      });
    }

    function renderChat() {
      header();
      listEl = app.el('div', 'chat-list');
      listEl.setAttribute('aria-live', 'polite');
      screen.appendChild(listEl);

      var form = app.el('div', 'chat-form');
      var input = app.el('input', 'name-input');
      input.type = 'text';
      input.maxLength = Chat.MSG_MAX * 2;
      input.placeholder = '以「' + nick + '」的名字說話';
      input.setAttribute('aria-label', '訊息');
      input.autocomplete = 'off';
      var send = app.el('button', 'btn primary', '送出');
      send.type = 'button';
      var note = app.el('p', 'game-msg lose', '');

      function go() {
        if (sending) return;
        var r = Chat.checkMessage(input.value);
        if (!r.ok) { note.textContent = r.reason; return; }
        var wait = Chat.COOLDOWN_MS - (Date.now() - lastSent);
        if (wait > 0) { note.textContent = '說太快了，等 ' + Math.ceil(wait / 1000) + ' 秒'; return; }
        sending = true;
        send.disabled = true;
        note.textContent = '';
        cloud().chat.send(nick, r.text).then(function () {
          lastSent = Date.now();
          input.value = '';
          app.fx('pop', 4);
        }).catch(function (e) {
          note.textContent = e && e.code === 'permission-denied' ? '送不出去，可能說太快了，等一下再試' : '連線失敗，請稍後再試';
        }).then(function () {
          sending = false;
          send.disabled = false;
          input.focus();
        });
      }

      send.addEventListener('click', go);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });
      form.appendChild(input);
      form.appendChild(send);
      screen.appendChild(form);
      screen.appendChild(note);
      var report = reportLink();
      if (report) screen.appendChild(report);
      drawMessages();
      startWatch();
    }

    function leave() {
      if (stop) { stop(); stop = null; }
      listEl = null;
    }

    function render() {
      leave();
      var u = user();
      if (!u) { renderNeedLogin(); return; }
      if (nickFor !== u.uid) nick = undefined;
      if (nick === undefined) {
        header();
        screen.appendChild(app.el('p', 'game-note', '讀取中…'));
        cloud().chat.getNick().then(function (n) {
          nick = n;
          nickFor = u.uid;
          if (screen.classList.contains('active')) render();
        }).catch(function () {
          if (!screen.classList.contains('active')) return;
          header();
          screen.appendChild(app.el('p', 'game-msg lose', '聊天室暫時連不上，請稍後再來'));
        });
        return;
      }
      if (nick === null) { renderNickForm(); return; }
      renderChat();
    }

    if (root.Cloud && root.Cloud.enabled) {
      root.Cloud.onAuth(function () {
        nick = undefined;
        nickFor = null;
        messages = [];
        setTimeout(function () { if (screen.classList.contains('active')) render(); }, 0);
      });
    }

    return {
      open: function () {
        render();
        app.show('chat');
      },
      leave: leave
    };
  }

  root.TurtleChatUI = { create: create };
})(window);
