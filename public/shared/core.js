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
  // Открыто прямо из папки (file://) — сервера нет: играем офлайн, контент берём из local-config.js
  var FILE_MODE = global.location.protocol === 'file:';
  var online = false;
  var apiBase = null;
  function detectBase() {
    var candidates = [ROOT, ROOT + 'api.php/'];
    var i = 0;
    if (FILE_MODE) return Promise.resolve(null).then(function () { apiBase = ''; return ''; });
    function next() {
      if (i >= candidates.length) return Promise.resolve(null);
      var b = candidates[i++];
      return fetch(b + 'api/ping', { cache: 'no-store' }).then(function (r) {
        if (!r.ok) return next();
        return r.json().then(function (j) { return j && j.ok ? b : next(); }).catch(next);
      }).catch(next);
    }
    return next().then(function (b) { online = b !== null; apiBase = online ? b : candidates[0]; return apiBase; });
  }
  var basePromise = detectBase();

  function api(path, method, body) {
    var ready = apiBase === null ? basePromise : Promise.resolve(apiBase);
    return ready.then(function (base) {
      if (!online) throw new Error('offline');
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
  // Приоритет: настройки с сервера → local-config.js (офлайн-копия от учителя) → встроенные
  function localConfig(game) {
    var lc = global.LOCAL_CONFIG;
    return lc && lc[game] && typeof lc[game] === 'object' ? lc[game] : null;
  }
  function loadConfig(game) {
    return api('api/games/' + game + '/config').then(function (d) { return d.config || localConfig(game); }).catch(function () { return localConfig(game); });
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
  // Мягкое эхо поверх сухого сигнала — звуки звучат «дороже»
  var bus = null;
  function out() {
    var ctx = ac(); if (!ctx) return null;
    if (!bus) {
      bus = ctx.createGain(); bus.gain.value = 0.9;
      var delay = ctx.createDelay(), fb = ctx.createGain(), wet = ctx.createGain(), lp = ctx.createBiquadFilter();
      delay.delayTime.value = 0.16; fb.gain.value = 0.28; wet.gain.value = 0.22; lp.type = 'lowpass'; lp.frequency.value = 3200;
      bus.connect(ctx.destination); bus.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(wet); wet.connect(ctx.destination);
    }
    return bus;
  }
  function tone(freq, t0, dur, type, vol) {
    var ctx = ac(), dst = out(); if (!ctx || muted || !dst) return;
    var o = ctx.createOscillator(), g = ctx.createGain(), at = ctx.currentTime + t0;
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, at + dur);
    o.connect(g); g.connect(dst);
    o.start(at); o.stop(at + dur + 0.05);
  }
  // колокольчик: основной тон + октава + лёгкая расстройка
  function bell(freq, t0, dur, vol) {
    tone(freq, t0, dur, 'sine', vol || 0.1); tone(freq * 2, t0, dur * 0.6, 'sine', (vol || 0.1) * 0.35); tone(freq * 1.006, t0, dur, 'triangle', (vol || 0.1) * 0.4);
  }
  function noise(t0, dur, vol, from, to) {
    var ctx = ac(), dst = out(); if (!ctx || muted || !dst) return;
    var len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), at = ctx.currentTime + t0;
    src.buffer = buf; f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(from || 600, at); f.frequency.exponentialRampToValueAtTime(to || 2400, at + dur);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol || 0.08, at + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0008, at + dur);
    src.connect(f); f.connect(g); g.connect(dst); src.start(at); src.stop(at + dur + 0.02);
  }
  var sfx = {
    good: function () { bell(659.25, 0, .35, .1); bell(830.6, .09, .35, .09); bell(987.8, .18, .5, .09); },
    soft: function () { tone(330, 0, .18, 'triangle', .09); tone(247, .12, .28, 'triangle', .08); },
    munch: function () { noise(0, .08, .05, 300, 900); noise(.1, .08, .05, 300, 900); tone(220, 0, .07, 'square', .03); },
    win: function () { [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach(function (f, i) { bell(f, i * .11, .6, .09); }); tone(261.6, 0, 1.2, 'triangle', .05); tone(392, 0, 1.2, 'triangle', .04); },
    pop: function () { tone(880, 0, .07, 'sine', .08); tone(1320, .04, .09, 'sine', .06); },
    sparkle: function () { [1568, 1976, 2349, 2637].forEach(function (f, i) { bell(f, i * .06, .3, .035); }); },
    plop: function () { tone(520, 0, .12, 'sine', .1); tone(300, .02, .16, 'sine', .08); noise(0, .1, .04, 2000, 400); },
    whoosh: function () { noise(0, .35, .06, 400, 3000); }
  };
  function vibrate(p) { try { if (!muted && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
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
    sfx: sfx, tone: tone, bell: bell, ac: ac, speak: speak, vibrate: vibrate,
    fileMode: FILE_MODE, isOnline: function () { return online; }, localConfig: localConfig,
    isMuted: function () { return muted; }, setMuted: setMuted,
    shuffle: shuffle, el: el
  };
})(window);
