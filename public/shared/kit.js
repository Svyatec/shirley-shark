/*
 * Каркас для игр: имя ученика → меню историй → игра → финальная карточка + альбом наград.
 * Игра описывает только саму механику: Games.kit.create({ ..., play(round, api) }).
 * Нужны: core.js, fx.js, base.css, kit.css.
 *
 * api (передаётся в play):
 *   api.stage            — контейнер игры (между HUD и низом экрана), уже пустой
 *   api.round, api.items — выбранная история и её слова [{w, zh, e, say}], api.decoys
 *   api.settings         — общие настройки (speechRate, hintAfter, idleHintSec, showChinese) + настройки игры
 *   api.progress(done,total)  — обновить счётчик
 *   api.speak(item|text)      — озвучить (учтено say учителя и скорость речи)
 *   api.mistake(word, chosen, correct) — записать ошибку (в отчёт учителя)
 *   api.hinted()              — отметить использованную подсказку
 *   api.bubble(html, cx, topY, ms), api.hideBubble()
 *   api.idle(fn)              — вызвать fn, если ученик долго не действует (idleHintSec); возвращает функцию-сброс
 *   api.zh()                  — показывать ли китайский перевод сейчас
 *   api.cleanup(fn)           — зарегистрировать очистку (таймеры, ambient) при выходе из истории
 *   api.complete(wordsDone)   — история пройдена: сохранить результат, альбом, показать карточку
 */
