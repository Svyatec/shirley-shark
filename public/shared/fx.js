/*
 * Общий движок эффектов: частицы на canvas поверх страницы (конфетти, искры, звёзды, сердечки,
 * пузыри, кольца, фейерверки, эмодзи-дождь), тряска элементов, парящие светлячки.
 * Подключение: <script src="../shared/fx.js"></script> — после core.js. API: Games.fx.*
 * Все координаты — в пикселях окна (clientX/clientY, getBoundingClientRect).
 */
(function (global) {
  'use strict';

  var canvas, ctx, dpr = 1, W = 0, H = 0, parts = [], raf = 0, last = 0, ambient = null;
  var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PAL = ['#FF6F59', '#FFC93C', '#5BC16C', '#4FB5FF', '#B58BFF', '#FF8FAB', '#4FD6B0'];

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function ensure() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:90';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    global.addEventListener('resize', resize);
  }
  function resize() {
    dpr = Math.min(2, global.devicePixelRatio || 1);
    W = global.innerWidth; H = global.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  /* ---------- отрисовка форм ---------- */
  function star(c, r, spikes) {
    c.beginPath();
    for (var i = 0; i < spikes * 2; i++) {
      var rr = i % 2 ? r * 0.45 : r, a = Math.PI * i / spikes - Math.PI / 2;
      c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath(); c.fill();
  }
  function heart(c, r) {
    c.beginPath();
    c.moveTo(0, r * 0.35);
    c.bezierCurveTo(-r, -r * 0.2, -r * 0.5, -r, 0, -r * 0.4);
    c.bezierCurveTo(r * 0.5, -r, r, -r * 0.2, 0, r * 0.35);
    c.fill();
  }
  function drawPart(p) {
    var a = Math.max(0, Math.min(1, p.life / p.max));
    var alpha = p.fade === false ? 1 : (a < 0.35 ? a / 0.35 : 1);
    ctx.save();
    ctx.globalAlpha = alpha * (p.alpha == null ? 1 : p.alpha);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    var s = p.size * (p.grow ? (1 + (1 - a) * p.grow) : 1);
    ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
    switch (p.shape) {
      case 'confetti': ctx.scale(1, Math.abs(Math.cos(p.flip))); ctx.fillRect(-s, -s * 0.5, s * 2, s); break;
      case 'star': ctx.globalCompositeOperation = 'lighter'; star(ctx, s, 5); break;
      case 'spark':
        ctx.globalCompositeOperation = 'lighter';
        var g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 2.2);
        g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s * 2.2, 0, 7); ctx.fill();
        break;
      case 'heart': heart(ctx, s); break;
      case 'bubble':
        ctx.lineWidth = 2; ctx.globalAlpha *= 0.85; ctx.beginPath(); ctx.arc(0, 0, s, 0, 7); ctx.stroke();
        ctx.globalAlpha *= 0.35; ctx.fill();
        ctx.globalAlpha = alpha * 0.9; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-s * 0.35, -s * 0.35, s * 0.22, 0, 7); ctx.fill();
        break;
      case 'ring':
        ctx.lineWidth = Math.max(1, p.lw * a); ctx.beginPath(); ctx.arc(0, 0, s, 0, 7); ctx.stroke(); break;
      case 'drop': ctx.beginPath(); ctx.ellipse(0, 0, s * 0.6, s, 0, 0, 7); ctx.fill(); break;
      case 'emoji': ctx.font = Math.round(s * 2) + 'px system-ui,"Apple Color Emoji","Segoe UI Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.emoji, 0, 0); break;
      default: ctx.beginPath(); ctx.arc(0, 0, s, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  function frame(t) {
    var dt = Math.min(0.05, (t - last) / 1000); last = t;
    ctx.clearRect(0, 0, W, H);
    if (ambient) ambient(dt, ctx, W, H);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.vx *= (1 - p.drag * dt); p.vy *= (1 - p.drag * dt);
      if (p.wob) p.vx += Math.sin(t / 300 + p.seed) * p.wob * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.flip += p.vf * dt;
      if (p.grow && p.shape === 'ring') p.size += p.grow * dt * 60;
      drawPart(p);
    }
    if (parts.length || ambient) raf = requestAnimationFrame(frame); else { raf = 0; ctx.clearRect(0, 0, W, H); }
  }

  function add(o) {
    if (reduce && parts.length > 40) return;
    ensure();
    parts.push({
      x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0, g: o.g || 0, drag: o.drag || 0,
      size: o.size || 5, color: o.color || '#fff', shape: o.shape || 'dot', emoji: o.emoji,
      life: o.life || 1, max: o.life || 1, rot: o.rot || 0, vr: o.vr || 0, flip: rnd(0, 6), vf: o.vf || 0,
      wob: o.wob || 0, seed: Math.random() * 10, grow: o.grow || 0, lw: o.lw || 4, alpha: o.alpha, fade: o.fade
    });
    kick();
  }

  /* ---------- публичные эффекты ---------- */
  // burst(x, y, { n, shape, colors, speed, g, life, size, emoji, spread })
  function burst(x, y, o) {
    o = o || {};
    var n = o.n || 24, cols = o.colors || PAL;
    for (var i = 0; i < n; i++) {
      var a = o.spread != null ? (o.dir || -Math.PI / 2) + rnd(-o.spread, o.spread) : rnd(0, Math.PI * 2);
      var sp = (o.speed || 260) * rnd(0.35, 1);
      add({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: o.g == null ? 420 : o.g, drag: o.drag == null ? 0.9 : o.drag,
        size: (o.size || 6) * rnd(0.6, 1.3), color: pick(cols), shape: o.shape || 'confetti',
        life: (o.life || 1.3) * rnd(0.7, 1.2), vr: rnd(-8, 8), vf: rnd(6, 14), emoji: o.emoji, wob: o.wob || 0
      });
    }
  }
  function confetti(x, y, n) { burst(x, y, { n: n || 40, shape: 'confetti', speed: 520, g: 700, life: 2 }); }
  function sparkle(x, y, n, colors) { burst(x, y, { n: n || 14, shape: 'spark', speed: 180, g: -20, drag: 2.2, life: 0.9, size: 5, colors: colors || ['#FFF3B0', '#FFD86B', '#FFFFFF'] }); }
  function stars(x, y, n) { burst(x, y, { n: n || 12, shape: 'star', speed: 320, g: 260, drag: 1.4, life: 1.1, size: 9, colors: ['#FFE066', '#FFC93C', '#FFFFFF'] }); }
  function hearts(x, y, n) { burst(x, y, { n: n || 10, shape: 'heart', speed: 200, g: -160, drag: 1.2, life: 1.6, size: 10, colors: ['#FF6F8E', '#FF8FAB', '#FFB3C7'], wob: 80 }); }
  function bubbles(x, y, n, colors) { burst(x, y, { n: n || 12, shape: 'bubble', speed: 120, g: -120, drag: 1.1, life: 1.8, size: 9, colors: colors || ['#BEE8FF', '#E6F7FF', '#CFF2B0'], wob: 60 }); }
  function splash(x, y, n) { burst(x, y, { n: n || 14, shape: 'drop', speed: 330, g: 900, drag: 0.4, life: 0.9, size: 6, spread: 1.1, dir: -Math.PI / 2, colors: ['#BDEBFF', '#FFFFFF', '#7FD3F5'] }); }
  function ring(x, y, color, size) { add({ x: x, y: y, shape: 'ring', size: size || 10, grow: 2.4, life: 0.8, color: color || '#FFFFFF', lw: 5 }); }
  function emojiRain(emojis, n, dur) {
    ensure();
    for (var i = 0; i < (n || 24); i++) {
      (function (d) {
        setTimeout(function () {
          add({ x: rnd(0, W), y: -30, vx: rnd(-30, 30), vy: rnd(80, 200), g: 40, size: rnd(14, 24), shape: 'emoji', emoji: pick(emojis), life: 5, vr: rnd(-1, 1), fade: false, wob: 30 });
        }, d);
      })(rnd(0, (dur || 2) * 1000));
    }
  }
  // Фейерверк: расходящаяся звезда + мерцающий хвост
  function firework(x, y, colors) {
    colors = colors || PAL;
    var c = pick(colors);
    ring(x, y, c, 6);
    for (var i = 0; i < 46; i++) {
      var a = (i / 46) * Math.PI * 2, sp = rnd(160, 300);
      add({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 220, drag: 1.5, size: rnd(2.5, 4.5), color: i % 3 ? c : '#FFFFFF', shape: 'spark', life: rnd(1.1, 1.7) });
    }
    for (var j = 0; j < 8; j++) add({ x: x, y: y, vx: rnd(-90, 90), vy: rnd(-120, 40), g: 260, drag: 1, size: 7, color: '#FFE066', shape: 'star', life: 1.4, vr: rnd(-4, 4) });
  }
  function fireworks(n, area) {
    ensure(); area = area || { x: W * 0.15, y: H * 0.1, w: W * 0.7, h: H * 0.35 };
    for (var i = 0; i < (n || 6); i++) {
      (function (d) { setTimeout(function () { firework(area.x + Math.random() * area.w, area.y + Math.random() * area.h); }, d); })(i * 380 + rnd(0, 200));
    }
  }
  function rainConfetti(sec) {
    ensure();
    var t0 = performance.now();
    (function tick() {
      var e = (performance.now() - t0) / 1000; if (e > (sec || 2.5)) return;
      for (var i = 0; i < 3; i++) add({ x: rnd(0, W), y: -10, vx: rnd(-40, 40), vy: rnd(120, 260), g: 80, size: rnd(4, 8), color: pick(PAL), shape: 'confetti', life: 4, vr: rnd(-5, 5), vf: rnd(6, 14), fade: false, wob: 60 });
      setTimeout(tick, 60);
    })();
  }
  // Светлячки: шлейф лёгких огоньков вдоль точки (для подсказок и следа полёта)
  function trail(x, y, color) { add({ x: x + rnd(-4, 4), y: y + rnd(-4, 4), vx: rnd(-20, 20), vy: rnd(-30, 10), drag: 1, size: rnd(2.5, 5), color: color || '#FFF3B0', shape: 'spark', life: rnd(0.5, 0.9) }); }

  // Постоянный фон из светлячков / пыльцы / пузырьков, живёт пока не вызван stopAmbient.
  // kind: 'fireflies' | 'pollen' | 'bubbles' | 'stars'
  function startAmbient(kind, count, region) {
    ensure();
    var items = [], n = count || 22;
    var col = { fireflies: '#E8FF8A', pollen: '#FFF1A8', bubbles: '#E6F7FF', stars: '#FFFFFF' }[kind] || '#FFFFFF';
    function reg() { return region ? region() : { x: 0, y: 0, w: W, h: H }; }
    for (var i = 0; i < n; i++) { var r = reg(); items.push({ x: r.x + Math.random() * r.w, y: r.y + Math.random() * r.h, ph: Math.random() * 10, sp: rnd(0.4, 1.1), sz: rnd(1.5, 3.6) }); }
    ambient = function (dt, c) {
      var now = performance.now() / 1000, r = reg();
      c.save();
      c.globalCompositeOperation = 'lighter';
      items.forEach(function (it) {
        var a, vx, vy;
        // псевдо-поле течения: направление зависит от положения и времени (мягкие петли)
        a = Math.sin(it.x * 0.006 + now * 0.35 + it.ph) * Math.PI + Math.cos(it.y * 0.007 - now * 0.25) * Math.PI;
        vx = Math.cos(a) * 24 * it.sp; vy = Math.sin(a) * 24 * it.sp - (kind === 'bubbles' ? 18 : 0);
        it.x += vx * dt; it.y += vy * dt;
        if (it.x < r.x - 20) it.x = r.x + r.w + 10; if (it.x > r.x + r.w + 20) it.x = r.x - 10;
        if (it.y < r.y - 20) it.y = r.y + r.h + 10; if (it.y > r.y + r.h + 20) it.y = r.y - 10;
        var tw = kind === 'stars' ? 0.35 + 0.65 * Math.abs(Math.sin(now * 1.6 + it.ph)) : 0.4 + 0.6 * Math.abs(Math.sin(now * 1.3 * it.sp + it.ph));
        var rad = it.sz * (kind === 'bubbles' ? 3 : kind === 'stars' ? 1.6 : 4);
        var g = c.createRadialGradient(it.x, it.y, 0, it.x, it.y, rad * 2.4);
        g.addColorStop(0, col); g.addColorStop(0.35, col.replace('#', '#') + '88'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.globalAlpha = tw * 0.85; c.fillStyle = g; c.beginPath(); c.arc(it.x, it.y, rad * 2.4, 0, 7); c.fill();
        c.globalAlpha = tw; c.fillStyle = '#fff'; c.beginPath(); c.arc(it.x, it.y, it.sz * 0.55, 0, 7); c.fill();
      });
      c.restore();
    };
    kick();
  }
  function stopAmbient() { ambient = null; }

  /* ---------- DOM-эффекты ---------- */
  function shake(el, ms, px) {
    if (!el || !el.animate || reduce) return;
    px = px || 8;
    el.animate([
      { transform: 'translate(0,0)' }, { transform: 'translate(' + -px + 'px,' + px / 3 + 'px) rotate(-1deg)' },
      { transform: 'translate(' + px + 'px,' + -px / 3 + 'px) rotate(1deg)' }, { transform: 'translate(' + -px / 2 + 'px,0)' }, { transform: 'translate(0,0)' }
    ], { duration: ms || 420, easing: 'ease-in-out' });
  }
  // «Резиновый» прыжок: сжатие-растяжение элемента
  function squash(el, ms) {
    if (!el || !el.animate) return;
    el.animate([
      { transform: 'scale(1,1)' }, { transform: 'scale(1.25,.75)', offset: 0.25 }, { transform: 'scale(.88,1.15)', offset: 0.55 }, { transform: 'scale(1,1)' }
    ], { duration: ms || 420, easing: 'ease-out' });
  }
  function center(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  }
  function clear() { parts.length = 0; }

  global.Games = global.Games || {};
  global.Games.fx = {
    burst: burst, confetti: confetti, sparkle: sparkle, stars: stars, hearts: hearts, bubbles: bubbles, splash: splash, ring: ring,
    emojiRain: emojiRain, firework: firework, fireworks: fireworks, rainConfetti: rainConfetti, trail: trail,
    startAmbient: startAmbient, stopAmbient: stopAmbient, shake: shake, squash: squash, center: center, clear: clear,
    palette: PAL, rnd: rnd, pick: pick
  };
})(window);
