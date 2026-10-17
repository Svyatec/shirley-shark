/* Hungry Caterpillar — игра без проигрыша: съешь слова по порядку, гусеница вырастет и станет бабочкой. */
(function () {
  'use strict';

  var G = window.Games;
  var $ = function (id) { return document.getElementById(id); };
  var el = G.el;

  var SEG_PAL = ['#7ED957', '#FFD23F', '#FF8FAB', '#6EC5FF', '#FFA94D', '#B58BFF', '#4FD6B0', '#FF7A6B'];
  var ORB_PAL = ['#FFE27A', '#FFB3C7', '#A8E0FF', '#FFC999', '#D3B8FF', '#B5F0CF', '#FFD1A1'];
  var HUES = [95, 330, 200, 35, 270, 160, 10, 230, 55, 300, 180, 120];
  var MAX_WORDS = 12, MAX_DECOYS = 6;
  var TXT = {
    oops: ['Oops! Try again 再试一次', 'Hmm… not this one 不是这个哦', 'Almost! 差一点点', 'Look again 再看看'],
    start: ["Let's go! 出发！"]
  };

  var settings, rounds, round, words, decoys;
  var filled, wrongRow, mistakes, hints, startedAt, locked, over, idleTimer, saveOk, ftoken = 0;
  var S = 60;
  var playerName = '';

  /* ---------- конфиг ---------- */
  function cleanWord(x) {
    if (!x) return null;
    var w = String(x.w == null ? '' : x.w).trim();
    if (!w) return null;
    return {
      w: w.slice(0, 40), zh: String(x.zh || '').trim().slice(0, 40),
      e: String(x.e || '').trim().slice(0, 8), say: String(x.say || '').trim().slice(0, 60)
    };
  }
  function normalize(raw) {
    var d = window.CATERPILLAR_DEFAULTS;
    var src = raw && Array.isArray(raw.rounds) && raw.rounds.length ? raw : d;
    var s = {};
    Object.keys(d.settings).forEach(function (k) {
      s[k] = src.settings && src.settings[k] != null ? src.settings[k] : d.settings[k];
    });
    s.speechRate = Math.min(1.3, Math.max(0.4, Number(s.speechRate) || 0.85));
    s.hintAfter = Math.min(5, Math.max(1, parseInt(s.hintAfter, 10) || 2));
    s.idleHintSec = Math.max(0, Math.min(120, Number(s.idleHintSec) || 0));
    s.showChinese = s.showChinese !== false;
    var list = [];
    src.rounds.forEach(function (r, i) {
      var ws = (r.words || []).map(cleanWord).filter(Boolean).slice(0, MAX_WORDS);
      if (r.enabled === false || ws.length < 2) return;
      var lower = ws.map(function (x) { return x.w.toLowerCase(); });
      var ds = (r.decoys || []).map(cleanWord).filter(function (x) { return x && lower.indexOf(x.w.toLowerCase()) < 0; }).slice(0, MAX_DECOYS);
      list.push({
        idx: i, id: String(r.id || ('r' + i)), title: String(r.title || 'Story').slice(0, 40), zh: String(r.zh || '').slice(0, 60),
        emoji: String(r.emoji || '🐛').slice(0, 8), kind: r.kind === 'sentence' ? 'sentence' : 'list', words: ws, decoys: ds
      });
    });
    if (!list.length && raw) return normalize(null);
    return { settings: s, rounds: list };
  }

  /* ---------- альбом бабочек (на устройстве ученика) ---------- */
  function albumKey() { return 'shirley.cat.' + playerName.toLowerCase(); }
  function getAlbum() { try { return JSON.parse(localStorage.getItem(albumKey()) || '{}') || {}; } catch (e) { return {}; } }
  function addToAlbum(id) {
    var a = getAlbum(); a[id] = (a[id] || 0) + 1;
    try { localStorage.setItem(albumKey(), JSON.stringify(a)); } catch (e) {}
  }

  /* ---------- SVG ---------- */
  function butterflySVG(hue, spots) {
    var main = 'hsl(' + hue + ',88%,62%)', edge = 'hsl(' + hue + ',55%,32%)', light = 'hsl(' + ((hue + 28) % 360) + ',95%,82%)';
    function wing() {
      return '<g class="wing">' +
        '<path d="M100 82 C 70 8, 8 14, 10 58 C 12 86, 62 96, 100 86 Z" fill="' + main + '" stroke="' + edge + '" stroke-width="4" stroke-linejoin="round"/>' +
        '<path d="M100 88 C 66 98, 26 106, 38 140 C 50 168, 92 146, 100 104 Z" fill="' + light + '" stroke="' + edge + '" stroke-width="4" stroke-linejoin="round"/>' +
        '<circle cx="44" cy="44" r="11" fill="' + spots[0] + '"/><circle cx="70" cy="68" r="7" fill="' + spots[1] + '"/>' +
        '<circle cx="62" cy="122" r="9" fill="' + spots[2] + '"/></g>';
    }
    return '<svg viewBox="0 0 200 180" aria-hidden="true">' + wing() +
      '<g transform="translate(200 0) scale(-1 1)">' + wing() + '</g>' +
      '<path d="M96 52 Q 86 28 72 22 M104 52 Q 114 28 128 22" stroke="#3B2A4D" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
      '<circle cx="72" cy="22" r="4.5" fill="#3B2A4D"/><circle cx="128" cy="22" r="4.5" fill="#3B2A4D"/>' +
      '<ellipse cx="100" cy="100" rx="7" ry="40" fill="#3B2A4D"/><circle cx="100" cy="56" r="11" fill="#3B2A4D"/>' +
      '<circle cx="96" cy="54" r="2.6" fill="#fff"/><circle cx="104" cy="54" r="2.6" fill="#fff"/></svg>';
  }
  function spotsFor(idx) { return [SEG_PAL[idx % 8], SEG_PAL[(idx + 2) % 8], SEG_PAL[(idx + 5) % 8]]; }
  function hueFor(r) { return HUES[r.idx % HUES.length]; }
  function bfFor(r, still) { return butterflySVG(hueFor(r), spotsFor(r.idx)).replace('<svg ', '<svg class="' + (still ? 'still' : '') + '" '); }

  var HEAD_SVG =
    '<svg viewBox="0 0 100 100" aria-hidden="true">' +
    '<path d="M36 18 Q 28 2 18 6" stroke="#3F8A2A" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="18" cy="6" r="5.5" fill="#FF6F59"/>' +
    '<path d="M64 18 Q 72 2 82 6" stroke="#3F8A2A" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="82" cy="6" r="5.5" fill="#FF6F59"/>' +
    '<circle cx="50" cy="56" r="42" fill="#5BC16C" stroke="#2F7A26" stroke-width="4"/>' +
    '<ellipse cx="36" cy="36" rx="12" ry="7" fill="#fff" opacity=".35"/>' +
    '<circle cx="36" cy="48" r="11" fill="#fff"/><circle cx="64" cy="48" r="11" fill="#fff"/>' +
    '<circle cx="38" cy="50" r="5.5" fill="#2B2A4C"/><circle cx="62" cy="50" r="5.5" fill="#2B2A4C"/>' +
    '<circle cx="40" cy="48" r="1.8" fill="#fff"/><circle cx="64" cy="48" r="1.8" fill="#fff"/>' +
    '<ellipse cx="25" cy="68" rx="7" ry="4.5" fill="#FF9AA8" opacity=".75"/><ellipse cx="75" cy="68" rx="7" ry="4.5" fill="#FF9AA8" opacity=".75"/>' +
    '<path class="mouth-closed" d="M38 70 Q 50 82 62 70" stroke="#2B2A4C" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    '<g class="mouth-open"><ellipse cx="50" cy="74" rx="14" ry="11" fill="#7A1F2B"/><ellipse cx="50" cy="80" rx="8" ry="5" fill="#FF7A8A"/></g></svg>';

  var COCOON_SVG =
    '<svg viewBox="0 0 92 150" aria-hidden="true">' +
    '<defs><linearGradient id="cg" x1="0" x2="1"><stop offset="0" stop-color="#C9B8F2"/><stop offset=".5" stop-color="#EFE8FF"/><stop offset="1" stop-color="#B7A2E8"/></linearGradient></defs>' +
    '<path d="M46 4 C 8 30, 2 100, 46 146 C 90 100, 84 30, 46 4 Z" fill="url(#cg)" stroke="#7B63C2" stroke-width="3"/>' +
    '<path d="M14 40 Q 46 52 78 40 M8 62 Q 46 76 84 62 M8 86 Q 46 100 84 86 M16 110 Q 46 122 76 110" stroke="#7B63C2" stroke-width="2.4" fill="none" opacity=".6"/>' +
    '</svg>';

  /* ---------- вспомогательное ---------- */
  function say(item) { G.speak(item.say || item.w, { rate: settings.speechRate }); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function fmtTime(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
  function joinWords(ws, kind) {
    var t = ws.map(function (x) { return x.w; });
    return kind === 'sentence' ? t.join(' ') + '.' : t.join(', ');
  }
  function colorOf(i) { return SEG_PAL[i % SEG_PAL.length]; }

  /* ---------- поле со словами ---------- */
  function setOrbSize(n) {
    var f = $('field');
    // подбираем колонки так, чтобы все кружки поместились в поле целиком, без перекрытий и прокрутки
    var fw = f.clientWidth - 24, fh = Math.max(80, f.clientHeight - 20), gx = 14, gy = 10, best = 0;
    for (var cols = 1; cols <= Math.max(1, n); cols++) {
      var rows = Math.ceil(n / cols);
      best = Math.max(best, Math.min((fw - gx * (cols - 1)) / cols, (fh - gy * (rows - 1)) / rows));
    }
    f.style.setProperty('--orb', Math.max(52, Math.min(128, Math.floor(best * 0.94))) + 'px');
  }
  function buildField() {
    var f = $('field');
    f.innerHTML = ''; f.style.opacity = 1; f.scrollTop = 0;
    var items = G.shuffle(words.slice(1).concat(decoys));
    setOrbSize(items.length);
    items.forEach(function (item, i) {
      var b = el('button', 'orb'); b.type = 'button';
      b.style.setProperty('--c', ORB_PAL[(i * 3 + 1) % ORB_PAL.length]);
      b.style.setProperty('--dur', (3 + Math.random() * 1.8).toFixed(2) + 's');
      b.style.setProperty('--del', (-Math.random() * 3).toFixed(2) + 's');
      b.style.setProperty('--lift', (4 + Math.random() * 6).toFixed(1) + 'px');
      b.style.setProperty('--rot', ((Math.random() - 0.5) * 5).toFixed(1) + 'deg');
      b.dataset.w = item.w;
      if (item.e) b.appendChild(el('span', 'e', item.e));
      b.appendChild(el('span', 't' + (item.w.length > 8 ? ' long' : ''), item.w));
      if (item.zh) b.appendChild(el('span', 'z', item.zh));
      b.setAttribute('aria-label', item.w);
      b.addEventListener('click', function () { onOrb(b, item); });
      f.appendChild(b);
    });
  }

  /* ---------- гусеница ---------- */
  function layoutTrack() {
    var w = $('track').clientWidth - 6;
    S = Math.max(26, Math.min(88, Math.floor(w / (0.86 * words.length + 1.25)), Math.floor(window.innerHeight * 0.14)));
    $('track').style.setProperty('--S', S + 'px');
  }
  function renderTrack(bornIdx) {
    var t = $('track'); t.innerHTML = '';
    var N = words.length;
    t.style.setProperty('--g', (0.82 + 0.34 * filled / N).toFixed(3));
    t.style.setProperty('--hg', (0.95 + 0.3 * filled / N).toFixed(3));
    for (var i = 0; i < filled; i++) {
      var s = el('div', 'seg'); s.style.setProperty('--i', i);
      var ball = el('div', 'ball' + (i === bornIdx ? ' born' : ''));
      ball.style.setProperty('--c', colorOf(i));
      var txt = words[i].w;
      var fs = Math.min(17, S * 0.27);
      fs = Math.min(fs, (S * 0.7) / (txt.length * 0.6));
      ball.style.fontSize = Math.max(7, fs) + 'px';
      ball.textContent = txt;
      s.appendChild(ball); t.appendChild(s);
    }
    var head = el('div', 'head'); head.id = 'head'; head.innerHTML = HEAD_SVG;
    t.appendChild(head);
    for (var j = filled + 1; j < N; j++) {
      var g = el('div', 'ghost', String(j + 1)); t.appendChild(g);
    }
  }
  function chompHead(cls) {
    var h = $('head'); if (!h) return;
    h.classList.remove('chomp', 'no'); void h.offsetWidth; h.classList.add(cls);
    setTimeout(function () { h.classList.remove(cls); }, 600);
  }

  function renderStrip(popLast) {
    var s = $('strip'); s.innerHTML = '';
    for (var i = 0; i < words.length; i++) {
      if (i < filled) {
        var w = el('span', 'w' + (popLast && i === filled - 1 ? ' new' : ''), words[i].w);
        if (words[i].zh) w.appendChild(el('small', '', words[i].zh));
        s.appendChild(w);
      } else {
        s.appendChild(el('span', 'blank', '＿＿'));
      }
    }
    s.appendChild(el('span', 'ear', '🔈'));
  }
  function hud() {
    $('progChip').innerHTML = '<span class="num">' + filled + '</span>/' + words.length;
    $('roundChip').textContent = round.emoji + ' ' + round.title;
  }

  /* ---------- пузырь с репликой ---------- */
  function showBubble(html, cx, topY) {
    var b = $('bubble'), g = $('game');
    b.innerHTML = html;
    b.classList.remove('show');
    var W = g.clientWidth;
    b.style.left = Math.max(b.offsetWidth / 2 + 8, Math.min(W - b.offsetWidth / 2 - 8, cx)) + 'px';
    b.style.top = Math.max(4, topY - b.offsetHeight - 14) + 'px';
    void b.offsetWidth;
    b.classList.add('show');
  }
  function hideBubble() { $('bubble').classList.remove('show'); }
  function bubbleOverHead(html, ms) {
    var h = $('head'), g = $('game').getBoundingClientRect();
    if (!h) return;
    var r = h.getBoundingClientRect();
    showBubble(html, r.left + r.width / 2 - g.left, r.top - g.top);
    clearTimeout(bubbleOverHead.t);
    if (ms) bubbleOverHead.t = setTimeout(hideBubble, ms);
  }

  /* ---------- ход игры ---------- */
  function startIdle() {
    clearTimeout(idleTimer);
    if (!settings.idleHintSec) return;
    idleTimer = setTimeout(function () { if (!over && !locked) showHint(); }, settings.idleHintSec * 1000);
  }
  function showHint() {
    var target = words[filled]; if (!target) return;
    var orbs = $('field').querySelectorAll('.orb:not(.eaten)');
    for (var i = 0; i < orbs.length; i++) {
      if (orbs[i].dataset.w.toLowerCase() === target.w.toLowerCase()) {
        if (!orbs[i].classList.contains('hint')) { hints++; orbs[i].classList.add('hint'); }
        try { orbs[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
        return;
      }
    }
  }
  function clearHints() {
    var hs = $('field').querySelectorAll('.orb.hint');
    for (var i = 0; i < hs.length; i++) hs[i].classList.remove('hint');
  }

  function onOrb(btn, item) {
    if (locked || over) return;
    G.ac();
    var target = words[filled];
    if (item.w.toLowerCase() === target.w.toLowerCase()) eat(btn, item); else oops(btn, item, target);
  }

  function oops(btn, item, target) {
    wrongRow++; mistakes++;
    G.reportMistake(target.w, item.w, target.w);
    G.sfx.soft();
    btn.classList.remove('nope'); void btn.offsetWidth; btn.classList.add('nope');
    setTimeout(function () { btn.classList.remove('nope'); }, 520);
    chompHead('no');
    say(item);
    bubbleOverHead(TXT.oops[mistakes % TXT.oops.length], 1700);
    if (wrongRow >= settings.hintAfter) showHint();
    startIdle();
  }

  function eat(btn, item) {
    locked = true; wrongRow = 0;
    clearTimeout(idleTimer); clearHints(); hideBubble();
    say(item); G.sfx.munch();

    var head = $('head');
    var from = btn.getBoundingClientRect(), to = head.getBoundingClientRect();
    var clone = btn.cloneNode(true);
    clone.style.setProperty('--orb', getComputedStyle($('field')).getPropertyValue('--orb'));
    clone.style.cssText += ';position:fixed;z-index:60;margin:0;pointer-events:none;animation:none;left:' + from.left + 'px;top:' + from.top + 'px;width:' + from.width + 'px;height:' + from.height + 'px';
    document.body.appendChild(clone);
    btn.classList.add('eaten');
    var dx = (to.left + to.width / 2) - (from.left + from.width / 2);
    var dy = (to.top + to.height / 2) - (from.top + from.height / 2);
    var anim = clone.animate(
      [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.25)', opacity: .9 }],
      { duration: 480, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' });
    var done = false;
    function landed() {
      if (done) return; done = true;
      clone.remove();
      setTimeout(function () { btn.remove(); }, 450);
      filled++;
      renderTrack(filled - 1);
      chompHead('chomp');
      G.sfx.good();
      renderStrip(true); hud();
      if (filled >= words.length) { setTimeout(complete, 700); }
      else { locked = false; startIdle(); }
    }
    anim.onfinish = landed;
    setTimeout(landed, 700);   // страховка, если анимация не сработала
  }

  /* ---------- завершение раунда ---------- */
  function complete() {
    over = true;
    clearTimeout(idleTimer);
    var secs = (Date.now() - startedAt) / 1000;
    var saving = G.finishSession('done', words.length, secs);
    addToAlbum(round.id);
    runFinale(saving, secs);
  }

  function spark(stage, x, y, color, big) {
    var s = el('span', 'spark', ['✦', '✧', '★', '♥'][Math.floor(Math.random() * 4)]);
    s.style.left = x + 'px'; s.style.top = y + 'px'; s.style.color = color; if (big) s.style.fontSize = '30px';
    stage.appendChild(s);
    var a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 90;
    var an = s.animate([
      { transform: 'translate(0,0) scale(.3) rotate(0)', opacity: 1 },
      { transform: 'translate(' + Math.cos(a) * d + 'px,' + (Math.sin(a) * d - 20) + 'px) scale(1.2) rotate(120deg)', opacity: 0 }
    ], { duration: 900 + Math.random() * 500, easing: 'ease-out' });
    an.onfinish = function () { s.remove(); };
  }
  function burst(stage, x, y, n) {
    for (var i = 0; i < n; i++) spark(stage, x, y, SEG_PAL[i % SEG_PAL.length], i % 5 === 0);
  }

  function runFinale(saving, secs) {
    var token = ++ftoken;
    var stage = $('stage'); stage.hidden = false; stage.innerHTML = '';
    var W = stage.clientWidth, H = stage.clientHeight;
    var ty = Math.round(Math.max(90, H * 0.2));
    stage.style.setProperty('--ty', ty + 'px');
    var cx = W / 2, cy = ty + 75;

    var wrap = el('div', 'cocoon-wrap');
    wrap.appendChild(el('div', 'thread'));
    var cocoon = el('div', 'cocoon'); cocoon.innerHTML = COCOON_SVG; wrap.appendChild(cocoon);
    stage.appendChild(wrap);
    var flash = el('div', 'flash'); stage.appendChild(flash);
    var bw = Math.min(W * 0.46, 230), bh = bw * 0.9;
    var bf = el('div', 'butterfly'); bf.innerHTML = bfFor(round, false);
    bf.style.width = bw + 'px'; bf.style.left = (cx - bw / 2) + 'px'; bf.style.top = (cy - bh / 2) + 'px';
    stage.appendChild(bf);
    var skip = el('button', 'ghost-btn skip', 'Skip 跳过 ⏭'); skip.type = 'button';
    stage.appendChild(skip);
    var trail = null;

    function alive() { return token === ftoken; }
    function finish() {
      if (!alive()) return;
      ftoken++; clearInterval(trail); hideBubble();
      stage.hidden = true; stage.innerHTML = '';
      $('field').style.opacity = 1;
      showEnd(saving, secs);
    }
    skip.addEventListener('click', finish);

    (async function () {
      var sentence = joinWords(words, round.kind);
      $('field').style.opacity = 0;
      G.sfx.win();
      G.speak(sentence.replace(/[.]$/, ''), { rate: settings.speechRate });
      bubbleOverHead("I'm so big now! 我长大啦！", 0);
      await sleep(2300); if (!alive()) return;

      // гусеница свивается в кокон
      hideBubble();
      cocoon.classList.add('in');
      var segs = $('track').querySelectorAll('.seg, .head, .ghost');
      var tr = cocoon.getBoundingClientRect(), gr = stage.getBoundingClientRect();
      var tx = tr.left + tr.width / 2, tyc = gr.top + cy;
      Array.prototype.forEach.call(segs, function (sg, i) {
        var r = sg.getBoundingClientRect();
        var dx = tx - (r.left + r.width / 2), dy = tyc - (r.top + r.height / 2);
        sg.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.15)', opacity: 0 }],
          { duration: 900, delay: i * 70, easing: 'cubic-bezier(.5,0,.7,.5)', fill: 'forwards' });
      });
      for (var k = 0; k < 4; k++) { setTimeout(G.sfx.pop, 150 * k + 200); }
      await sleep(1500 + segs.length * 70); if (!alive()) return;

      showBubble('Zzz… 好困呀… 💤', cx, cy - 70);
      G.tone(262, 0, .5, 'sine', .06); G.tone(330, .5, .5, 'sine', .05);
      await sleep(3200); if (!alive()) return;

      // кокон трескается
      hideBubble();
      cocoon.classList.add('crack');
      G.sfx.sparkle();
      await sleep(1000); if (!alive()) return;
      flash.animate([{ opacity: 0 }, { opacity: .9 }, { opacity: 0 }], { duration: 700 });
      cocoon.classList.add('out'); wrap.classList.add('cut');
      bf.style.opacity = 1;
      bf.animate([{ transform: 'scale(.2) rotate(-25deg)' }, { transform: 'scale(1.1) rotate(6deg)' }, { transform: 'scale(1) rotate(0)' }],
        { duration: 900, easing: 'cubic-bezier(.3,1.5,.5,1)' });
      burst(stage, cx, cy, 22);
      G.sfx.win();
      await sleep(1300); if (!alive()) return;

      showBubble('Thank you! 谢谢你！💖', cx, cy - bh / 2 - 6);
      G.speak('Thank you!', { rate: 0.9, pitch: 1.2 });
      for (var h = 0; h < 8; h++) setTimeout(function () { spark(stage, cx + (Math.random() - .5) * bw, cy + (Math.random() - .5) * bh * .6, '#FF6F8E', true); }, h * 220);
      await sleep(2900); if (!alive()) return;

      // улетает
      showBubble('Bye-bye! 再见啦～', cx, cy - bh / 2 - 6);
      G.speak('Bye bye!', { rate: 0.9, pitch: 1.2 });
      var fly = bf.animate([
        { transform: 'translate(0,0) scale(1) rotate(0)', offset: 0 },
        { transform: 'translate(' + W * 0.18 + 'px,' + -H * 0.05 + 'px) scale(.95) rotate(12deg)', offset: .2 },
        { transform: 'translate(' + -W * 0.14 + 'px,' + -H * 0.18 + 'px) scale(.8) rotate(-14deg)', offset: .45 },
        { transform: 'translate(' + W * 0.2 + 'px,' + -H * 0.36 + 'px) scale(.6) rotate(10deg)', offset: .7 },
        { transform: 'translate(' + W * 0.08 + 'px,' + -H * 0.8 + 'px) scale(.22) rotate(-6deg)', offset: 1 }
      ], { duration: 5000, easing: 'ease-in-out', fill: 'forwards' });
      trail = setInterval(function () {
        var r = bf.getBoundingClientRect(), sr = stage.getBoundingClientRect();
        spark(stage, r.left - sr.left + r.width / 2, r.top - sr.top + r.height / 2, SEG_PAL[Math.floor(Math.random() * 8)], false);
      }, 130);
      await sleep(1800); hideBubble();
      await sleep(3300); if (!alive()) return;
      finish();
    })();
  }

  function showEnd(saving, secs) {
    $('endBf').innerHTML = '<div class="end-bf">' + bfFor(round, false) + '</div>';
    $('endText').innerHTML = '<b>' + round.emoji + ' ' + esc(round.title) + '</b> — ' + esc(joinWords(words, round.kind));
    $('stWords').textContent = words.length;
    $('stMiss').textContent = mistakes;
    $('stTime').textContent = fmtTime(secs);
    var hint = $('saveHint'); hint.className = 'hint';
    if (G.player.role === 'teacher') hint.textContent = 'Teacher practice — not saved 老师练习，不保存成绩';
    else if (!saveOk) { hint.className = 'hint err'; hint.textContent = 'Offline: result not saved 离线，成绩未保存'; }
    else {
      hint.textContent = 'Saving… 保存中…';
      saving.then(function () { hint.textContent = 'Saved for ' + G.player.name + ' ✓ 已保存'; })
        .catch(function () { hint.className = 'hint err'; hint.textContent = 'Could not save 保存失败'; });
    }
    $('endOv').hidden = false;
  }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  /* ---------- запуск раунда ---------- */
  function startRound(r) {
    ftoken++;
    $('stage').hidden = true; $('stage').innerHTML = '';
    $('menuOv').hidden = true; $('endOv').hidden = true; $('albumOv').hidden = true;
    round = r; words = r.words; decoys = r.decoys;
    G.player.sessionId = null;
    filled = 1; wrongRow = 0; mistakes = 0; hints = 0; over = false; locked = true;
    startedAt = Date.now();
    hideBubble();

    G.startSession(playerName, 'caterpillar', r.title).then(function (d) {
      saveOk = true;
      $('teacherBtn').hidden = d.role !== 'teacher';
    }).catch(function () { saveOk = false; });

    document.body.classList.toggle('nozh', !zhOn);
    $('clue').innerHTML = esc(r.emoji + ' ' + (r.zh || r.title)) + '<small>Feed the caterpillar in the right order 按顺序喂毛毛虫</small>';
    layoutTrack(); buildField(); renderTrack(); renderStrip(); hud();
    // вводное слово
    G.speak(words[0].say || words[0].w, { rate: settings.speechRate });
    setTimeout(function () {
      if (over) return;
      bubbleOverHead('<b>' + esc(words[0].w) + '</b>' + (words[0].zh ? '<small>' + esc(words[0].zh) + '</small>' : '') + '<small>Next? 下一个？</small>', 2600);
      locked = false; startIdle();
    }, 400);
  }

  /* ---------- меню и альбом ---------- */
  function cardFor(r, album, inAlbum) {
    var b = el('button', 'round-card'); b.type = 'button';
    var got = album[r.id] || 0;
    b.appendChild(el('div', 'em', r.emoji));
    b.appendChild(el('div', 'ti', r.title));
    b.appendChild(el('div', 'zz', r.zh));
    var bf = el('div'); bf.innerHTML = bfFor(r, true);
    var svg = bf.firstChild; svg.setAttribute('class', 'bf still' + (got ? '' : ' locked'));
    b.appendChild(svg);
    b.appendChild(el('div', 'cnt', got ? '×' + got : (inAlbum ? '?' : r.words.length + ' words')));
    return b;
  }
  function applyConfig(raw) {
    var c = normalize(raw);
    settings = c.settings; rounds = c.rounds;
    var stored = null;
    try { stored = localStorage.getItem('shirley.zh'); } catch (e) {}
    if (stored === null) { zhOn = settings.showChinese; applyZh(); }
  }
  // каждый раз берём свежие настройки учителя
  function showMenu() {
    $('endOv').hidden = true;
    G.loadConfig('caterpillar').then(function (raw) { applyConfig(raw); drawMenu(); });
  }
  function drawMenu() {
    var album = getAlbum(), g = $('menuGrid'); g.innerHTML = '';
    $('menuSub').textContent = 'Hi, ' + playerName + '! 你好！Pick a story and feed the caterpillar. 选一个故事来喂毛毛虫。';
    rounds.forEach(function (r) {
      var c = cardFor(r, album, false);
      c.addEventListener('click', function () { G.ac(); startRound(r); });
      g.appendChild(c);
    });
    $('menuClose').hidden = !round;
    $('teacherNote').hidden = G.player.role !== 'teacher';
    $('menuOv').hidden = false;
  }
  function showAlbum() {
    var album = getAlbum(), g = $('albumGrid'); g.innerHTML = '';
    var got = 0;
    rounds.forEach(function (r) {
      if (album[r.id]) got++;
      var c = cardFor(r, album, true); c.disabled = true; c.style.cursor = 'default'; g.appendChild(c);
    });
    $('albumSub').textContent = got + ' / ' + rounds.length + ' — ' + (got === rounds.length ? 'Wow, all of them! 太棒了，全部集齐！' : 'Collect them all! 集齐所有蝴蝶！');
    $('albumOv').hidden = false;
  }

  /* ---------- кнопки и события ---------- */
  var zhOn = true;
  try { zhOn = localStorage.getItem('shirley.zh') !== '0'; } catch (e) {}
  function applyZh() {
    document.body.classList.toggle('nozh', !zhOn);
    $('zhBtn').classList.toggle('on', zhOn);
  }
  $('zhBtn').addEventListener('click', function () {
    zhOn = !zhOn; applyZh();
    try { localStorage.setItem('shirley.zh', zhOn ? '1' : '0'); } catch (e) {}
  });
  function applyMute() { $('muteBtn').textContent = G.isMuted() ? '🔇' : '🔊'; }
  $('muteBtn').addEventListener('click', function () { G.setMuted(!G.isMuted()); applyMute(); });
  $('strip').addEventListener('click', function () {
    G.ac();
    G.speak(joinWords(words.slice(0, filled), round.kind).replace(/[.]$/, ''), { rate: settings.speechRate });
  });
  $('menuBtn').addEventListener('click', function () { if (playerName) showMenu(); });
  $('menuClose').addEventListener('click', function () { $('menuOv').hidden = true; });
  $('menuAlbum').addEventListener('click', showAlbum);
  $('albumClose').addEventListener('click', function () { $('albumOv').hidden = true; });
  $('againBtn').addEventListener('click', function () { startRound(round); });
  $('otherBtn').addEventListener('click', showMenu);
  window.addEventListener('resize', function () {
    if (!round || over) return;
    layoutTrack(); renderTrack(); setOrbSize($('field').querySelectorAll('.orb').length || 6);
  });

  $('nameForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var n = $('nameInput').value.replace(/\s+/g, ' ').trim();
    if (!n) { $('nameHint').className = 'hint err'; $('nameHint').textContent = 'Please type your name 请输入名字'; return; }
    playerName = n;
    G.player.name = n;
    G.ac();
    $('nameOv').hidden = true;
    showMenu();
  });

  /* ---------- старт ---------- */
  applyZh(); applyMute();
  $('nameInput').value = G.savedName();
  G.loadConfig('caterpillar').then(applyConfig);
  settings = normalize(null).settings; rounds = normalize(null).rounds;
})();