(function (global) {
  'use strict';

  var G = global.Games, fx = G.fx, el = G.el;
  var MAX_WORDS = 12, MAX_DECOYS = 6;

  function $(root, sel) { return root.querySelector(sel); }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function fmtTime(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }

  /* ---------- единый формат слов и историй ---------- */
  function cleanWord(x) {
    if (!x) return null;
    var w = String(x.w == null ? '' : x.w).trim();
    if (!w) return null;
    return { w: w.slice(0, 40), zh: String(x.zh || '').trim().slice(0, 40), e: String(x.e || '').trim().slice(0, 8), say: String(x.say || '').trim().slice(0, 60) };
  }
  // raw — конфиг учителя из БД (или null), defs — набор по умолчанию { settings, rounds }
  function normalize(raw, defs, minWords) {
    minWords = minWords || 2;
    var src = raw && Array.isArray(raw.rounds) && raw.rounds.length ? raw : defs;
    var s = {};
    var common = { showChinese: true, speechRate: 0.85, hintAfter: 2, idleHintSec: 15 };
    Object.keys(common).forEach(function (k) { s[k] = k in common ? common[k] : null; });
    [defs.settings || {}, src.settings || {}].forEach(function (obj) { Object.keys(obj).forEach(function (k) { if (obj[k] != null) s[k] = obj[k]; }); });
    s.speechRate = Math.min(1.3, Math.max(0.4, Number(s.speechRate) || 0.85));
    s.hintAfter = Math.min(5, Math.max(1, parseInt(s.hintAfter, 10) || 2));
    s.idleHintSec = Math.max(0, Math.min(120, Number(s.idleHintSec) || 0));
    s.showChinese = s.showChinese !== false;
    var list = [];
    src.rounds.forEach(function (r, i) {
      var ws = (r.words || []).map(cleanWord).filter(Boolean).slice(0, MAX_WORDS);
      if (r.enabled === false || ws.length < minWords) return;
      var lower = ws.map(function (x) { return x.w.toLowerCase(); });
      var ds = (r.decoys || []).map(cleanWord).filter(function (x) { return x && lower.indexOf(x.w.toLowerCase()) < 0; }).slice(0, MAX_DECOYS);
      list.push({ idx: i, id: String(r.id || ('r' + i)), title: String(r.title || 'Story').slice(0, 40), zh: String(r.zh || '').slice(0, 60),
        emoji: String(r.emoji || '⭐').slice(0, 8), kind: r.kind === 'sentence' ? 'sentence' : 'list', words: ws, decoys: ds });
    });
    if (!list.length && raw) return normalize(null, defs, minWords);
    return { settings: s, rounds: list };
  }
  /*
   * Раскладка по ячейкам: каждый вариант ответа получает свой прямоугольник, ничего не перекрывается.
   * area {x,y,w,h}; aspect = высота/ширина элемента; вернёт размер элемента и ячейки (последний ряд по центру).
   */
  function cells(n, area, aspect, gap, maxCols) {
    gap = gap == null ? 10 : gap; aspect = aspect || 1;
    var best = null;
    for (var cols = 1; cols <= Math.min(n, maxCols || n); cols++) {
      var rows = Math.ceil(n / cols);
      var cw = (area.w - (cols - 1) * gap) / cols, ch = (area.h - (rows - 1) * gap) / rows;
      var size = Math.min(cw, ch / aspect);
      if (!best || size > best.size + 0.5) best = { cols: cols, rows: rows, cw: cw, ch: ch, size: size };
    }
    var out = [];
    for (var i = 0; i < n; i++) {
      var r = Math.floor(i / best.cols), c = i % best.cols;
      var inRow = r === best.rows - 1 ? n - (best.rows - 1) * best.cols : best.cols;
      var off = (best.cols - inRow) * (best.cw + gap) / 2;
      var x = area.x + off + c * (best.cw + gap), y = area.y + r * (best.ch + gap);
      out.push({ x: x, y: y, w: best.cw, h: best.ch, cx: x + best.cw / 2, cy: y + best.ch / 2, row: r, col: c });
    }
    return { cells: out, size: best.size, cols: best.cols, rows: best.rows };
  }

  // Тонкое «зерно» плёнки для фактуры фона (генерируется один раз)
  var grainURL = null;
  function grain() {
    if (grainURL) return grainURL;
    try {
      var c = document.createElement('canvas'); c.width = c.height = 140;
      var x = c.getContext('2d'), img = x.createImageData(140, 140);
      for (var i = 0; i < img.data.length; i += 4) { var v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      x.putImageData(img, 0, 0); grainURL = c.toDataURL();
    } catch (e) { grainURL = ''; }
    return grainURL;
  }

  function joinWords(ws, kind) {
    var t = ws.map(function (x) { return x.w; });
    return kind === 'sentence' ? t.join(' ') + '.' : t.join(', ');
  }

  /* ---------- сам каркас ---------- */
  function create(o) {
    var id = o.id, cfg = null, round = null, name = '', over = true;
    var st = { mistakes: 0, hints: 0, startedAt: 0, total: 0, done: 0, saveOk: false };
    var cleanups = [], token = 0, idleTimer = null, resizeFns = [], lastSize = null, resizeT = 0;
    var zhOn = true;
    try { zhOn = localStorage.getItem('shirley.zh') !== '0'; } catch (e) {}

    document.title = o.title + ' ' + o.zh;
    var root = el('div', 'kgame' + (o.className ? ' ' + o.className : ''));
    root.style.setProperty('--grain', 'url(' + grain() + ')');
    if (o.bg) root.style.background = o.bg;
    root.innerHTML =
      '<div class="khud">' +
        '<a class="icon-btn" href="../" title="All games 所有游戏" aria-label="Home">🏠</a>' +
        '<button class="icon-btn" data-k="menu" type="button" title="Choose a story 选择主题">🍃</button>' +
        '<div class="kchip round" data-k="round"></div>' +
        '<div class="kchip" data-k="prog"><span class="num">0</span>/0</div>' +
        '<span class="spacer"></span>' +
        '<button class="icon-btn on" data-k="zh" type="button" title="中文 on/off">中</button>' +
        '<button class="icon-btn" data-k="mute" type="button" aria-label="Sound">🔊</button>' +
        '<a class="icon-btn" data-k="teacher" href="../admin/" hidden title="Teacher 老师">👩‍🏫</a>' +
      '</div>' +
      '<div class="kstage" data-k="stage"></div>' +
      '<div class="kbubble" data-k="bubble"></div>';
    document.body.appendChild(root);
    var ref = function (k) { return root.querySelector('[data-k="' + k + '"]'); };
    var stage = ref('stage');

    function ov(inner, wide) {
      var d = el('div', 'overlay'); d.hidden = true;
      d.innerHTML = '<div class="card' + (wide ? ' kwide' : '') + '">' + inner + '</div>';
      document.body.appendChild(d); return d;
    }
    var nameOv = ov(
      '<div class="emo">' + o.emoji + '</div><h1>' + esc(o.title) + '</h1><p class="zh">' + esc(o.zh) + '</p><p>' + (o.blurb || '') + '</p>' +
      '<form class="kname-row" autocomplete="off"><input class="name-input" maxlength="30" placeholder="Your name 你的名字" required aria-label="Your name">' +
      '<button class="big-btn green" type="submit">Go! 出发 ▶</button></form><div class="hint"></div>');
    var menuOv = ov('<h1>Choose a story 选一个主题</h1><p data-k="sub"></p><div class="kmenu-grid" data-k="grid"></div>' +
      '<div class="kteacher-note" data-k="note" hidden>👩‍🏫 Practice mode: results are not saved 练习模式不保存成绩 · <a href="../admin/">Edit 编辑题目</a></div>' +
      '<div class="kbtns"><button class="ghost-btn" data-k="close" type="button" hidden>✕ Close 关闭</button>' +
      '<button class="ghost-btn" data-k="album" type="button">🏆 ' + esc(o.albumLabel || 'My rewards 我的奖励') + '</button></div>', true);
    var endOv = ov('<div class="kend-rw" data-k="rw"></div><h1 data-k="title"></h1><p data-k="text"></p>' +
      '<div class="kstats"><div class="kstat"><div class="v" data-k="sw">0</div><div class="l">words 单词</div></div>' +
      '<div class="kstat"><div class="v" data-k="sm">0</div><div class="l">oops 小失误</div></div>' +
      '<div class="kstat"><div class="v" data-k="stime">0:00</div><div class="l">time 时间</div></div></div>' +
      '<div class="hint" data-k="save"></div>' +
      '<div class="kbtns"><button class="big-btn green" data-k="again" type="button">Again 再玩一次</button>' +
      '<button class="big-btn" data-k="other" type="button">Next story 换一个</button></div>');
    var albumOv = ov('<h1>🏆 ' + esc(o.albumLabel || 'My rewards 我的奖励') + '</h1><p data-k="sub"></p><div class="kmenu-grid" data-k="grid"></div>' +
      '<div class="kbtns"><button class="ghost-btn" data-k="close" type="button">✕ Close 关闭</button></div>', true);
    function r2(ovEl, k) { return ovEl.querySelector('[data-k="' + k + '"]'); }

    /* ---------- альбом ---------- */
    function albumKey() { return 'shirley.' + id + '.' + name.toLowerCase(); }
    function getAlbum() { try { return JSON.parse(localStorage.getItem(albumKey()) || '{}') || {}; } catch (e) { return {}; } }
    function addAlbum(rid) { var a = getAlbum(); a[rid] = (a[rid] || 0) + 1; try { localStorage.setItem(albumKey(), JSON.stringify(a)); } catch (e) {} }

    /* ---------- речь, пузырь ---------- */
    function speak(x) { var t = typeof x === 'string' ? x : (x.say || x.w); G.speak(t, { rate: cfg.settings.speechRate }); }
    function showBubble(html, cx, topY, ms) {
      var b = ref('bubble');
      b.innerHTML = html; b.classList.remove('show');
      var Wd = root.clientWidth;
      b.style.left = Math.max(b.offsetWidth / 2 + 8, Math.min(Wd - b.offsetWidth / 2 - 8, cx)) + 'px';
      b.style.top = Math.max(4, topY - b.offsetHeight - 14) + 'px';
      void b.offsetWidth; b.classList.add('show');
      clearTimeout(showBubble.t);
      if (ms) showBubble.t = setTimeout(hideBubble, ms);
    }
    function hideBubble() { ref('bubble').classList.remove('show'); }

    /* ---------- HUD ---------- */
    function setProgress(done, total) {
      st.done = done; st.total = total;
      ref('prog').innerHTML = '<span class="num">' + done + '</span>/' + total;
    }
    function applyZh() { document.body.classList.toggle('nozh', !zhOn); ref('zh').classList.toggle('on', zhOn); }
    function applyMute() { ref('mute').textContent = G.isMuted() ? '🔇' : '🔊'; }
    ref('zh').addEventListener('click', function () { zhOn = !zhOn; applyZh(); try { localStorage.setItem('shirley.zh', zhOn ? '1' : '0'); } catch (e) {} });
    ref('mute').addEventListener('click', function () { G.setMuted(!G.isMuted()); applyMute(); });
    ref('menu').addEventListener('click', function () { if (name) showMenu(); });

    /* ---------- конфиг и меню ---------- */
    function applyConfig(raw) {
      cfg = normalize(raw, o.defaults, o.minWords);
      var stored = null; try { stored = localStorage.getItem('shirley.zh'); } catch (e) {}
      if (stored === null) { zhOn = cfg.settings.showChinese; }
      applyZh();
    }
    function card(r, album, inAlbum) {
      var b = el('button', 'kround'); b.type = 'button';
      var got = album[r.id] || 0;
      b.appendChild(el('div', 'em', r.emoji)); b.appendChild(el('div', 'ti', r.title)); b.appendChild(el('div', 'zz', r.zh));
      var rw = el('div', 'rw' + (got ? '' : ' locked')); rw.innerHTML = o.reward(r, true); b.appendChild(rw);
      b.appendChild(el('div', 'cnt', got ? '×' + got : (inAlbum ? '?' : r.words.length + ' words')));
      return b;
    }
    function showMenu() {
      endOv.hidden = true;
      G.loadConfig(id).then(function (raw) { applyConfig(raw); drawMenu(); });
    }
    function drawMenu() {
      var album = getAlbum(), g = r2(menuOv, 'grid'); g.innerHTML = '';
      r2(menuOv, 'sub').textContent = 'Hi, ' + name + '! 你好！Pick a story. 选一个故事。';
      cfg.rounds.forEach(function (r) {
        var c = card(r, album, false);
        c.addEventListener('click', function () { G.ac(); startRound(r); });
        g.appendChild(c);
      });
      r2(menuOv, 'close').hidden = !round;
      r2(menuOv, 'note').hidden = G.player.role !== 'teacher';
      menuOv.hidden = false;
    }
    r2(menuOv, 'close').addEventListener('click', function () { menuOv.hidden = true; });
    r2(menuOv, 'album').addEventListener('click', function () {
      var album = getAlbum(), g = r2(albumOv, 'grid'), got = 0; g.innerHTML = '';
      cfg.rounds.forEach(function (r) { if (album[r.id]) got++; var c = card(r, album, true); c.disabled = true; c.style.cursor = 'default'; g.appendChild(c); });
      r2(albumOv, 'sub').textContent = got + ' / ' + cfg.rounds.length + ' — ' + (got === cfg.rounds.length ? 'Wow, all of them! 太棒了，全部集齐！' : 'Collect them all! 集齐所有奖励！');
      albumOv.hidden = false;
    });
    r2(albumOv, 'close').addEventListener('click', function () { albumOv.hidden = true; });
    r2(endOv, 'again').addEventListener('click', function () { startRound(round); });
    r2(endOv, 'other').addEventListener('click', showMenu);

    // Поворот экрана / изменение окна: игра перестраивает раскладку, прогресс не теряется
    global.addEventListener('resize', function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () {
        if (!round || over || !resizeFns.length) return;
        var w = stage.clientWidth, h = stage.clientHeight;
        if (lastSize && Math.abs(w - lastSize.w) < 24 && Math.abs(h - lastSize.h) < 24) return;
        lastSize = { w: w, h: h };
        resizeFns.forEach(function (f) { try { f(w, h); } catch (e) { if (global.console) console.error(e); } });
      }, 200);
    });

    /* ---------- раунд ---------- */
    function runCleanups() { resizeFns = []; var c = cleanups; cleanups = []; c.forEach(function (f) { try { f(); } catch (e) {} }); clearTimeout(idleTimer); }

    function startRound(r) {
      runCleanups(); token++;
      var my = token;
      menuOv.hidden = true; endOv.hidden = true; albumOv.hidden = true;
      round = r; over = false;
      st = { mistakes: 0, hints: 0, startedAt: Date.now(), total: r.words.length, done: 0, saveOk: false };
      G.player.sessionId = null;
      G.startSession(name, id, r.title).then(function (d) { st.saveOk = true; ref('teacher').hidden = d.role !== 'teacher'; }).catch(function () { st.saveOk = false; });
      ref('round').textContent = r.emoji + ' ' + r.title;
      setProgress(0, r.words.length);
      stage.innerHTML = ''; hideBubble(); fx.clear(); fx.stopAmbient();
      lastSize = { w: stage.clientWidth, h: stage.clientHeight };
      stage.classList.remove('kenter'); void stage.offsetWidth; stage.classList.add('kenter');
      applyZh();
      var api = {
        stage: stage, root: root, round: r, items: r.words, decoys: r.decoys, settings: cfg.settings, fx: fx,
        progress: setProgress, speak: speak, bubble: showBubble, hideBubble: hideBubble,
        zh: function () { return zhOn; },
        mistake: function (w, chosen, correct) { st.mistakes++; G.reportMistake(w, chosen, correct); G.vibrate(35); },
        onResize: function (f) { resizeFns.push(f); },
        cells: cells,
        hinted: function () { st.hints++; },
        cleanup: function (f) { cleanups.push(f); },
        alive: function () { return my === token && !over; },
        idle: function (fn) {
          function reset() {
            clearTimeout(idleTimer);
            if (!cfg.settings.idleHintSec) return;
            idleTimer = setTimeout(function () { if (my === token && !over) fn(); }, cfg.settings.idleHintSec * 1000);
          }
          reset(); return reset;
        },
        complete: function (wordsDone) { if (my === token) finish(wordsDone == null ? r.words.length : wordsDone); }
      };
      o.play(r, api);
    }

    function finish(wordsDone) {
      if (over) return;
      over = true; clearTimeout(idleTimer);
      var secs = (Date.now() - st.startedAt) / 1000;
      var saving = G.finishSession('done', wordsDone, secs);
      addAlbum(round.id);
      r2(endOv, 'rw').innerHTML = o.reward(round, false);
      r2(endOv, 'title').textContent = o.rewardTitle || 'Great job! 太棒了！';
      r2(endOv, 'text').innerHTML = '<b>' + round.emoji + ' ' + esc(round.title) + '</b> — ' + esc(joinWords(round.words, round.kind));
      r2(endOv, 'sw').textContent = wordsDone; r2(endOv, 'sm').textContent = st.mistakes; r2(endOv, 'stime').textContent = fmtTime(secs);
      var hint = r2(endOv, 'save'); hint.className = 'hint';
      if (G.player.role === 'teacher') hint.textContent = 'Teacher practice — not saved 老师练习，不保存成绩';
      else if (!st.saveOk) { hint.className = 'hint'; hint.textContent = G.fileMode ? '📁 Offline mode — results are not saved 离线模式，成绩不保存' : 'Offline: result not saved 离线，成绩未保存'; }
      else {
        hint.textContent = 'Saving… 保存中…';
        saving.then(function () { hint.textContent = 'Saved for ' + G.player.name + ' ✓ 已保存'; })
          .catch(function () { hint.className = 'hint err'; hint.textContent = 'Could not save 保存失败'; });
      }
      endOv.hidden = false;
      fx.rainConfetti(2.2); G.vibrate([30, 60, 30]);
    }

    /* ---------- имя ---------- */
    nameOv.querySelector('input').value = G.savedName();
    nameOv.hidden = false;
    nameOv.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var n = nameOv.querySelector('input').value.replace(/\s+/g, ' ').trim();
      if (!n) { var h = nameOv.querySelector('.hint'); h.className = 'hint err'; h.textContent = 'Please type your name 请输入名字'; return; }
      name = n; G.player.name = n; G.ac();
      nameOv.hidden = true; showMenu();
    });

    cfg = normalize(null, o.defaults, o.minWords);
    applyZh(); applyMute();
    G.loadConfig(id).then(applyConfig);

    return { api: function () { return null; }, root: root, joinWords: joinWords };
  }

  G.kit = { create: create, normalize: normalize, joinWords: joinWords, esc: esc, fmtTime: fmtTime, cells: cells };
})(window);
