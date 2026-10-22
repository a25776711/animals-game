(function (root) {
  'use strict';

  var isNode = typeof module !== 'undefined' && module.exports;

  var NICK_MIN = 2;
  var NICK_MAX = 12;
  var MSG_MAX = 200;
  var COOLDOWN_MS = 2000;
  var NICK_CHARS = /^[A-Za-z0-9_\-一-鿿]+$/;
  var RESERVED = /(admin|system|作者|管理|客服|官方)/i;
  var LINK = /(https?:|www\.|:\/\/)/i;

  function chars(s) { return Array.from(s).length; }

  function nickKey(name) { return name.toLowerCase(); }

  function checkNick(raw) {
    var name = String(raw == null ? '' : raw).trim();
    var n = chars(name);
    if (n < NICK_MIN) return { ok: false, reason: '暱稱至少 ' + NICK_MIN + ' 個字' };
    if (n > NICK_MAX) return { ok: false, reason: '暱稱最多 ' + NICK_MAX + ' 個字' };
    if (!NICK_CHARS.test(name)) return { ok: false, reason: '只能用中文、英文、數字、底線和減號，不能有空格或符號' };
    if (RESERVED.test(name)) return { ok: false, reason: '這個暱稱不能用' };
    return { ok: true, name: name, key: nickKey(name) };
  }

  function checkMessage(raw) {
    var text = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
    if (!text) return { ok: false, reason: '' };
    if (chars(text) > MSG_MAX) return { ok: false, reason: '一則最多 ' + MSG_MAX + ' 個字' };
    if (LINK.test(text)) return { ok: false, reason: '為了安全，聊天室不能貼網址' };
    return { ok: true, text: text };
  }

  function timeLabel(ms) {
    var d = new Date(ms);
    function p(n) { return n < 10 ? '0' + n : String(n); }
    return p(d.getHours()) + ':' + p(d.getMinutes());
  }

  var api = {
    NICK_MIN: NICK_MIN, NICK_MAX: NICK_MAX, MSG_MAX: MSG_MAX, COOLDOWN_MS: COOLDOWN_MS,
    nickKey: nickKey, checkNick: checkNick, checkMessage: checkMessage, timeLabel: timeLabel
  };

  if (isNode) module.exports = api;
  else root.TurtleChat = api;
})(typeof window !== 'undefined' ? window : globalThis);
