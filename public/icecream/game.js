/* Ice Cream Tower — рожок просит цвет, ученик перетаскивает (или нажимает) нужный шарик. 3–7 шариков, без проигрыша. */
(function () {
  'use strict';

  var G = window.Games, fx = G.fx, el = G.el, esc = G.kit.esc;
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function uid() { return 'i' + Math.floor(Math.random() * 1e8); }

  /* ---------- цвета: название / вкус / эмодзи / #код ---------- */
  var COLORS = {
    red: '#FF4D5E', orange: '#FF9F43', yellow: '#FFE066', green: '#6BD66B', blue: '#5AB4FF', purple: '#A879FF', violet: '#A879FF',
    pink: '#FF8FC8', brown: '#9B5E3C', white: '#FFF8F0', black: '#3A3340', gray: '#B8B8C8', grey: '#B8B8C8',
    gold: '#FFC93C', silver: '#C9D1DC', beige: '#F2DFC0', cream: '#FFF2C8', 'light blue': '#9ED8FF', 'sky blue': '#8FD3FF',
    'dark blue': '#2F5FBF', navy: '#2C3E7A', 'light green': '#B5EF9A', 'dark green': '#2E8B57', turquoise: '#3EC6C0', peach: '#FFB896',
    chocolate: '#7A4A2A', vanilla: '#FFF2C8', strawberry: '#FF8FB0', mint: '#9CF0D0', lemon: '#FFF07A', blueberry: '#5B6FD8',
    grape: '#9B5FD0', cherry: '#D6224A', banana: '#FFE88A', caramel: '#D9944A', coconut: '#FBF8F2', matcha: '#8DBF5A', mango: '#FFB23E',
    raspberry: '#E8336D', coffee: '#6B4A35', watermelon: '#FF6F7D', apple: '#9BE07A', peanut: '#C99A5B', cookie: '#B88A5E', bubblegum: '#FF9AD5'
  };
  var EMOJI_COLORS = { '🔴': '#FF4D5E', '🟠': '#FF9F43', '🟡': '#FFE066', '🟢': '#6BD66B', '🔵': '#5AB4FF', '🟣': '#A879FF', '🟤': '#9B5E3C', '⚫': '#3A3340', '⚪': '#FFF8F0', '🩷': '#FF8FC8', '🩶': '#B8B8C8', '🩵': '#9ED8FF' };
  function hexOk(s) { return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s || ''); }
  function colorOf(it) {
    if (hexOk(it.e)) return it.e.length === 4 ? '#' + it.e[1] + it.e[1] + it.e[2] + it.e[2] + it.e[3] + it.e[3] : it.e;
    var k = it.w.toLowerCase().trim();
    if (COLORS[k]) return COLORS[k];
    if (EMOJI_COLORS[it.e]) return EMOJI_COLORS[it.e];
    var last = k.split(/\s+/).pop(); if (COLORS[last]) return COLORS[last];
    var h = 0; for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 360;
    return hslHex(h, 75, 65);
  }
  function hslHex(h, s, l) {
    s /= 100; l /= 100;
    var a = s * Math.min(l, 1 - l), f = function (n) { var k = (n + h / 30) % 12, c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255).toString(16).padStart(2, '0'); };
    return '#' + f(0) + f(8) + f(4);
  }
  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mix(hex, t, to) { var a = rgb(hex), b = rgb(to || '#000000'); return 'rgb(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }).join(',') + ')'; }
  function dist(a, b) { var x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); }

  /* ---------- графика ---------- */
  var SCOOP_PATH = 'M8 50 C 4 22 28 4 50 4 C 72 4 96 22 92 50 C 88 57 82 53 77 60 C 72 68 66 58 60 64 C 54 72 46 62 40 68 C 34 74 28 60 22 63 C 15 66 10 58 8 50 Z';
  function scoopSVG(color) {
    var id = uid(), dark = mix(color, 0.28), light = mix(color, 0.55, '#FFFFFF'), speck = mix(color, 0.18);
    return '<svg viewBox="0 0 100 80" aria-hidden="true"><defs><radialGradient id="' + id + '" cx="36%" cy="26%" r="80%"><stop offset="0" stop-color="' + light + '"/><stop offset=".55" stop-color="' + color + '"/><stop offset="1" stop-color="' + dark + '"/></radialGradient></defs>' +
      '<path d="' + SCOOP_PATH + '" fill="url(#' + id + ')" stroke="' + dark + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<g fill="' + speck + '" opacity=".45"><circle cx="30" cy="30" r="2.6"/><circle cx="62" cy="22" r="2"/><circle cx="72" cy="40" r="2.8"/><circle cx="44" cy="44" r="2.2"/><circle cx="20" cy="46" r="1.8"/></g>' +
      '<path d="M18 30 Q 26 12 46 10" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/>' +
      '<circle cx="54" cy="12" r="3" fill="#fff" opacity=".6"/></svg>';
  }
  function coneSVG() {
    var id = uid();
    return '<svg viewBox="0 0 100 130" aria-hidden="true"><defs>' +
      '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C98A3C"/><stop offset=".45" stop-color="#F5C778"/><stop offset="1" stop-color="#C47F33"/></linearGradient>' +
      '<pattern id="p' + id + '" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 H14 M0 0 V14" stroke="#B0702A" stroke-width="2.2" opacity=".6"/></pattern>' +
      '<clipPath id="c' + id + '"><path d="M6 14 L94 14 L56 124 Q50 132 44 124 Z"/></clipPath></defs>' +
      '<path d="M6 14 L94 14 L56 124 Q50 132 44 124 Z" fill="url(#' + id + ')" stroke="#9A5F22" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<g clip-path="url(#c' + id + ')"><rect width="100" height="130" fill="url(#p' + id + ')"/></g>' +
      '<rect x="2" y="6" width="96" height="16" rx="8" fill="#F7CF86" stroke="#9A5F22" stroke-width="3.5"/>' +
      // лицо
      '<circle cx="36" cy="44" r="7.5" fill="#fff"/><circle cx="64" cy="44" r="7.5" fill="#fff"/><circle cx="37" cy="45" r="4.4" fill="#2B2A4C"/><circle cx="63" cy="45" r="4.4" fill="#2B2A4C"/>' +
      '<circle cx="38.5" cy="43.2" r="1.5" fill="#fff"/><circle cx="64.5" cy="43.2" r="1.5" fill="#fff"/>' +
      '<g class="lid"><circle cx="36" cy="44" r="7.8" fill="#E8A95A"/><circle cx="64" cy="44" r="7.8" fill="#E8A95A"/></g>' +
      '<ellipse cx="26" cy="56" rx="6" ry="3.6" fill="#FF8FA8" opacity=".8"/><ellipse cx="74" cy="56" rx="6" ry="3.6" fill="#FF8FA8" opacity=".8"/>' +
      '<path class="m-s" d="M41 56 Q50 66 59 56" stroke="#6E3A10" stroke-width="3.4" fill="#C2462F" stroke-linecap="round"/>' +
      '<ellipse class="m-o" cx="50" cy="60" rx="5" ry="6" fill="#6E3A10"/></svg>';
  }
  function tubSVG(color) {
    var id = uid();
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C9D3DE"/><stop offset=".4" stop-color="#F4F8FC"/><stop offset="1" stop-color="#AEB9C6"/></linearGradient></defs>' +
      '<g transform="translate(4 0) scale(.92)">' + scoopSVG(color).replace(/<\/?svg[^>]*>/g, '') + '</g>' +
      '<path d="M6 58 L94 58 L86 96 Q85 99 82 99 L18 99 Q15 99 14 96 Z" fill="url(#' + id + ')" stroke="#8C98A6" stroke-width="3" stroke-linejoin="round"/>' +
      '<rect x="3" y="54" width="94" height="10" rx="5" fill="#E8EEF4" stroke="#8C98A6" stroke-width="3"/>' +
      '<path d="M22 70 Q 24 84 28 92" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/></svg>';
  }
  function creamSVG() {
    return '<svg viewBox="0 0 100 70" aria-hidden="true"><g fill="#FFFFFF" stroke="#E6DDEA" stroke-width="3" stroke-linejoin="round">' +
      '<path d="M8 60 C 0 44 18 38 26 42 C 22 30 40 22 48 30 C 50 16 72 16 74 32 C 86 28 98 44 90 60 Z"/>' +
      '<path d="M26 40 C 30 26 46 22 52 30 C 58 20 76 24 72 38" fill="none"/>' +
      '<path d="M40 30 C 44 12 62 10 62 26" /></g><path d="M18 52 Q 30 46 40 52" stroke="#F2EAF6" stroke-width="4" fill="none" stroke-linecap="round"/></svg>';
  }
  function cherrySVG() {
    return '<svg viewBox="0 0 40 44" aria-hidden="true"><path d="M20 18 C 22 8 28 3 34 2" stroke="#3E7A2A" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="18" cy="28" r="14" fill="#E22B4F" stroke="#A3122E" stroke-width="3"/><ellipse cx="13" cy="22" rx="4" ry="3" fill="#fff" opacity=".7"/></svg>';
  }
  function rewardSVG(round) {
    var cols = [], seen = {};
    round.words.forEach(function (w) { var c = colorOf(w); if (!seen[c] && cols.length < 3) { seen[c] = 1; cols.push(c); } });
    while (cols.length < 3) cols.push(['#FF8FC8', '#FFE066', '#9CF0D0'][cols.length]);
    var s = '<svg viewBox="0 0 100 150" overflow="visible" aria-hidden="true">';
    s += '<g transform="translate(25 72) scale(.5)">' + coneSVG().replace(/<\/?svg[^>]*>/g, '') + '</g>';
    [[14, 52], [14, 30], [14, 8]].forEach(function (p, i) { s += '<g transform="translate(' + p[0] + ' ' + p[1] + ') scale(.72)">' + scoopSVG(cols[i]).replace(/<\/?svg[^>]*>/g, '') + '</g>'; });
    s += '<g transform="translate(40 -10) scale(.5)">' + cherrySVG().replace(/<\/?svg[^>]*>/g, '') + '</g></svg>';
    return s;
  }

  /* ---------- игра ---------- */
  function play(round, api) {
    var stage = api.stage, W = stage.clientWidth, H = stage.clientHeight;
    var items = api.items, decoys = api.decoys;
    var N = clamp(parseInt(api.settings.scoops, 10) || 5, 3, 7);
    var CH = clamp(parseInt(api.settings.choices, 10) || 4, 2, 5);
    var seq = [], prev = null;
    for (var i = 0; i < N; i++) {
      var pool = items.filter(function (x) { return items.length < 2 || x !== prev; });
      prev = pool[Math.floor(Math.random() * pool.length)]; seq.push(prev);
    }
    var k = 0, wrong = 0, locked = true, target = null, tubs = [], scoops = [], resetIdle, drag = null;
    var L = {};

    /* сцена */
    stage.innerHTML = '';
    stage.appendChild(el('div', 'wall'));
    stage.appendChild(el('div', 'awning'));
    var counter = el('div', 'counter'); stage.appendChild(counter);
    var tower = el('div', 'tower'); tower.innerHTML = '<div class="cone">' + coneSVG() + '</div>'; stage.appendChild(tower);
    var drop = el('div', 'drop'); stage.appendChild(drop);
    var freezer = el('div', 'freezer'); stage.appendChild(freezer);
    var order = el('div', 'order'); stage.appendChild(order);
    fx.startAmbient('pollen', 14, function () { var r = stage.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height * 0.6 }; });
    api.cleanup(function () { fx.stopAmbient(); endDrag(true); });

    /* раскладка: портрет — рожок над витриной, альбом — рожок слева, витрина справа */
    function layout() {
      var land = W > H * 1.15;
      var ob = order.offsetTop + (order.offsetHeight || 70) + 10;
      var fr;
      if (land) {
        fr = { x: W * 0.46, y: ob, w: W * 0.54 - 12, h: H - ob - 12 };
        L.areaTop = ob; L.cx = W * 0.23; L.base = H - Math.max(26, H * 0.12);
        counter.style.height = (H - L.base + 6) + 'px';
      } else {
        var fh = clamp(H * 0.27, 112, 230);
        fr = { x: 10, y: H - fh - 10, w: W - 20, h: fh };
        L.areaTop = ob; L.cx = W / 2; L.base = fr.y - 6;
        counter.style.height = (H - L.base + 10) + 'px';
      }
      freezer.style.cssText = 'left:' + fr.x + 'px;top:' + fr.y + 'px;width:' + fr.w + 'px;height:' + fr.h + 'px';
      L.fr = fr;
      var areaH = L.base - L.areaTop, areaW = land ? W * 0.44 : W;
      L.coneW = clamp(Math.min(areaW * 0.36, areaH * 0.34), 56, 150);
      L.coneH = L.coneW * 1.3; L.scoopW = L.coneW * 1.2; L.scoopH = L.scoopW * 0.8; L.step = L.scoopH * 0.55;
      L.towerW = L.scoopW * 1.2;
      layoutTower(); layoutTubs();
    }
    function stackTop(count) { return L.coneH * 0.86 + count * L.step; }
    function layoutTower(extra) {
      var need = stackTop(scoops.length) + L.scoopH * 0.75 + (extra || 0);
      L.scale = Math.min(1, (L.base - L.areaTop) / Math.max(need, L.coneH * 1.6));
      var th = need + 40;
      tower.style.width = L.towerW + 'px'; tower.style.height = th + 'px';
      tower.style.left = (L.cx - L.towerW / 2) + 'px'; tower.style.top = (L.base - th) + 'px';
      var tf = 'scale(' + L.scale.toFixed(3) + ')';
      tower.style.setProperty('--tscale', tf); tower.style.transform = tf;
      var cone = tower.querySelector('.cone'); cone.style.width = L.coneW + 'px'; cone.style.left = ((L.towerW - L.coneW) / 2) + 'px';
      scoops.forEach(function (s, i) { s.style.width = L.scoopW + 'px'; s.style.bottom = (L.coneH * 0.86 + i * L.step - L.scoopH * 0.18) + 'px'; s.style.zIndex = 10 + i; });
      var r = L.scoopW * 0.62 * L.scale, dp = dropPoint();
      drop.style.width = drop.style.height = (r * 2) + 'px'; drop.style.left = (dp.x - r) + 'px'; drop.style.top = (dp.y - r) + 'px';
    }
    function dropPoint() { return { x: L.cx, y: L.base - (stackTop(scoops.length) + L.scoopH * 0.32) * L.scale }; }
    function layoutTubs() {
      var inner = { x: 8, y: 14, w: L.fr.w - 36, h: L.fr.h - 36 };
      var g = api.cells(tubs.length || CH, inner, 1, 10);
      var size = Math.min(g.size, 130);
      tubs.forEach(function (t, i) {
        var c = g.cells[i];
        t.style.width = size + 'px'; t.style.height = size + 'px';
        t.style.left = (c.cx - size / 2 + 8) + 'px'; t.style.top = (c.cy - size / 2 + 4) + 'px';
      });
      L.tub = size;
    }

    /* заказ и ванночки */
    function nextOrder() {
      target = seq[k]; wrong = 0;
      var tc = colorOf(target);
      order.className = 'order'; void order.offsetWidth; order.classList.add('pop');
      order.innerHTML = '<button class="ear" type="button" aria-label="Listen">🔊</button><div><div class="w">' + esc(target.w) + '</div>' +
        (target.zh ? '<div class="z zhline">' + esc(target.zh) + '</div>' : '') + '<div class="please">Find this color! 找到这个颜色</div></div>';
      order.querySelector('.ear').addEventListener('click', function () { G.ac(); api.speak((target.say || target.w)); });
      // варианты: нужный цвет + заметно отличающиеся
      var others = G.shuffle(items.concat(decoys)).filter(function (x) { return x.w.toLowerCase() !== target.w.toLowerCase(); });
      var opts = [target], cols = [tc];
      others.forEach(function (x) { var c = colorOf(x); if (opts.length < CH && cols.every(function (q) { return dist(q, c) > 70; })) { opts.push(x); cols.push(c); } });
      Object.keys(COLORS).forEach(function (name) {
        if (opts.length >= CH) return;
        var c = COLORS[name]; if (cols.every(function (q) { return dist(q, c) > 90; })) { opts.push({ w: name, zh: '', e: '', say: '' }); cols.push(c); }
      });
      tubs.forEach(function (t) { t.remove(); });
      tubs = G.shuffle(opts).map(function (o, i) {
        var t = el('button', 'tub'); t.type = 'button'; t._o = o; t._c = colorOf(o);
        t.style.animationDelay = (i * 0.08) + 's';
        t.innerHTML = tubSVG(t._c); t.setAttribute('aria-label', 'ice cream ' + (i + 1));
        t.addEventListener('pointerdown', function (e) { startDrag(e, t); });
        t.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tryTub(t, null); } });
        freezer.appendChild(t); return t;
      });
      layoutTubs();
      var dp = dropPoint();
      setTimeout(function () {
        if (!api.alive()) return;
        api.bubble('<b>' + esc(target.w) + ', please!</b>' + (target.zh ? '<small>请给我' + esc(target.zh) + '</small>' : ''), L.cx, dp.y - 6, 1800);
        api.speak((target.say || target.w) + ', please!');
        locked = false;
      }, 450);
      resetIdle = api.idle(hint);
    }

    function hint() {
      var t = tubs.filter(function (x) { return x._o === target; })[0];
      if (!t || t.classList.contains('hint')) return;
      t.classList.add('hint'); api.hinted(); var c = fx.center(t); fx.sparkle(c.x, c.y, 10);
      api.speak(target.say || target.w);
    }

    /* перетаскивание (мышь, палец, стилус) + простое нажатие */
    function stageXY(e) { var r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function makeGhost(color, x, y) {
      var g = el('div', 'ghost'), s = L.scoopW * L.scale;
      g.style.width = s + 'px'; g.innerHTML = scoopSVG(color); g._s = s;
      stage.appendChild(g); moveGhost(g, x, y); return g;
    }
    function moveGhost(g, x, y) { g._x = x; g._y = y; g.style.transform = 'translate(' + (x - g._s / 2) + 'px,' + (y - g._s * 0.4) + 'px)'; }
    function startDrag(e, t) {
      if (locked || !api.alive()) return;
      e.preventDefault(); G.ac();
      var p = stageXY(e);
      drag = { t: t, sx: p.x, sy: p.y, moved: false, ghost: null, id: e.pointerId };
      document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp); document.addEventListener('pointercancel', onUp);
    }
    function near(x, y) { var dp = dropPoint(); return Math.hypot(x - dp.x, y - dp.y) < Math.max(L.scoopW * L.scale * 1.1, 70); }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var p = stageXY(e);
      if (!drag.moved && Math.hypot(p.x - drag.sx, p.y - drag.sy) > 8) {
        drag.moved = true; drag.ghost = makeGhost(drag.t._c, p.x, p.y - 20); drop.classList.add('on'); G.sfx.pop();
      }
      if (drag.ghost) { moveGhost(drag.ghost, p.x, p.y - 20); drop.classList.toggle('near', near(p.x, p.y - 20)); }
    }
    function endDrag(silent) {
      document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); document.removeEventListener('pointercancel', onUp);
      drop.classList.remove('on', 'near');
      if (silent && drag && drag.ghost) drag.ghost.remove();
    }
    function onUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; endDrag(); drag = null;
      if (!d.moved) { tryTub(d.t, null); return; }
      if (near(d.ghost._x, d.ghost._y)) tryTub(d.t, d.ghost);
      else flyBack(d.t, d.ghost);
    }
    function tubScoopPoint(t) { var r = t.getBoundingClientRect(), s = stage.getBoundingClientRect(); return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height * 0.3 }; }
    function flyGhost(g, x, y, ms) {
      var x0 = g._x, y0 = g._y;
      var an = g.animate([{ transform: g.style.transform }, { transform: 'translate(' + (x - g._s / 2) + 'px,' + (y - g._s * 0.4 - 40) + 'px) scale(1.05)', offset: 0.55 }, { transform: 'translate(' + (x - g._s / 2) + 'px,' + (y - g._s * 0.4) + 'px)' }], { duration: ms, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'forwards' });
      g._x = x; g._y = y;
      return new Promise(function (res) { an.onfinish = res; setTimeout(res, ms + 80); });
    }
    function flyBack(t, g) { var p = tubScoopPoint(t); flyGhost(g, p.x, p.y, 380).then(function () { g.remove(); }); }

    async function tryTub(t, ghost) {
      if (locked || !api.alive()) return;
      locked = true;
      if (!ghost) { var p = tubScoopPoint(t); ghost = makeGhost(t._c, p.x, p.y); }
      var dp = dropPoint();
      if (t._o !== target && t._c !== colorOf(target)) {
        wrong++;
        api.mistake(target.w, t._o.w, target.w);
        G.sfx.soft();
        tower.classList.add('oops'); setTimeout(function () { tower.classList.remove('oops'); }, 900);
        await flyGhost(ghost, dp.x, dp.y - 30, 360);
        fx.shake(ghost, 300, 8); await sleep(320);
        api.bubble('Not ' + esc(t._o.w) + '! 不是这个 😮', L.cx, dp.y - 20, 1500);
        api.speak(t._o.say || t._o.w);
        await flyGhost(ghost, tubScoopPoint(t).x, tubScoopPoint(t).y, 420); ghost.remove();
        t.classList.remove('nope'); void t.offsetWidth; t.classList.add('nope');
        if (wrong >= api.settings.hintAfter) hint();
        if (resetIdle) resetIdle();
        locked = false;
        return;
      }
      G.sfx.whoosh();
      await flyGhost(ghost, dp.x, dp.y, 420); if (!api.alive()) return;
      ghost.remove();
      var s = el('div', 'scoop land'); s.innerHTML = scoopSVG(t._c); tower.appendChild(s); scoops.push(s);
      layoutTower();
      var sc = fx.center(s);
      G.sfx.plop(); G.vibrate(15);
      fx.burst(sc.x, sc.y - sc.h * 0.2, { n: 18, shape: 'confetti', speed: 260, g: 600, life: 1, size: 3.5, colors: ['#FF8FB0', '#FFE066', '#9CF0D0', '#5AB4FF', '#C9A8FF', '#FFFFFF'] });
      fx.sparkle(sc.x, sc.y - sc.h * 0.3, 10);
      tower.classList.remove('yay'); void tower.offsetWidth; tower.classList.add('yay');
      api.speak(target.say || target.w);
      k++; api.progress(k, N);
      tubs.forEach(function (x) { x.classList.remove('hint'); });
      await sleep(700); if (!api.alive()) return;
      if (k >= N) { finale(); return; }
      nextOrder();
    }

    /* финал: сливки, вишенка, посыпка */
    async function finale() {
      locked = true;
      order.style.transition = 'opacity .4s'; order.style.opacity = 0;
      freezer.style.transition = 'opacity .5s, transform .5s'; freezer.style.opacity = 0.35; freezer.style.transform = 'translateY(20px)';
      var creamH = L.scoopW * 0.7;
      L.areaTop = 16;
      layoutTower(creamH + L.scoopW * 0.4);
      var cream = el('div', 'scoop'); cream.innerHTML = creamSVG();
      cream.style.width = (L.scoopW * 0.95) + 'px'; cream.style.bottom = (stackTop(scoops.length) - L.scoopH * 0.05) + 'px'; cream.style.zIndex = 40;
      tower.appendChild(cream);
      cream.animate([{ transform: 'translateX(-50%) scale(0) rotate(-40deg)' }, { transform: 'translateX(-50%) scale(1.15) rotate(6deg)' }, { transform: 'translateX(-50%) scale(1) rotate(0)' }], { duration: 700, easing: 'cubic-bezier(.3,1.5,.5,1)' });
      G.sfx.whoosh();
      await sleep(650); if (!api.alive()) return;
      var cherry = el('div', 'scoop'); cherry.innerHTML = cherrySVG();
      cherry.style.width = (L.scoopW * 0.34) + 'px'; cherry.style.bottom = (stackTop(scoops.length) + creamH * 0.62) + 'px'; cherry.style.zIndex = 41;
      tower.appendChild(cherry);
      cherry.animate([{ transform: 'translateX(-50%) translateY(-' + (H * 0.6) + 'px)' }, { transform: 'translateX(-50%) translateY(0) scale(1.2,.8)', offset: 0.6 }, { transform: 'translateX(-50%) translateY(-24px)', offset: 0.8 }, { transform: 'translateX(-50%) translateY(0)' }], { duration: 900, easing: 'ease-in' });
      await sleep(700); if (!api.alive()) return;
      var cc = fx.center(cherry);
      G.sfx.win(); G.vibrate([20, 40, 20]);
      fx.burst(cc.x, cc.y, { n: 60, shape: 'confetti', speed: 520, g: 700, life: 1.8, size: 3.5, colors: ['#FF8FB0', '#FFE066', '#9CF0D0', '#5AB4FF', '#C9A8FF', '#FF9F43'] });
      fx.stars(cc.x, cc.y, 16); fx.hearts(cc.x, cc.y + 30, 10);
      fx.fireworks(5); fx.emojiRain(['🍦', '🍨', '🍒', '✨', '💖'], 22, 2.6);
      tower.classList.add('dance');
      var dp = dropPoint();
      api.bubble('Yummy! Thank you! 谢谢你！🍦', L.cx, cc.y - stage.getBoundingClientRect().top - 24, 0);
      api.speak('Yummy! Thank you!');
      await sleep(5000); if (!api.alive()) return;
      api.hideBubble();
      api.complete(N);
    }

    api.onResize(function (w, h) { W = w; H = h; layout(); });
    api.progress(0, N);
    layout();
    nextOrder();
    layout();
  }

  G.kit.create({
    id: 'icecream', title: 'Ice Cream Tower', zh: '叠冰淇淋', emoji: '🍦', className: 'g-ice',
    blurb: 'Listen to the color and put the right scoop on the cone. Build a tall ice cream tower with a cherry on top! 听颜色，把正确的冰淇淋球放到蛋筒上，叠出高高的冰淇淋！',
    defaults: window.ICECREAM_DEFAULTS, minWords: 2,
    albumLabel: 'My ice creams 我的冰淇淋', rewardTitle: 'A yummy ice cream! 获得冰淇淋！',
    reward: function (r) { return rewardSVG(r); },
    play: play
  });
})();
