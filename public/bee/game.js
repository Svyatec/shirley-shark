/* Bee Garden — слушай слово и неси пчелу к нужному цветку; банка мёда наполняется. Без проигрыша. */
(function () {
  'use strict';

  var G = window.Games, fx = G.fx, el = G.el, esc = G.kit.esc;
  var FLOWER_HUES = [345, 28, 285, 205, 50, 320, 170, 12];
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function uid() { return 'g' + Math.floor(Math.random() * 1e8); }

  /* ---------- графика ---------- */
  function beeSVG() {
    var id = uid();
    return '<svg viewBox="0 0 100 80" aria-hidden="true"><defs>' +
      '<radialGradient id="' + id + '" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#FFF08A"/><stop offset=".6" stop-color="#FFC93C"/><stop offset="1" stop-color="#F0A21A"/></radialGradient>' +
      '<clipPath id="c' + id + '"><ellipse cx="50" cy="50" rx="32" ry="24"/></clipPath></defs>' +
      '<ellipse class="wing" cx="44" cy="24" rx="13" ry="22" transform="rotate(-18 44 40)" fill="rgba(200,240,255,.78)" stroke="#7BB8D8" stroke-width="2.5"/>' +
      '<ellipse class="wing b" cx="58" cy="22" rx="12" ry="20" transform="rotate(14 58 40)" fill="rgba(220,246,255,.7)" stroke="#7BB8D8" stroke-width="2.5"/>' +
      '<path d="M20 50 L8 46 L8 56 Z" fill="#3B2A14" stroke="#3B2A14" stroke-width="3" stroke-linejoin="round"/>' +
      '<ellipse cx="50" cy="50" rx="32" ry="24" fill="url(#' + id + ')" stroke="#B87812" stroke-width="3.5"/>' +
      '<g clip-path="url(#c' + id + ')" fill="#3B2A14"><rect x="30" y="20" width="9" height="60"/><rect x="48" y="20" width="9" height="60"/></g>' +
      '<ellipse cx="42" cy="38" rx="12" ry="5" fill="#fff" opacity=".4" transform="rotate(-12 42 38)"/>' +
      '<circle cx="78" cy="46" r="17" fill="url(#' + id + ')" stroke="#B87812" stroke-width="3.5"/>' +
      '<circle cx="72" cy="42" r="6" fill="#fff"/><circle cx="86" cy="42" r="6" fill="#fff"/><circle cx="74" cy="43" r="3.2" fill="#2B2A4C"/><circle cx="88" cy="43" r="3.2" fill="#2B2A4C"/>' +
      '<circle cx="75" cy="41.5" r="1.1" fill="#fff"/><circle cx="89" cy="41.5" r="1.1" fill="#fff"/>' +
      '<ellipse cx="68" cy="54" rx="4" ry="2.6" fill="#FF8FA8" opacity=".75"/><ellipse cx="92" cy="54" rx="3.4" ry="2.4" fill="#FF8FA8" opacity=".7"/>' +
      '<path d="M74 54 Q80 60 87 54" stroke="#7A3B10" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '<path d="M74 30 Q70 18 62 14 M84 30 Q88 18 96 14" stroke="#3B2A14" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="62" cy="14" r="3" fill="#3B2A14"/><circle cx="96" cy="14" r="3" fill="#3B2A14"/></svg>';
  }

  function flowerHeadSVG(hue) {
    var id = uid(), n = 7 + Math.floor(Math.random() * 3), s = '';
    var c1 = 'hsl(' + hue + ',92%,80%)', c2 = 'hsl(' + hue + ',85%,62%)', c3 = 'hsl(' + hue + ',70%,40%)';
    for (var layer = 0; layer < 2; layer++) {
      for (var i = 0; i < n; i++) {
        var a = (360 / n) * i + (layer ? 180 / n : 0);
        s += '<ellipse cx="50" cy="' + (layer ? 24 : 20) + '" rx="' + (layer ? 11 : 13) + '" ry="' + (layer ? 20 : 24) + '" transform="rotate(' + a.toFixed(1) + ' 50 50)" fill="url(#' + id + (layer ? 'b' : 'a') + ')" stroke="' + c3 + '" stroke-width="2.2"/>';
      }
    }
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><defs>' +
      '<radialGradient id="' + id + 'a" cx="50%" cy="85%" r="90%"><stop offset="0" stop-color="' + c2 + '"/><stop offset="1" stop-color="' + c1 + '"/></radialGradient>' +
      '<radialGradient id="' + id + 'b" cx="50%" cy="85%" r="90%"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="#fff"/></radialGradient>' +
      '<radialGradient id="' + id + 'c" cx="40%" cy="32%" r="80%"><stop offset="0" stop-color="#FFFBE2"/><stop offset="1" stop-color="#FFD56A"/></radialGradient></defs>' +
      s + '<circle cx="50" cy="50" r="27" fill="url(#' + id + 'c)" stroke="#E0A21F" stroke-width="3"/></svg>';
  }

  // v — вариант банки (оттенок мёда и цвет сердечка), lvl — уровень мёда 0..1
  function jarSVG(v, lvl) {
    var id = uid(), h = 30 + (v * 7) % 22, heart = ['#FF6F8E', '#B58BFF', '#4FB5FF', '#5BC16C', '#FF8A3D', '#FF5EA8', '#3EC6C0', '#E2523C'][v % 8];
    return '<svg viewBox="0 0 70 86" aria-hidden="true"><defs>' +
      '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(' + (h + 8) + ',100%,66%)"/><stop offset="1" stop-color="hsl(' + (h - 6) + ',92%,50%)"/></linearGradient>' +
      '<clipPath id="k' + id + '"><path d="M12 18 Q4 22 4 34 L4 70 Q4 82 16 82 L54 82 Q66 82 66 70 L66 34 Q66 22 58 18 Z"/></clipPath></defs>' +
      '<g clip-path="url(#k' + id + ')"><rect width="70" height="86" fill="rgba(255,255,255,.35)"/>' +
      '<g class="fill" style="--lvl:' + (lvl == null ? 1 : lvl) + '"><rect x="0" y="16" width="70" height="70" fill="url(#' + id + ')"/><ellipse cx="35" cy="16" rx="34" ry="4" fill="#FFE58A"/></g></g>' +
      '<path d="M12 18 Q4 22 4 34 L4 70 Q4 82 16 82 L54 82 Q66 82 66 70 L66 34 Q66 22 58 18 Z" fill="none" stroke="#fff" stroke-width="3.5" stroke-linejoin="round" opacity=".95"/>' +
      '<path d="M12 30 Q10 50 12 66" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".7"/>' +
      '<rect x="14" y="8" width="42" height="12" rx="5" fill="#C98A3C" stroke="#8A5A1C" stroke-width="3"/>' +
      '<rect x="12" y="46" width="46" height="22" rx="6" fill="#FFF8E6" stroke="#C98A3C" stroke-width="2.4"/>' +
      '<path d="M35 64 C 22 56 24 50 30 50 C 33 50 35 53 35 53 C 35 53 37 50 40 50 C 46 50 48 56 35 64Z" fill="' + heart + '"/></svg>';
  }

  function butterflyMini(hue) {
    return '<svg viewBox="0 0 40 34"><path d="M20 17 C 12 2 2 4 3 14 C 4 22 14 22 20 18Z M20 17 C 28 2 38 4 37 14 C 36 22 26 22 20 18Z" fill="hsl(' + hue + ',85%,66%)" stroke="hsl(' + hue + ',60%,36%)" stroke-width="1.6"/>' +
      '<path d="M20 18 C 14 20 8 26 12 31 C 16 34 20 26 20 18Z M20 18 C 26 20 32 26 28 31 C 24 34 20 26 20 18Z" fill="hsl(' + ((hue + 40) % 360) + ',90%,78%)" stroke="hsl(' + hue + ',60%,36%)" stroke-width="1.4"/><rect x="19" y="10" width="2" height="14" rx="1" fill="#3B2A4D"/></svg>';
  }

  function hillsSVG() {
    return '<svg class="hills" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M0 90 C 70 30 130 110 200 70 C 270 30 330 100 400 60 L400 300 L0 300Z" fill="#B7EE95"/>' +
      '<path d="M0 140 C 60 100 140 170 220 120 C 290 80 350 150 400 120 L400 300 L0 300Z" fill="#8ADB6E"/>' +
      '<path d="M0 200 C 80 160 160 230 250 190 C 320 160 370 200 400 190 L400 300 L0 300Z" fill="#69C95C"/></svg>';
  }

  function rainbowSVG() {
    var cols = ['#FF5E5E', '#FF9B3D', '#FFD93B', '#5BD06A', '#4FB5FF', '#6E6BFF', '#B06BFF'], s = '';
    cols.forEach(function (c, i) { var r = 190 - i * 13; s += '<path d="M' + (200 - r) + ' 200 A' + r + ' ' + r + ' 0 0 1 ' + (200 + r) + ' 200" fill="none" stroke="' + c + '" stroke-width="13" stroke-linecap="round" style="animation-delay:' + (i * 0.12) + 's"/>'; });
    return '<svg class="rainbow" viewBox="0 0 400 200" aria-hidden="true" style="opacity:.9">' + s + '</svg>';
  }

  /* ---------- игра ---------- */
  function play(round, api) {
    var stage = api.stage, W = stage.clientWidth, H = stage.clientHeight;
    var items = api.items, decoys = api.decoys;
    var steps = G.shuffle(items), N = steps.length;
    var nF = clamp(parseInt(api.settings.flowers, 10) || 4, 3, 6);
    var D = 90;
    var k = 0, wrong = 0, locked = true, flowers = [], resetIdle, hintTimer = null, target = null;
    var styleExtra = document.createElement('style');
    styleExtra.textContent = '.jar .fill{transform-box:fill-box}';
    document.head.appendChild(styleExtra);
    api.cleanup(function () { styleExtra.remove(); });

    /* --- сцена --- */
    stage.innerHTML = '';
    var sun = el('div', 'sun'); stage.appendChild(sun);
    [[8, 14, 0], [40, 8, -30], [62, 22, -50]].forEach(function (c, i) {
      var cl = el('div', 'cloud'); cl.style.cssText = 'left:' + c[0] + '%;top:' + c[1] + '%;animation-delay:' + c[2] + 's;transform:scale(' + (1 - i * 0.18) + ')'; stage.appendChild(cl);
    });
    var hills = el('div'); hills.innerHTML = hillsSVG(); stage.appendChild(hills.firstChild);
    [[10, 36], [58, 46]].forEach(function (p, i) {
      var b = el('div', 'bfly'); b.style.left = p[0] + '%'; b.style.top = p[1] + '%'; b.style.animationDelay = (-i * 9) + 's';
      b.innerHTML = butterflyMini(i ? 200 : 320); stage.appendChild(b);
    });
    var field = el('div'); field.style.cssText = 'position:absolute;inset:0'; stage.appendChild(field);
    stage.appendChild(el('div', 'grass'));
    var jar = el('div', 'jar'); jar.innerHTML = jarSVG(round.idx, 0); stage.appendChild(jar);
    var listen = el('button', 'listen pulse'); listen.type = 'button';
    listen.innerHTML = '<span class="ic">🔊</span><span>Listen<small>听一听</small></span>'; stage.appendChild(listen);
    fx.startAmbient('pollen', 22, function () { var r = stage.getBoundingClientRect(); return { x: r.left, y: r.top + r.height * 0.2, w: r.width, h: r.height * 0.8 }; });
    api.cleanup(function () { fx.stopAmbient(); clearInterval(hintTimer); cancelAnimationFrame(raf); });

    /* --- пчела: полёт по кривой Безье + зависание --- */
    var bee = el('div', 'bee'); var face = el('div'); face.style.cssText = 'width:100%;height:100%;transition:transform .25s'; face.innerHTML = beeSVG(); bee.appendChild(face); stage.appendChild(bee);
    // «Дом» пчелы: над цветами; на низком экране — справа, чтобы не закрывать кнопку «Listen»
    function home() { return H < 520 ? { x: W * 0.86, y: H * 0.26 } : { x: W * 0.5, y: H * 0.2 }; }
    var B = { x: home().x, y: home().y, hx: home().x, hy: home().y, dir: 1, fly: null, lastX: home().x, tilt: 0 };
    var raf = 0, lastT = 0, babies = [];
    function easeIO(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function loop(t) {
      var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
      var r = stage.getBoundingClientRect();
      if (B.fly) {
        var f = B.fly, p = clamp((t - f.t0) / f.dur, 0, 1), e = easeIO(p), u = 1 - e;
        B.x = u * u * f.x0 + 2 * u * e * f.cx + e * e * f.x1; B.y = u * u * f.y0 + 2 * u * e * f.cy + e * e * f.y1;
        if (Math.random() < 0.7) fx.trail(r.left + B.x - B.dir * 26, r.top + B.y + 6, '#FFF3B0');
        if (p >= 1) { B.hx = f.x1; B.hy = f.y1; var done = f.done; B.fly = null; done && done(); }
      } else {
        var tx = B.hx + Math.sin(t / 420) * 14, ty = B.hy + Math.cos(t / 300) * 9;
        B.x += (tx - B.x) * Math.min(1, dt * 5); B.y += (ty - B.y) * Math.min(1, dt * 5);
      }
      var vx = (B.x - B.lastX) / Math.max(dt, 0.001); B.lastX = B.x;
      if (Math.abs(vx) > 40) B.dir = vx > 0 ? 1 : -1;
      B.tilt += (clamp(vx * 0.02, -16, 16) - B.tilt) * 0.2;
      bee.style.transform = 'translate(' + (B.x - 42) + 'px,' + (B.y - 34) + 'px) rotate(' + (B.tilt * B.dir).toFixed(1) + 'deg)';
      face.style.transform = 'scaleX(' + B.dir + ')';
      // малыши-пчёлки в финале
      for (var i = 0; i < babies.length; i++) {
        var bb = babies[i], a = t / 1000 * bb.sp + bb.ph;
        bb.x = W * 0.5 + Math.cos(a) * W * 0.36 * bb.rx; bb.y = H * 0.36 + Math.sin(a * 1.6) * H * 0.2 * bb.ry;
        bb.el.style.transform = 'translate(' + (bb.x - 22) + 'px,' + (bb.y - 18) + 'px) scaleX(' + (Math.cos(a) * bb.sp > 0 ? -1 : 1) + ')';
        if (Math.random() < 0.3) fx.trail(r.left + bb.x, r.top + bb.y, '#FFE9A0');
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    function flyTo(x, y, dur) {
      return new Promise(function (res) {
        var mx = (B.x + x) / 2, my = (B.y + y) / 2, dx = x - B.x, dy = y - B.y, len = Math.hypot(dx, dy) || 1;
        var off = Math.min(110, len * 0.35) * (Math.random() < 0.5 ? -1 : 1);
        B.fly = { x0: B.x, y0: B.y, x1: x, y1: y, cx: mx - dy / len * off, cy: my + dx / len * off - 20, t0: performance.now(), dur: dur || 700, done: res };
      });
    }

    /* --- цветы --- */
    // Каждый цветок живёт в своей ячейке: головки, подписи и перевод никогда не перекрываются
    function flowerArea() {
      var short = H < 520;
      var top = short ? listen.offsetTop + listen.offsetHeight + 8 : Math.max(H * 0.27, listen.offsetTop + listen.offsetHeight + 70);
      var bottom = H - (short ? 26 : Math.max(96, Math.min(130, H * 0.16)));
      return { x: 10, y: top, w: W - 20, h: Math.max(140, bottom - top) };
    }
    function layoutFlowers(list) {
      var g = api.cells(list.length, flowerArea(), 1.3, 12);
      D = clamp(g.size * 0.94, 60, 128);
      list.forEach(function (f, i) {
        var c = g.cells[f._slot != null ? f._slot : i];
        var freeX = Math.max(0, (c.w - D) / 2), freeY = Math.max(0, (c.h - D * 1.3) / 2);
        var x = c.cx + freeX * 0.55 * f._jx, y = c.y + freeY + D / 2 + freeY * 0.55 * f._jy;
        f.style.left = (x - D / 2) + 'px'; f.style.top = (y - D / 2) + 'px';
        f.style.width = D + 'px'; f.style.height = (H - (y - D / 2)) + 'px'; f.style.setProperty('--D', D + 'px');
        f.style.zIndex = 4 + c.row;
        var l = f.querySelector('.lbl');
        if (l) l.style.fontSize = Math.max(10, Math.min(D * 0.2, (D * 0.44) / (l.textContent.length * 0.56))) + 'px';
      });
    }
    function makeFlower(o, slot, hue, delay) {
      var f = el('button', 'flower'); f.type = 'button';
      f._slot = slot; f._jx = Math.random() * 2 - 1; f._jy = Math.random() * 2 - 1;
      f.style.cssText = '--del:' + (-Math.random() * 4).toFixed(2) + 's;--sw:' + ((Math.random() - 0.5) * 4).toFixed(1) + 'deg;animation-delay:' + delay + 's,0s';
      f.innerHTML = '<span class="stem"></span><span class="head">' + flowerHeadSVG(hue) + '</span>';
      if (o) {
        f.appendChild(el('span', 'lbl', o.w));
        if (o.zh) f.appendChild(el('span', 'zz zhline', o.zh));
        f.setAttribute('aria-label', o.w);
      }
      field.appendChild(f); return f;
    }
    function headCenter(f) { var r = f.querySelector('.head').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    function stagePos(c) { var r = stage.getBoundingClientRect(); return { x: c.x - r.left, y: c.y - r.top }; }

    function spawn() {
      target = steps[k]; wrong = 0;
      var pool = items.concat(decoys).filter(function (x) { return x.w.toLowerCase() !== target.w.toLowerCase(); });
      var opts = G.shuffle([target].concat(G.shuffle(pool).slice(0, nF - 1)));
      var hs = G.shuffle(FLOWER_HUES);
      flowers = opts.map(function (o, i) {
        var f = makeFlower(o, i, hs[i % hs.length], 0.1 + i * 0.12);
        f._ok = o.w.toLowerCase() === target.w.toLowerCase(); f._o = o;
        f.addEventListener('click', function () { onFlower(f); });
        return f;
      });
      layoutFlowers(flowers);
      setTimeout(function () { if (api.alive()) { api.speak(target); locked = false; } }, 600);
      resetIdle = api.idle(function () { hint(); });
    }

    listen.addEventListener('click', function () { G.ac(); if (target) { api.speak(target); listen.classList.remove('pulse'); } });

    function hint() {
      var good = flowers.filter(function (f) { return f._ok && !f.classList.contains('gone') && !f.classList.contains('nope'); })[0];
      if (!good || good.classList.contains('hint')) return;
      good.classList.add('hint'); api.hinted();
      var c = stagePos(headCenter(good));
      flyTo(c.x, c.y - D * 0.62, 650);
      var n = 0; clearInterval(hintTimer);
      hintTimer = setInterval(function () { var h = headCenter(good); fx.trail(h.x + fx.rnd(-D / 3, D / 3), h.y - fx.rnd(0, D * 0.6), '#FFF3B0'); if (++n > 36) clearInterval(hintTimer); }, 70);
      api.speak(target);
    }

    async function onFlower(f) {
      if (locked || !api.alive()) return;
      G.ac();
      var o = f._o;
      if (!f._ok) {
        wrong++;
        api.mistake(target.w, o.w, target.w);
        G.sfx.soft();
        var h = headCenter(f); fx.burst(h.x, h.y, { n: 10, shape: 'heart', speed: 140, g: 300, life: 1.1, size: 6, colors: ['#FFB3C7', '#FFE1EC'] });
        f.classList.add('nope'); f.disabled = true;
        face.animate([{ transform: 'scaleX(' + B.dir + ') rotate(0)' }, { transform: 'scaleX(' + B.dir + ') rotate(-18deg)' }, { transform: 'scaleX(' + B.dir + ') rotate(14deg)' }, { transform: 'scaleX(' + B.dir + ') rotate(0)' }], { duration: 480 });
        api.bubble('Bzzz? Listen again 再听听 👂', B.x, B.y - 30, 1700);
        api.speak(o);
        setTimeout(function () { if (api.alive()) api.speak(target); }, 1300);
        if (wrong >= api.settings.hintAfter) hint();
        if (resetIdle) resetIdle();
        return;
      }
      /* верный цветок */
      locked = true; clearInterval(hintTimer);
      f.classList.remove('hint');
      flowers.forEach(function (x) { if (x !== f) { x.classList.add('gone'); } });
      var c = stagePos(headCenter(f));
      await flyTo(c.x, c.y - D * 0.38, 720); if (!api.alive()) return;
      f.classList.add('sip');
      var hv = headCenter(f);
      G.sfx.good(); fx.sparkle(hv.x, hv.y, 18, ['#FFF3B0', '#FFD86B', '#FFFFFF']); fx.stars(hv.x, hv.y, 6);
      api.speak(target);
      api.bubble('<b>' + esc(target.w) + '</b>' + (target.zh ? '<small>' + esc(target.zh) + '</small>' : ''), B.x, B.y - 34, 1200);
      await sleep(760); if (!api.alive()) return;
      // несём нектар в банку
      var jr = jar.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      await flyTo(jr.left - sr.left + jr.width * 0.5, jr.top - sr.top - 22, 750); if (!api.alive()) return;
      k++; api.progress(k, N);
      jar.querySelector('.fill').style.setProperty('--lvl', (k / N).toFixed(3));
      jar.classList.remove('jig'); void jar.offsetWidth; jar.classList.add('jig');
      fx.burst(jr.left + jr.width / 2, jr.top + 8, { n: 12, shape: 'drop', speed: 180, g: 700, life: .9, size: 5, spread: 1.0, dir: -Math.PI / 2, colors: ['#FFD35A', '#FFB02E', '#FFE58A'] });
      G.sfx.pop();
      f.classList.add('gone');
      await sleep(300);
      flowers.forEach(function (x) { x.remove(); });
      if (k >= N) { finale(); return; }
      await flyTo(home().x, home().y, 650); if (!api.alive()) return;
      spawn();
    }

    /* --- финал --- */
    async function finale() {
      listen.style.display = 'none'; clearTimeout(0);
      jar.style.transition = 'transform .6s'; jar.style.transform = 'scale(1.35) translate(10px,-10px)';
      G.sfx.win();
      var rb = el('div'); rb.innerHTML = rainbowSVG(); stage.appendChild(rb.firstChild);
      fx.fireworks(6); fx.emojiRain(['🌸', '🌼', '🌷', '🍯', '✨', '🐝'], 26, 2.8);
      // праздничная клумба вдоль низа
      var hs = FLOWER_HUES, cnt = Math.max(7, Math.round(W / 62));
      for (var i = 0; i < cnt; i++) {
        (function (i) {
          setTimeout(function () {
            var x = W * (i + 0.5) / cnt, y = H * (0.66 + 0.1 * ((i * 7) % 3) / 2), d = clamp(W / cnt * 1.5, 60, 120);
            var f = makeFlower(null, 0, hs[i % hs.length], 0); f.classList.add('bloom'); f.style.pointerEvents = 'none';
            f.style.left = (x - d / 2) + 'px'; f.style.top = (y - d / 2) + 'px'; f.style.width = d + 'px'; f.style.height = (H - y + d / 2) + 'px'; f.style.setProperty('--D', d + 'px'); f.style.zIndex = 4 + (i % 3);
            var h = headCenter(f); fx.sparkle(h.x, h.y, 8);
          }, 350 + i * 140);
        })(i);
      }
      // малыши
      for (var b = 0; b < 6; b++) {
        var be = el('div', 'bee baby'); be.innerHTML = beeSVG(); stage.appendChild(be);
        babies.push({ el: be, sp: 0.7 + Math.random() * 0.5, ph: b * 1.05, rx: 0.6 + Math.random() * 0.4, ry: 0.6 + Math.random() * 0.4, x: W / 2, y: H / 2 });
      }
      await flyTo(W * 0.5, H * 0.3, 900); if (!api.alive()) return;
      api.bubble('Buzz buzz! Thank you! 谢谢你！💛', B.x, B.y - 34, 0);
      api.speak('Thank you!');
      for (var s = 0; s < 6; s++) setTimeout(function () { fx.hearts(B.x + stage.getBoundingClientRect().left, B.y + stage.getBoundingClientRect().top - 20, 4); }, s * 500);
      await sleep(5200); if (!api.alive()) return;
      api.hideBubble();
      api.complete(N);
    }

    api.onResize(function (w, h) {
      W = w; H = h;
      if (!B.fly) { B.hx = home().x; B.hy = home().y; }
      layoutFlowers(flowers.filter(function (f) { return f.isConnected; }));
    });
    api.progress(0, N);
    setTimeout(spawn, 500);
  }

  G.kit.create({
    id: 'bee', title: 'Bee Garden', zh: '小蜜蜂花园', emoji: '🐝', className: 'g-bee',
    blurb: 'Listen to the word and help the little bee find the right flower. Fill the honey jar and a rainbow appears! 听单词，帮小蜜蜂找到正确的花，装满蜂蜜罐，彩虹就会出现！',
    defaults: window.BEE_DEFAULTS, minWords: 3,
    albumLabel: 'My honey jars 我的蜂蜜罐', rewardTitle: 'A full honey jar! 获得蜂蜜罐！',
    reward: function (r) { return jarSVG(r.idx, 1); },
    play: play
  });
})();
