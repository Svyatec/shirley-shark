/*
 * Общее ядро игр: запросы к API, имя игрока, озвучка (встроенный синтез речи браузера), звуки.
 * Подключение:  <script src="../shared/core.js" data-root="../"></script>
 * data-root — относительный путь от страницы до корня сайта ("" для главной).
 * Никаких внешних CDN и шрифтов: в Китае они часто недоступны.
 */
(function (global) {
  'use strict';

  var script = document.currentScript;
  var ROOT = (script && script.getAttribute('data-root')) || '';
  var NAME_KEY = 'shirley.name';

  var player = { name: '', role: 'student', sessionId: null };

  /* ---------- API: Node (api/...), Apache+PHP с rewrite (api/...) или PHP без mod_rewrite (api.php/api/...) ---------- */
  var apiBase = null;
  function detectBase() {
    var candidates = [ROOT, ROOT + 'api.php/'];
    var i = 0;
    function next() {
      if (i >= candidates.length) return Promise.resolve(candidates[0]);
      var b = candidates[i++];
      return fetch(b + 'api/ping', { cache: 'no-store' }).then(function (r) {
        if (!r.ok) return next();
        return r.json().then(function (j) { return j && j.ok ? b : next(); }).catch(next);
      }).catch(next);
    }
    return next().then(function (b) { apiBase = b; return b; });
  }
  var basePromise = detectBase();

  function api(path, method, body) {
    var ready = apiBase === null ? basePromise : Promise.resolve(apiBase);
    return ready.then(function (base) {
      return fetch(base + path, {
        method: method || 'GET',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-Player-Name': encodeURIComponent(player.name || '') },
        body: body ? JSON.stringify(body) : undefined
      });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
        return data;
      });
    });
  }

  /* ---------- игрок ---------- */
  function savedName() {
    try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; }
  }
  function saveName(n) {
    try { localStorage.setItem(NAME_KEY, n); } catch (e) { /* приватный режим */ }
  }
  // Новая игровая сессия: ученик попадает в отчёт, учитель играет «понарошку» (не сохраняется)
  function startSession(name, game, detail) {
    return api('api/sessions', 'POST', { name: name, game: game, detail: detail || '' }).then(function (d) {
      player.name = d.name; player.role = d.role; player.sessionId = d.sessionId;
      saveName(d.name);
      return d;
    });
  }
  function reportMistake(word, chosen, correct) {
    if (!player.sessionId) return;
    api('api/sessions/' + player.sessionId + '/mistake', 'POST', { word: word, chosen: chosen, correct: correct }).catch(function () {});
  }
  function finishSession(status, wordsDone, durationSec) {
    if (!player.sessionId) return Promise.resolve({ skipped: true });
    return api('api/sessions/' + player.sessionId + '/finish', 'POST', {
      status: status, wordsDone: wordsDone, durationSec: durationSec
    });
  }
  function loadConfig(game) {
    return api('api/games/' + game + '/config').then(function (d) { return d.config || null; }).catch(function () { return null; });
  }

  /* ---------- звук ---------- */
  var muted = false;
  try { muted = localStorage.getItem('shirley.muted') === '1'; } catch (e) {}
  var actx = null;
  function ac() {
    if (!actx) { try { actx = new (global.AudioContext || global.webkitAudioContext)(); } catch (e) {} }
    if (actx && actx.state === 'suspended') { try { actx.resume(); } catch (e) {} }
    return actx;
  }
  function tone(freq, t0, dur, type, vol) {
    var ctx = ac(); if (!ctx || muted) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.12, ctx.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t0 + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + dur + 0.05);
  }
  var sfx = {
    good: function () { tone(523, 0, .12); tone(659, .1, .12); tone(784, .2, .2); },
    soft: function () { tone(330, 0, .14, 'triangle', .1); tone(262, .12, .2, 'triangle', .1); },
    munch: function () { tone(220, 0, .07, 'square', .06); tone(180, .08, .08, 'square', .06); tone(260, .17, .08, 'square', .05); },
    win: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, i * .13, .28); }); },
    pop: function () { tone(880, 0, .06, 'sine', .08); tone(1320, .05, .08, 'sine', .06); },
    sparkle: function () { [1568, 1976, 2349].forEach(function (f, i) { tone(f, i * .07, .15, 'sine', .05); }); }
  };
  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem('shirley.muted', muted ? '1' : '0'); } catch (e) {}
    if (muted && global.speechSynthesis) global.speechSynthesis.cancel();
  }

  /* ---------- озвучка: встроенный синтез речи (SpeechSynthesis) ---------- */
  var voice = null;
  function pickVoice() {
    if (!global.speechSynthesis) return;
    var list = global.speechSynthesis.getVoices() || [];
    if (!list.length) return;
    var en = list.filter(function (v) { return /^en[-_]/i.test(v.lang) || /^en$/i.test(v.lang); });
    function find(re) { return en.filter(function (v) { return re.test(v.lang); })[0]; }
    voice = find(/en[-_]US/i) || find(/en[-_]GB/i) || en[0] || null;
  }
  if (global.speechSynthesis) {
    pickVoice();
    if (global.speechSynthesis.addEventListener) global.speechSynthesis.addEventListener('voiceschanged', pickVoice);
    else global.speechSynthesis.onvoiceschanged = pickVoice;
  }
  // speak('apple', { rate: .85 }). Если учитель задал произношение (say) — передавайте его вместо слова.
  function speak(text, opts) {
    opts = opts || {};
    if (muted || !global.speechSynthesis || !text) return false;
    try {
      global.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(text));
      u.lang = 'en-US';
      if (voice) u.voice = voice;
      u.rate = opts.rate || 0.85;
      u.pitch = opts.pitch || 1.05;
      global.speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }

  /* ---------- мелочи ---------- */
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  global.Games = {
    root: ROOT, player: player, api: api, ready: basePromise,
    savedName: savedName, startSession: startSession,
    reportMistake: reportMistake, finishSession: finishSession, loadConfig: loadConfig,
    sfx: sfx, tone: tone, ac: ac, speak: speak,
    isMuted: function () { return muted; }, setMuted: setMuted,
    shuffle: shuffle, el: el
  };
})(window);
