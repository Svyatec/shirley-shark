/* Bubble Spell — подводное правописание: лопай пузыри с буквами по порядку. Каждое слово дарит новую рыбку. */
(function () {
  'use strict';

  var G = window.Games, fx = G.fx, el = G.el, esc = G.kit.esc;
  var FISH_COLORS = [['#FF8A3D', '#FFD2A8'], ['#FF5E8A', '#FFC2D4'], ['#3EC6C0', '#B5F2EE'], ['#B58BFF', '#E3D4FF'], ['#FFD23F', '#FFF1B0'], ['#4FB5FF', '#C8E8FF'], ['#7ED957', '#D4F6C2']];
  var PEARLS = [['#FFFFFF', '#D9E8F5'], ['#FFE0EE', '#F4A8C8'], ['#FFF1C2', '#F0C55A'], ['#DDF4FF', '#8CCBF0'], ['#EDE2FF', '#B9A0F0'], ['#E2FFE9', '#8FD9A5']];
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function uid() { return 's' + Math.floor(Math.random() * 1e8); }
  function isLetter(ch) { return /[a-z0-9]/i.test(ch); }

  /* ---------- графика ---------- */
  function fishSVG(c) {
    return '<svg viewBox="0 0 80 50" aria-hidden="true">' +
      '<path class="tail" d="M18 25 L2 10 Q6 25 2 40 Z" fill="' + c[0] + '" stroke="rgba(0,0,0,.25)" stroke-width="2" stroke-linejoin="round"/>' +
      '<ellipse cx="44" cy="25" rx="28" ry="18" fill="' + c[0] + '" stroke="rgba(0,0,0,.25)" stroke-width="2"/>' +
      '<path d="M34 9 Q40 18 36 41 M46 8 Q52 18 48 42" stroke="' + c[1] + '" stroke-width="5" fill="none" opacity=".85"/>' +
      '<path d="M40 8 Q48 0 56 9" fill="' + c[0] + '" stroke="rgba(0,0,0,.2)" stroke-width="2"/>' +
      '<ellipse cx="50" cy="16" rx="12" ry="4" fill="#fff" opacity=".35"/>' +
      '<circle cx="60" cy="21" r="6" fill="#fff"/><circle cx="62" cy="21" r="3.3" fill="#2B2A4C"/><circle cx="63" cy="19.6" r="1.1" fill="#fff"/>' +
      '<path d="M64 31 Q67 33 70 31" stroke="#2B2A4C" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  }
  function weedSVG(h, c) {
    return '<svg viewBox="0 0 44 ' + h + '" preserveAspectRatio="none" aria-hidden="true"><path d="M22 ' + h + ' C 4 ' + h * 0.75 + ' 38 ' + h * 0.55 + ' 18 ' + h * 0.32 + ' C 6 ' + h * 0.18 + ' 30 ' + h * 0.08 + ' 22 0" stroke="' + c + '" stroke-width="9" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="12" cy="' + h * 0.6 + '" rx="9" ry="4" fill="' + c + '" transform="rotate(-30 12 ' + h * 0.6 + ')"/><ellipse cx="32" cy="' + h * 0.4 + '" rx="9" ry="4" fill="' + c + '" transform="rotate(30 32 ' + h * 0.4 + ')"/></svg>';
  }
  function sandSVG() {
    return '<svg viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6DFA4"/><stop offset="1" stop-color="#D9B26A"/></linearGradient></defs>' +
      '<path d="M0 30 C 60 10 120 40 200 22 C 280 6 340 34 400 20 L400 100 L0 100Z" fill="url(#sd)"/>' +
      '<g fill="#C79A55" opacity=".6"><circle cx="60" cy="60" r="3"/><circle cx="150" cy="72" r="2"/><circle cx="250" cy="58" r="3.5"/><circle cx="330" cy="76" r="2.5"/></g>' +
      '<path d="M210 70 l5 -12 l5 12 l12 1 l-9 8 l3 12 l-11 -6 l-11 6 l3 -12 l-9 -8z" fill="#FF8A6B" stroke="#E2523C" stroke-width="2" stroke-linejoin="round"/></svg>';
  }
  function octoSVG() {
    var id = uid(), arms = '';
    var xs = [26, 40, 54, 66, 80, 94];
    xs.forEach(function (x, i) {
      var bend = i % 2 ? 10 : -10;
      arms += '<path class="arm" d="M' + x + ' 92 C ' + (x + bend) + ' 112 ' + (x - bend) + ' 124 ' + (x + bend * 0.6) + ' 136 Q ' + (x + bend) + ' 142 ' + (x + bend * 1.4) + ' 136" stroke="url(#' + id + ')" stroke-width="12" fill="none" stroke-linecap="round"/>';
    });
    return '<svg viewBox="0 0 120 150" aria-hidden="true"><defs><radialGradient id="' + id + '" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#FFB8E0"/><stop offset=".6" stop-color="#E86AB8"/><stop offset="1" stop-color="#B8458F"/></radialGradient></defs>' +
      '<g>' + arms + '</g><g class="bodyg"><path d="M14 92 C 8 40 30 8 60 8 C 90 8 112 40 106 92 Z" fill="url(#' + id + ')" stroke="#9A3A78" stroke-width="3.5"/>' +
      '<ellipse cx="44" cy="30" rx="16" ry="8" fill="#fff" opacity=".35" transform="rotate(-20 44 30)"/>' +
      '<circle cx="44" cy="58" r="12" fill="#fff"/><circle cx="76" cy="58" r="12" fill="#fff"/><circle cx="46" cy="60" r="6.5" fill="#2B2A4C"/><circle cx="74" cy="60" r="6.5" fill="#2B2A4C"/>' +
      '<circle cx="48" cy="57" r="2.2" fill="#fff"/><circle cx="76" cy="57" r="2.2" fill="#fff"/>' +
      '<ellipse cx="30" cy="76" rx="7" ry="4.5" fill="#FF8FB0" opacity=".8"/><ellipse cx="90" cy="76" rx="7" ry="4.5" fill="#FF8FB0" opacity=".8"/>' +
      '<path d="M50 78 Q60 88 70 78" stroke="#7A2A5C" stroke-width="3.5" fill="none" stroke-linecap="round"/></g></svg>';
  }
  function chestSVG() {
    return '<svg viewBox="0 0 120 100" aria-hidden="true"><defs><radialGradient id="cg1"><stop offset="0" stop-color="#FFF6C8" stop-opacity=".95"/><stop offset="1" stop-color="#FFF6C8" stop-opacity="0"/></radialGradient></defs>' +
      '<ellipse class="glow" cx="60" cy="48" rx="70" ry="50" fill="url(#cg1)"/>' +
      '<rect x="10" y="48" width="100" height="46" rx="8" fill="#A2622C" stroke="#6E3E14" stroke-width="4"/>' +
      '<g fill="#FFF"><circle cx="40" cy="50" r="7" fill="#F4F0FF"/><circle cx="56" cy="46" r="8" fill="#FFE0EE"/><circle cx="74" cy="50" r="7" fill="#FFF1C2"/></g>' +
      '<rect x="10" y="62" width="100" height="8" fill="#F2B43C" stroke="#B87812" stroke-width="2"/><rect x="52" y="58" width="16" height="18" rx="3" fill="#FFD25A" stroke="#B87812" stroke-width="3"/>' +
      '<g class="lid"><path d="M10 50 Q10 22 60 20 Q110 22 110 50 Z" fill="#B8733A" stroke="#6E3E14" stroke-width="4" stroke-linejoin="round"/><path d="M14 44 Q60 32 106 44" stroke="#F2B43C" stroke-width="6" fill="none"/></g></svg>';
  }
  function pearlSVG(v) {
    var p = PEARLS[v % PEARLS.length], id = uid();
    return '<svg viewBox="0 0 120 100" overflow="visible" aria-hidden="true"><defs><radialGradient id="' + id + '" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="' + p[0] + '"/><stop offset="1" stop-color="' + p[1] + '"/></radialGradient>' +
      '<linearGradient id="h' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC2D9"/><stop offset="1" stop-color="#F08AB5"/></linearGradient></defs>' +
      '<path d="M8 66 Q60 108 112 66 Q86 80 60 80 Q34 80 8 66Z" fill="url(#h' + id + ')" stroke="#C0547F" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<path d="M8 62 Q14 14 60 10 Q106 14 112 62 Q86 52 60 52 Q34 52 8 62Z" fill="url(#h' + id + ')" stroke="#C0547F" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<path d="M30 52 Q32 30 40 18 M60 50 L60 12 M90 52 Q88 30 80 18" stroke="#C0547F" stroke-width="2.4" fill="none" opacity=".5"/>' +
      '<circle cx="60" cy="68" r="17" fill="url(#' + id + ')" stroke="rgba(0,0,0,.12)" stroke-width="2"/><circle cx="54" cy="62" r="5" fill="#fff" opacity=".8"/></svg>';
  }

  /* ---------- игра ---------- */
  function play(round, api) {
    var stage = api.stage, W = stage.clientWidth, H = stage.clientHeight;
    var words = G.shuffle(api.items), N = words.length;
    var extra = clamp(parseInt(api.settings.extraLetters, 10) || 0, 0, 4);
    var k = 0, pos = 0, wrong = 0, locked = true, bubbles = [], target = null, slotsEl = null, resetIdle, raf = 0, fishes = [], swirl = false;

    /* сцена */
    stage.innerHTML = '';
    stage.appendChild(el('div', 'rays')); stage.appendChild(el('div', 'surface'));
    [[3, 0.34, '#2FA46A'], [11, 0.24, '#3FBF7A'], [84, 0.3, '#2FA46A'], [92, 0.4, '#47C985']].forEach(function (w, i) {
      var d = el('div', 'weed'); d.style.left = w[0] + '%'; d.style.height = (H * w[1]) + 'px'; d.style.animationDelay = (-i * 0.9) + 's';
      d.innerHTML = weedSVG(Math.round(H * w[1]), w[2]); stage.appendChild(d);
    });
    var sand = el('div', 'sand'); sand.innerHTML = sandSVG(); stage.appendChild(sand);
    var chest = el('div', 'chest'); chest.innerHTML = chestSVG(); stage.appendChild(chest);
    var octo = el('div', 'octo'); octo.innerHTML = octoSVG(); stage.appendChild(octo);
    var card = el('div', 'card'); stage.appendChild(card);
    fx.startAmbient('bubbles', 18, function () { var r = stage.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    api.cleanup(function () { fx.stopAmbient(); cancelAnimationFrame(raf); });

    /* фоновые рыбки */
    function addFish(colorIdx, enter) {
      var f = el('div', 'fishy'); var size = 44 + Math.random() * 22; f.style.width = size + 'px';
      f.innerHTML = fishSVG(FISH_COLORS[colorIdx % FISH_COLORS.length]); stage.insertBefore(f, card);
      var y = H * (0.42 + Math.random() * 0.36), dy = (Math.random() - 0.5) * 60, a = -size, b = W;
      var dur = 13000 + Math.random() * 9000;
      var kf = [
        { transform: 'translate(' + a + 'px,' + y + 'px) scaleX(1)', offset: 0 },
        { transform: 'translate(' + b + 'px,' + (y + dy) + 'px) scaleX(1)', offset: 0.48 },
        { transform: 'translate(' + b + 'px,' + (y + dy) + 'px) scaleX(-1)', offset: 0.52 },
        { transform: 'translate(' + a + 'px,' + y + 'px) scaleX(-1)', offset: 0.98 },
        { transform: 'translate(' + a + 'px,' + y + 'px) scaleX(1)', offset: 1 }
      ];
      var an = f.animate(kf, { duration: dur, iterations: Infinity, delay: enter ? 0 : -Math.random() * dur });
      var obj = { el: f, an: an, size: size, x: 0, y: y };
      fishes.push(obj); return obj;
    }
    addFish(0, false); addFish(3, false);

    /* пузыри: свободное плавание + мягкое отталкивание */
    var areaTop = 0, areaBot = H * 0.8, BS = 60;
    function measureArea() {
      // offsetTop/offsetHeight — без учёта анимации появления карточки (она в этот момент уменьшена)
      areaTop = card.offsetTop + card.offsetHeight + 12; areaBot = H * 0.8;
      BS = clamp(Math.min(W * 0.17, (areaBot - areaTop) * 0.24), 50, 80);
    }
    function makeBubbles(letters) {
      bubbles.forEach(function (b) { b.el.remove(); }); bubbles = [];
      letters.forEach(function (ch, i) {
        var b = el('button', 'bub'); b.type = 'button';
        b.style.setProperty('--B', BS + 'px'); b.style.setProperty('--d', (-Math.random() * 2.6).toFixed(2) + 's');
        b.innerHTML = '<span>' + esc(ch) + '</span>'; b.setAttribute('aria-label', 'letter ' + ch);
        stage.appendChild(b);
        var o = { el: b, ch: ch, x: 0, y: 0, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 40, ph: Math.random() * 10, fly: null, gone: false };
        for (var t = 0; t < 40; t++) {
          o.x = BS / 2 + 6 + Math.random() * (W - BS - 12); o.y = areaTop + BS / 2 + Math.random() * Math.max(10, areaBot - areaTop - BS);
          if (bubbles.every(function (q) { return Math.hypot(q.x - o.x, q.y - o.y) > BS * 1.1; })) break;
        }
        b.animate([{ transform: 'translate(' + (o.x - BS / 2) + 'px,' + (H + 40) + 'px)' }, { transform: 'translate(' + (o.x - BS / 2) + 'px,' + (o.y - BS / 2) + 'px)' }], { duration: 700 + i * 60, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
        b.addEventListener('click', function () { onBubble(o); });
        bubbles.push(o);
      });
    }
    var lastT = 0;
    function loop(t) {
      var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
      var live = bubbles.filter(function (b) { return !b.gone; });
      live.forEach(function (b) {
        if (b.fly) {
          var f = b.fly, p = clamp((t - f.t0) / f.dur, 0, 1), e = 1 - Math.pow(1 - p, 3);
          b.x = f.x0 + (f.x1 - f.x0) * e; b.y = f.y0 + (f.y1 - f.y0) * e - Math.sin(p * Math.PI) * 50;
          var s = 1 - 0.45 * e;
          b.el.style.transform = 'translate(' + (b.x - BS / 2) + 'px,' + (b.y - BS / 2) + 'px) scale(' + s + ')';
          if (p >= 1) { b.gone = true; f.done(); }
          return;
        }
        var a = Math.sin(b.x * 0.01 + t / 1600 + b.ph) + Math.cos(b.y * 0.012 - t / 2100);
        b.vx += Math.cos(a * Math.PI) * 14 * dt; b.vy += Math.sin(a * Math.PI) * 14 * dt - 2 * dt;
        live.forEach(function (q) {
          if (q === b || q.fly) return;
          var dx = b.x - q.x, dy = b.y - q.y, d = Math.hypot(dx, dy) || 1, min = BS * 1.05;
          if (d < min) { var push = (min - d) * 3 * dt; b.vx += dx / d * push * 30; b.vy += dy / d * push * 30; }
        });
        var sp = Math.hypot(b.vx, b.vy), max = 46;
        if (sp > max) { b.vx *= max / sp; b.vy *= max / sp; }
        b.x += b.vx * dt; b.y += b.vy * dt;
        var r = BS / 2;
        if (b.x < r + 4) { b.x = r + 4; b.vx = Math.abs(b.vx); } if (b.x > W - r - 4) { b.x = W - r - 4; b.vx = -Math.abs(b.vx); }
        if (b.y < areaTop + r) { b.y = areaTop + r; b.vy = Math.abs(b.vy); } if (b.y > areaBot - r) { b.y = areaBot - r; b.vy = -Math.abs(b.vy); }
        if (!b.el.getAnimations().length) b.el.style.transform = 'translate(' + (b.x - r) + 'px,' + (b.y - r) + 'px)';
      });
      if (swirl) {
        fishes.forEach(function (f, i) {
          var ang = t / 1000 * 1.1 + i * (Math.PI * 2 / fishes.length), R = Math.min(W, H) * 0.3;
          var x = W / 2 + Math.cos(ang) * R - f.size / 2, y = H * 0.42 + Math.sin(ang) * R * 0.6;
          f.el.style.transform = 'translate(' + x + 'px,' + y + 'px) scaleX(' + (Math.sin(ang) > 0 ? -1 : 1) + ')';
        });
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    /* слово */
    function startWord() {
      target = words[k]; pos = 0; wrong = 0;
      var chars = target.w.split('');
      var hasPic = !!target.e;
      card.className = 'card'; void card.offsetWidth; card.classList.add('pop');
      card.innerHTML = (hasPic ? '<div class="pic">' + target.e + '</div>' : '') +
        (target.zh ? '<div class="zhtxt' + (hasPic ? ' zhline' : '') + '">' + esc(target.zh) + '</div>' : '') +
        '<div class="slots"></div><button class="ear" type="button" aria-label="Listen">🔊</button>';
      slotsEl = card.querySelector('.slots');
      var S = clamp(Math.floor((Math.min(W * 0.92, 520) - 40) / chars.length) - 6, 26, 50);
      slotsEl.style.setProperty('--S', S + 'px');
      chars.forEach(function (ch) {
        var s = el('div', 'slot' + (isLetter(ch) ? '' : ' space on'));
        if (!isLetter(ch)) s.textContent = ch === ' ' ? '' : ch;
        slotsEl.appendChild(s);
      });
      card.querySelector('.ear').addEventListener('click', function () { G.ac(); api.speak(target); });
      skipNonLetters(); markNext();
      measureArea();
      var letters = chars.filter(isLetter);
      var abc = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(function (c) { return target.w.toLowerCase().indexOf(c) < 0; });
      var extras = G.shuffle(abc).slice(0, extra);
      var upper = target.w === target.w.toUpperCase() && /[A-Z]/.test(target.w);
      makeBubbles(G.shuffle(letters.concat(extras.map(function (c) { return upper ? c.toUpperCase() : c; }))));
      setTimeout(function () { if (api.alive()) { api.speak(target); locked = false; } }, 650);
      resetIdle = api.idle(hint);
    }
    function skipNonLetters() { var ch = target.w.split(''); while (pos < ch.length && !isLetter(ch[pos])) pos++; }
    function markNext() {
      var ss = slotsEl.children;
      for (var i = 0; i < ss.length; i++) ss[i].classList.toggle('next', i === pos);
    }
    function need() { return target.w.charAt(pos); }

    function hint() {
      var n = need().toLowerCase();
      var b = bubbles.filter(function (q) { return !q.gone && !q.fly && q.ch.toLowerCase() === n; })[0];
      if (!b || b.el.classList.contains('hint')) return;
      b.el.classList.add('hint'); api.hinted();
      var c = fx.center(b.el); fx.ring(c.x, c.y, '#FFE066', 10); fx.sparkle(c.x, c.y, 10);
    }

    function onBubble(b) {
      if (locked || b.gone || b.fly || !api.alive()) return;
      G.ac();
      if (b.ch.toLowerCase() === need().toLowerCase()) { take(b); return; }
      wrong++;
      api.mistake(target.w, b.ch, need());
      G.sfx.soft();
      b.el.classList.remove('nope'); void b.el.offsetWidth; b.el.classList.add('nope');
      b.vx = (Math.random() - 0.5) * 160; b.vy = -60;
      var c = fx.center(b.el); fx.bubbles(c.x, c.y, 5);
      var oc = fx.center(octo), sr = stage.getBoundingClientRect();
      api.bubble('Oops! 不对哦 🐙', oc.x - sr.left, oc.y - sr.top - oc.h * 0.45, 1300);
      if (wrong >= api.settings.hintAfter) hint();
      if (resetIdle) resetIdle();
    }

    function take(b) {
      wrong = 0;
      var slot = slotsEl.children[pos], sr = stage.getBoundingClientRect(), r = slot.getBoundingClientRect();
      var idx = pos;
      pos++; skipNonLetters();
      b.el.classList.remove('hint'); b.el.style.pointerEvents = 'none';
      b.fly = { x0: b.x, y0: b.y, x1: r.left - sr.left + r.width / 2, y1: r.top - sr.top + r.height / 2, t0: performance.now(), dur: 420, done: function () {
        b.el.remove();
        slot.textContent = target.w.charAt(idx); slot.classList.add('on'); slot.classList.remove('next');
        fx.bubbles(r.left + r.width / 2, r.top + r.height / 2, 6); fx.sparkle(r.left + r.width / 2, r.top + r.height / 2, 8);
        G.tone(523.25 * Math.pow(2, Math.min(idx, 12) / 12 * 2), 0, 0.16, 'sine', 0.12);
        if (pos >= target.w.length) wordDone(); else markNext();
      } };
      G.sfx.pop();
      if (resetIdle) resetIdle();
    }

    async function wordDone() {
      locked = true;
      var t = target;
      slotsEl.classList.add('win');
      Array.prototype.forEach.call(slotsEl.children, function (s, i) { s.style.animationDelay = (i * 0.07) + 's'; });
      G.sfx.good(); api.speak(t);
      var cr = card.getBoundingClientRect();
      fx.stars(cr.left + cr.width / 2, cr.top + cr.height * 0.6, 12);
      bubbles.forEach(function (b) { if (!b.gone) { var c = fx.center(b.el); fx.bubbles(c.x, c.y, 4); b.el.style.transition = 'opacity .3s'; b.el.style.opacity = 0; b.gone = true; } });
      k++; api.progress(k, N);
      await sleep(500); if (!api.alive()) return;
      var f = addFish(k + 1, true);
      var oc = fx.center(octo), sr = stage.getBoundingClientRect();
      api.bubble('<b>' + esc(t.w) + '</b>' + (t.zh ? '<small>' + esc(t.zh) + '</small>' : '') + '<small>A new fish friend! 新朋友！</small>', oc.x - sr.left, oc.y - sr.top - oc.h * 0.45, 1500);
      await sleep(1500); if (!api.alive()) return;
      if (k >= N) { finale(); return; }
      startWord();
    }

    async function finale() {
      card.style.transition = 'opacity .5s, transform .5s'; card.style.opacity = 0; card.style.transform = 'translateX(-50%) translateY(-30px)';
      fishes.forEach(function (f) { f.an.cancel(); }); swirl = true;
      G.sfx.win();
      await sleep(700); if (!api.alive()) return;
      chest.classList.add('open');
      var c = fx.center(chest);
      G.sfx.sparkle();
      fx.burst(c.x, c.y - c.h * 0.2, { n: 24, shape: 'bubble', speed: 300, g: -200, drag: 1, life: 2.2, size: 9, spread: 0.9, dir: -Math.PI / 2, colors: ['#FFFFFF', '#FFE0EE', '#FFF1C2', '#DDF4FF'] });
      fx.stars(c.x, c.y - c.h * 0.3, 16);
      octo.classList.add('dance');
      for (var i = 0; i < 6; i++) setTimeout(function () { var x = fx.rnd(W * 0.15, W * 0.85), sr = stage.getBoundingClientRect(); fx.bubbles(sr.left + x, sr.top + fx.rnd(H * 0.3, H * 0.7), 14); fx.sparkle(sr.left + x, sr.top + H * 0.4, 10); }, i * 380);
      fx.emojiRain(words.map(function (w) { return w.e; }).filter(Boolean).concat(['🫧', '✨', '🐚']), 22, 2.5);
      await sleep(800); if (!api.alive()) return;
      var oc = fx.center(octo), sr = stage.getBoundingClientRect();
      api.bubble('Thank you! 谢谢你！💜', oc.x - sr.left - 30, oc.y - sr.top - oc.h * 0.55, 0);
      api.speak('Thank you!');
      await sleep(4200); if (!api.alive()) return;
      api.hideBubble();
      api.complete(N);
    }

    api.progress(0, N);
    setTimeout(startWord, 400);
  }

  G.kit.create({
    id: 'spell', title: 'Bubble Spell', zh: '泡泡拼单词', emoji: '🫧', className: 'g-spell',
    blurb: 'Look, listen and pop the letter bubbles in the right order to spell the word. Every word brings a new fish friend! 看图、听音，按顺序点泡泡里的字母拼出单词，每拼对一个词就来一条新小鱼！',
    defaults: window.SPELL_DEFAULTS, minWords: 1,
    albumLabel: 'My pearls 我的珍珠', rewardTitle: 'A shiny pearl! 获得珍珠！',
    reward: function (r) { return pearlSVG(r.idx); },
    play: play
  });
})();
