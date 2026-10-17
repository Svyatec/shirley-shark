/* Dragon Eggs — мемори: найди пару «слово ↔ картинка», и из яиц вылупится дракончик. Без проигрыша. */
(function () {
  'use strict';

  var G = window.Games, fx = G.fx, el = G.el, esc = G.kit.esc;
  var HUES = [140, 200, 330, 270, 25, 175, 50, 300];
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function uid() { return 'd' + Math.floor(Math.random() * 1e8); }

  /* ---------- графика ---------- */
  var EGG_PATH = 'M50 4 C 80 4 96 52 96 74 C 96 100 76 116 50 116 C 24 116 4 100 4 74 C 4 52 20 4 50 4 Z';
  function eggSVG(hue, gold) {
    var id = uid(), base = gold ? ['#FFF6C8', '#FFD25A', '#E69A12'] : ['hsl(' + hue + ',80%,92%)', 'hsl(' + hue + ',70%,74%)', 'hsl(' + hue + ',55%,52%)'];
    var spot = gold ? 'hsl(' + hue + ',85%,62%)' : 'hsl(' + ((hue + 160) % 360) + ',70%,64%)';
    return '<svg viewBox="0 0 100 120" aria-hidden="true"><defs><radialGradient id="' + id + '" cx="36%" cy="28%" r="85%"><stop offset="0" stop-color="' + base[0] + '"/><stop offset=".6" stop-color="' + base[1] + '"/><stop offset="1" stop-color="' + base[2] + '"/></radialGradient>' +
      '<clipPath id="c' + id + '"><path d="' + EGG_PATH + '"/></clipPath></defs>' +
      '<path d="' + EGG_PATH + '" fill="url(#' + id + ')" stroke="rgba(60,20,60,.35)" stroke-width="3"/>' +
      '<g clip-path="url(#c' + id + ')" fill="' + spot + '" opacity=".85"><circle cx="30" cy="40" r="9"/><circle cx="70" cy="58" r="12"/><circle cx="40" cy="86" r="10"/><circle cx="78" cy="96" r="7"/><circle cx="58" cy="22" r="5"/><circle cx="18" cy="70" r="5"/>' +
      (gold ? '<path d="M0 66 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 v6 h-100z" fill="#FFF1B0"/>' : '') + '</g>' +
      '<ellipse cx="34" cy="30" rx="11" ry="17" fill="#fff" opacity=".45" transform="rotate(20 34 30)"/></svg>';
  }
  function shellSVG(hue) {
    var id = uid();
    return '<svg class="shell" viewBox="0 0 100 120" aria-hidden="true"><defs><radialGradient id="' + id + '"><stop offset="0" stop-color="#FFF7D6" stop-opacity="1"/><stop offset="1" stop-color="#FFF7D6" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="50" cy="56" r="52" fill="url(#' + id + ')"/>' +
      '<path d="M4 74 L16 62 L26 72 L38 58 L50 70 L62 56 L74 70 L84 60 L96 72 C 96 100 76 116 50 116 C 24 116 4 100 4 74 Z" fill="hsl(' + hue + ',70%,82%)" stroke="rgba(60,20,60,.35)" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M10 80 Q50 92 90 80" stroke="#fff" stroke-width="3" opacity=".5" fill="none"/></svg>';
  }
  function dragonSVG(hue, still) {
    var id = uid(), c1 = 'hsl(' + hue + ',80%,66%)', c2 = 'hsl(' + hue + ',70%,46%)', wing = 'hsl(' + ((hue + 40) % 360) + ',85%,72%)';
    return '<svg viewBox="0 0 100 90"' + (still ? ' class="still"' : '') + ' aria-hidden="true"><defs><radialGradient id="' + id + '" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="hsl(' + hue + ',90%,82%)"/><stop offset=".6" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></radialGradient></defs>' +
      '<path class="wingL" d="M34 50 C 14 30 4 36 6 48 C 12 44 16 52 22 50 C 18 58 26 60 32 60 Z" fill="' + wing + '" stroke="' + c2 + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path class="wingR" d="M66 50 C 86 30 96 36 94 48 C 88 44 84 52 78 50 C 82 58 74 60 68 60 Z" fill="' + wing + '" stroke="' + c2 + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M70 72 C 88 74 92 62 86 56 C 92 58 96 70 86 80 C 80 84 72 82 66 78 Z" fill="url(#' + id + ')" stroke="' + c2 + '" stroke-width="2.5"/>' +
      '<ellipse cx="50" cy="64" rx="22" ry="20" fill="url(#' + id + ')" stroke="' + c2 + '" stroke-width="3"/>' +
      '<ellipse cx="50" cy="68" rx="12" ry="13" fill="#FFF1C2"/><path d="M41 64 H59 M40 70 H60 M42 76 H58" stroke="#F0C870" stroke-width="2"/>' +
      '<ellipse cx="38" cy="84" rx="7" ry="4" fill="' + c2 + '"/><ellipse cx="62" cy="84" rx="7" ry="4" fill="' + c2 + '"/>' +
      '<path d="M36 22 L32 8 L42 18 Z M64 22 L68 8 L58 18 Z" fill="#FFF1C2" stroke="#D9A04A" stroke-width="2" stroke-linejoin="round"/>' +
      '<circle cx="50" cy="34" r="20" fill="url(#' + id + ')" stroke="' + c2 + '" stroke-width="3"/>' +
      '<circle cx="42" cy="32" r="6" fill="#fff"/><circle cx="58" cy="32" r="6" fill="#fff"/><circle cx="43" cy="33" r="3.4" fill="#2B2A4C"/><circle cx="59" cy="33" r="3.4" fill="#2B2A4C"/>' +
      '<circle cx="44" cy="31.5" r="1.2" fill="#fff"/><circle cx="60" cy="31.5" r="1.2" fill="#fff"/>' +
      '<ellipse cx="36" cy="41" rx="4" ry="2.5" fill="#FF8FA8" opacity=".8"/><ellipse cx="64" cy="41" rx="4" ry="2.5" fill="#FF8FA8" opacity=".8"/>' +
      '<path d="M44 42 Q50 47 56 42" stroke="#5A2A3A" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M53 43.5 l1.5 3 l1.5 -3.4z" fill="#fff"/>' +
      '<circle cx="46" cy="25" r="1.4" fill="' + c2 + '"/><circle cx="54" cy="25" r="1.4" fill="' + c2 + '"/></svg>';
  }
  function mountainsSVG() {
    return '<svg viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A2160"/><stop offset="1" stop-color="#2A1240"/></linearGradient>' +
      '<radialGradient id="lg"><stop offset="0" stop-color="#FFD25A"/><stop offset="1" stop-color="#FF6A3D" stop-opacity="0"/></radialGradient></defs>' +
      '<path d="M0 120 L60 60 L110 110 L170 40 L220 100 L280 30 L330 90 L400 50 L400 200 L0 200Z" fill="#7A3A7E" opacity=".65"/>' +
      '<ellipse class="lava" cx="280" cy="34" rx="40" ry="18" fill="url(#lg)"/>' +
      '<path d="M0 150 L50 110 L100 140 L160 90 L210 130 L270 80 L320 120 L370 96 L400 110 L400 200 L0 200Z" fill="url(#mg)"/>' +
      '<path d="M266 82 L274 80 L270 96 L278 100 L268 120" stroke="#FF8A3D" stroke-width="3" fill="none" class="lava"/></svg>';
  }
  function crystalSVG(h) {
    return '<svg viewBox="0 0 20 34"><path d="M10 0 L20 12 L10 34 L0 12Z" fill="hsl(' + h + ',90%,80%)" stroke="hsl(' + h + ',70%,55%)" stroke-width="1.5"/><path d="M10 0 L13 12 L10 34 L7 12Z" fill="#fff" opacity=".5"/></svg>';
  }

  /* ---------- игра ---------- */
  function play(round, api) {
    var stage = api.stage, W = stage.clientWidth, H = stage.clientHeight;
    var pool = api.items.filter(function (x) { return x.e || x.zh; });
    if (pool.length < 2) pool = api.items;
    var P = Math.min(clamp(parseInt(api.settings.pairs, 10) || 6, 2, 8), pool.length);
    var picked = G.shuffle(pool).slice(0, P);
    var cards = [];
    picked.forEach(function (it, i) { cards.push({ type: 'word', it: it, pair: i }); cards.push({ type: 'pic', it: it, pair: i }); });
    cards = G.shuffle(cards);
    var open = [], matched = 0, misses = 0, locked = false, babies = [], raf = 0, resetIdle, finaleMode = false;

    /* сцена */
    stage.innerHTML = '';
    var m = el('div', 'mount'); m.innerHTML = mountainsSVG(); stage.appendChild(m);
    [[8, 30, 190], [86, 22, 290], [72, 60, 160], [16, 66, 320]].forEach(function (c, i) {
      var d = el('div', 'crystal'); d.style.left = c[0] + '%'; d.style.top = c[1] + '%'; d.style.animationDelay = (-i * 1.3) + 's'; d.innerHTML = crystalSVG(c[2]); stage.appendChild(d);
    });
    var perch = el('div', 'perch'); stage.appendChild(perch);
    var slots = picked.map(function () { var s = el('div', 'slot'); perch.appendChild(s); return s; });
    fx.startAmbient('stars', 30, function () { var r = stage.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height * 0.6 }; });
    api.cleanup(function () { fx.stopAmbient(); cancelAnimationFrame(raf); });

    /* раскладка яиц */
    var grid = el('div', 'grid'), E = 80;
    stage.appendChild(grid);
    // яйца — сетка без перекрытий, размер и число колонок под текущий экран
    function layoutGrid() {
      var top = 84, gap = H < 520 ? 8 : 12;
      var g = api.cells(cards.length, { x: 12, y: top, w: W - 24, h: H - top - 12 }, 1.18, gap);
      E = Math.min(130, Math.floor(g.size));
      grid.style.cssText = 'top:' + top + 'px;bottom:12px;grid-template-columns:repeat(' + g.cols + ',' + E + 'px);--E:' + E + 'px;--gap:' + gap + 'px';
      cards.forEach(function (cd) {
        if (!cd.el || cd.type !== 'word') return;
        var w = cd.el.querySelector('.word'); if (w) w.style.setProperty('--fs', Math.max(11, Math.min(E * 0.2, (E * 0.86) / (cd.it.w.length * 0.6))) + 'px');
      });
    }
    layoutGrid();

    cards.forEach(function (cd, i) {
      var hue = HUES[cd.pair % HUES.length];
      var b = el('button', 'egg'); b.type = 'button';
      b.style.animationDelay = (i * 0.05) + 's'; b.style.setProperty('--d', (-Math.random() * 3.4).toFixed(2) + 's');
      var content;
      if (cd.type === 'word') {
        var fs = Math.max(11, Math.min(E * 0.2, (E * 0.86) / (cd.it.w.length * 0.6)));
        content = '<div class="word" style="--fs:' + fs + 'px">' + esc(cd.it.w) + '</div>';
      } else {
        content = cd.it.e ? '<div class="pic">' + cd.it.e + '</div>' : '<div class="word" style="--fs:' + Math.max(12, E * 0.22) + 'px">' + esc(cd.it.zh) + '</div>';
      }
      var frontHue = [28, 300, 190, 95][i % 4];
      b.innerHTML = '<div class="flip"><div class="face front">' + eggSVG(frontHue) + '</div><div class="face back">' + shellSVG(hue) + '<div class="content">' + content + '</div></div></div>';
      b.setAttribute('aria-label', 'egg ' + (i + 1));
      b.addEventListener('click', function () { onEgg(b, cd); });
      cd.el = b; b._pair = cd.pair;
      grid.appendChild(b);
    });

    /* полёты дракончиков */
    var lastT = 0;
    function loop(t) {
      lastT = t;
      if (finaleMode) {
        var r = stage.getBoundingClientRect();
        babies.forEach(function (bb, i) {
          var a = t / 1000 * (0.9 + i * 0.07) + i * 1.3;
          var x = W / 2 + Math.sin(a) * W * 0.38 - bb.s / 2, y = H * 0.42 + Math.sin(a * 2) * H * 0.18 - bb.s / 2;
          bb.el.style.transform = 'translate(' + x + 'px,' + y + 'px) scaleX(' + (Math.cos(a) > 0 ? 1 : -1) + ')';
          if (Math.random() < 0.35) fx.trail(r.left + x + bb.s / 2, r.top + y + bb.s * 0.7, 'hsl(' + bb.hue + ',90%,80%)');
        });
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    function hintPair() {
      var left = cards.filter(function (cd) { return !cd.el.classList.contains('done') && !cd.el.classList.contains('open'); });
      if (!left.length) return;
      var pr = left[0].pair;
      var both = cards.filter(function (cd) { return cd.pair === pr && !cd.el.classList.contains('done'); });
      both.forEach(function (cd) { cd.el.classList.add('hint'); var c = fx.center(cd.el); fx.sparkle(c.x, c.y, 8); });
      api.hinted();
      setTimeout(function () { both.forEach(function (cd) { cd.el.classList.remove('hint'); }); }, 2200);
    }
    resetIdle = api.idle(hintPair);

    function onEgg(b, cd) {
      if (locked || !api.alive() || b.classList.contains('open') || b.classList.contains('done')) return;
      G.ac();
      b.classList.remove('hint');
      b.classList.add('open'); G.sfx.pop();
      var c = fx.center(b); fx.burst(c.x, c.y - c.h * 0.1, { n: 8, shape: 'drop', speed: 160, g: 500, life: .7, size: 4, colors: ['#FFF6E0', '#F4E0C0'] });
      if (cd.type === 'word') api.speak(cd.it);
      open.push(cd);
      if (resetIdle) resetIdle();
      if (open.length < 2) return;
      locked = true;
      var a = open[0], d = open[1];
      if (a.pair === d.pair) { setTimeout(function () { match(a, d); }, 450); return; }
      misses++;
      var w = a.type === 'word' ? a : (d.type === 'word' ? d : null), p = a.type === 'pic' ? a : (d.type === 'pic' ? d : null);
      if (w && p) api.mistake(w.it.w, p.it.w, w.it.w);
      setTimeout(function () {
        if (!api.alive()) return;
        [a, d].forEach(function (x) { x.el.classList.add('nope'); });
        G.sfx.soft();
        setTimeout(function () {
          [a, d].forEach(function (x) { x.el.classList.remove('open', 'nope'); });
          open = []; locked = false;
          if (misses >= api.settings.hintAfter) { misses = 0; hintPair(); }
        }, 520);
      }, 900);
    }

    async function match(a, d) {
      open = []; misses = 0;
      a.el.classList.add('done'); d.el.classList.add('done');
      var it = a.it, hue = HUES[a.pair % HUES.length];
      var ca = fx.center(a.el), cb = fx.center(d.el), sr = stage.getBoundingClientRect();
      G.sfx.good(); api.speak(it);
      fx.stars(cb.x, cb.y, 10); fx.sparkle(ca.x, ca.y, 12); fx.burst(cb.x, cb.y - cb.h * 0.2, { n: 14, shape: 'confetti', speed: 300, g: 600, life: 1.2, size: 5 });
      // дракончик вылупляется
      var s = Math.max(64, E * 0.9);
      var baby = el('div', 'baby'); baby.style.width = s + 'px'; baby.style.height = s * 0.9 + 'px';
      baby.innerHTML = dragonSVG(hue);
      stage.appendChild(baby);
      var x0 = cb.x - sr.left - s / 2, y0 = cb.y - sr.top - s * 0.6;
      baby.style.transform = 'translate(' + x0 + 'px,' + y0 + 'px)';
      baby.animate([{ transform: 'translate(' + x0 + 'px,' + (y0 + 20) + 'px) scale(.1)' }, { transform: 'translate(' + x0 + 'px,' + (y0 - 30) + 'px) scale(1.15)', offset: .6 }, { transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(1)' }], { duration: 650, easing: 'cubic-bezier(.3,1.5,.5,1)' });
      api.bubble('<b>' + esc(it.w) + '</b>' + (it.zh ? '<small>' + esc(it.zh) + '</small>' : ''), x0 + s / 2, y0 - 4, 1300);
      await sleep(1300); if (!api.alive()) return;
      // летит на жёрдочку
      var slot = slots[matched], r = slot.getBoundingClientRect();
      var x1 = r.left - sr.left + r.width / 2 - s / 2, y1 = r.top - sr.top + r.height / 2 - s * 0.45, sc = r.width / s;
      var fly = baby.animate([
        { transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(1)' },
        { transform: 'translate(' + ((x0 + x1) / 2 + 40) + 'px,' + (Math.min(y0, y1) - 60) + 'px) scale(.8) rotate(-8deg)', offset: .5 },
        { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(' + sc + ')' }
      ], { duration: 900, easing: 'ease-in-out', fill: 'forwards' });
      var trail = setInterval(function () { var c = fx.center(baby); fx.trail(c.x, c.y + 8, 'hsl(' + hue + ',90%,80%)'); }, 40);
      await new Promise(function (res) { fly.onfinish = res; setTimeout(res, 1100); });
      clearInterval(trail); baby.remove();
      slot.innerHTML = '<div class="d">' + dragonSVG(hue, true) + '</div>';
      babies.push({ hue: hue });
      var sc2 = fx.center(slot); fx.sparkle(sc2.x, sc2.y, 8);
      matched++; api.progress(matched, P);
      if (matched >= P) { finale(); return; }
      locked = false;
    }

    async function finale() {
      locked = true;
      await sleep(400); if (!api.alive()) return;
      G.sfx.win();
      grid.style.transition = 'opacity .6s'; grid.style.opacity = '.25';
      // дракончики слетают с жёрдочки и кружатся
      babies = babies.map(function (bb, i) {
        var s = 60, e2 = el('div', 'baby'); e2.style.width = s + 'px'; e2.style.height = s * 0.9 + 'px'; e2.innerHTML = dragonSVG(bb.hue);
        stage.appendChild(e2); slots[i].innerHTML = '';
        return { el: e2, s: s, hue: bb.hue };
      });
      finaleMode = true;
      // мама-дракон
      var M = Math.min(W * 0.5, 230), mama = el('div', 'baby'); mama.style.width = M + 'px'; mama.style.height = M * 0.9 + 'px'; mama.innerHTML = dragonSVG(HUES[round.idx % HUES.length]);
      stage.appendChild(mama);
      var mx = W / 2 - M / 2, my = H * 0.5 - M * 0.45;
      var enter = mama.animate([{ transform: 'translate(' + (-M) + 'px,' + (H * 0.2) + 'px) scale(.6) rotate(-10deg)' }, { transform: 'translate(' + mx + 'px,' + my + 'px) scale(1) rotate(0)' }], { duration: 1400, easing: 'cubic-bezier(.3,1.2,.5,1)', fill: 'forwards' });
      await new Promise(function (res) { enter.onfinish = res; setTimeout(res, 1600); });
      if (!api.alive()) return;
      var sr = stage.getBoundingClientRect(), mouthX = sr.left + mx + M * 0.5, mouthY = sr.top + my + M * 0.45;
      // радужное «пламя» вверх
      for (var i = 0; i < 14; i++) {
        setTimeout(function () {
          var cols = ['#FF5E5E', '#FFB02E', '#FFE066', '#5BD06A', '#4FB5FF', '#B06BFF'];
          fx.burst(mouthX, mouthY, { n: 6, shape: 'star', speed: 480, g: 120, drag: 1.2, life: 1.2, size: 7, spread: 0.3, dir: -Math.PI * 0.62, colors: cols });
          fx.burst(mouthX, mouthY, { n: 6, shape: 'confetti', speed: 420, g: 300, drag: 1, life: 1.4, size: 5, spread: 0.3, dir: -Math.PI * 0.38, colors: cols });
        }, i * 110);
      }
      fx.fireworks(7);
      fx.emojiRain(picked.map(function (p) { return p.e; }).filter(Boolean).concat(['✨', '⭐', '💎']), 24, 2.6);
      mama.animate([{ transform: 'translate(' + mx + 'px,' + my + 'px) rotate(0)' }, { transform: 'translate(' + mx + 'px,' + (my - 14) + 'px) rotate(-4deg)' }, { transform: 'translate(' + mx + 'px,' + my + 'px) rotate(4deg)' }], { duration: 900, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out', composite: 'replace' });
      api.bubble('Roar! Thank you! 谢谢你！🐉', W / 2, my + M * 0.05, 0);
      api.speak('Thank you!');
      await sleep(5200); if (!api.alive()) return;
      api.hideBubble();
      api.complete(P);
    }

    api.onResize(function (w, h) { W = w; H = h; layoutGrid(); });
    api.progress(0, P);
  }

  G.kit.create({
    id: 'dragon', title: 'Dragon Eggs', zh: '龙蛋配对', emoji: '🐉', className: 'g-dragon',
    blurb: 'Tap two eggs. Find the word and its picture — a baby dragon hatches! Hatch them all to meet Mama Dragon. 点两个蛋，找到单词和它的图片，小龙就会孵出来！孵出所有小龙，见到龙妈妈！',
    defaults: window.DRAGON_DEFAULTS, minWords: 2,
    albumLabel: 'My dragon eggs 我的龙蛋', rewardTitle: 'A golden dragon egg! 获得金龙蛋！',
    reward: function (r) { return eggSVG(HUES[r.idx % HUES.length], true); },
    play: play
  });
})();
