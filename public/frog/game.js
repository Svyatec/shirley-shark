/* Lily Hop — лунный пруд: смотри на картинку, прыгай на кувшинку с нужным словом. Без проигрыша. */
(function () {
  'use strict';

  var G = window.Games, fx = G.fx, el = G.el;

  var SKY_SVG =
    '<svg viewBox="0 0 400 130" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
    '<defs><radialGradient id="moon" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#FFFDF0"/><stop offset="1" stop-color="#FFE9A8"/></radialGradient>' +
    '<radialGradient id="halo"><stop offset="0" stop-color="#FFF3C4" stop-opacity=".55"/><stop offset="1" stop-color="#FFF3C4" stop-opacity="0"/></radialGradient></defs>' +
    '<g fill="#fff"><circle class="star" cx="30" cy="20" r="1.3"/><circle class="star" cx="86" cy="42" r="1"/><circle class="star" cx="150" cy="14" r="1.4"/>' +
    '<circle class="star" cx="250" cy="28" r="1.1"/><circle class="star" cx="320" cy="16" r="1.5"/><circle class="star" cx="372" cy="44" r="1"/><circle class="star" cx="205" cy="52" r="1"/><circle class="star" cx="60" cy="70" r=".9"/></g>' +
    '<circle cx="300" cy="46" r="62" fill="url(#halo)"/><circle cx="300" cy="46" r="24" fill="url(#moon)"/>' +
    '<g fill="#F3DD9A" opacity=".55"><circle cx="292" cy="40" r="5"/><circle cx="308" cy="54" r="3.4"/><circle cx="300" cy="34" r="2.2"/></g>' +
    '<path d="M0 100 C 40 70 80 96 130 78 C 190 58 230 92 290 76 C 340 64 370 84 400 70 L400 130 L0 130 Z" fill="#0C2A4A"/>' +
    '<path d="M0 112 C 50 92 100 112 160 100 C 220 88 280 112 340 98 C 370 92 390 100 400 96 L400 130 L0 130 Z" fill="#0A2240"/>' +
    '<g fill="#08203A"><path d="M24 112 L34 76 L44 112Z"/><path d="M40 112 L52 66 L64 112Z"/><path d="M340 108 L350 80 L360 108Z"/><path d="M356 108 L368 70 L380 108Z"/></g>' +
    '</svg>';

  function frogSVG() {
    return '<div class="inner"><svg viewBox="0 0 120 110" aria-hidden="true">' +
      '<defs><radialGradient id="fg" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#B6F08A"/><stop offset=".55" stop-color="#58C45E"/><stop offset="1" stop-color="#2E9A4E"/></radialGradient>' +
      '<radialGradient id="fb" cx="50%" cy="30%" r="70%"><stop offset="0" stop-color="#F6FFD0"/><stop offset="1" stop-color="#C9EE97"/></radialGradient></defs>' +
      '<ellipse cx="60" cy="102" rx="38" ry="6" fill="rgba(0,30,20,.3)"/>' +
      // задние лапы
      '<path d="M22 86 Q4 92 8 102 Q22 106 36 98 Z" fill="#3DAA58" stroke="#23773B" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M98 86 Q116 92 112 102 Q98 106 84 98 Z" fill="#3DAA58" stroke="#23773B" stroke-width="3" stroke-linejoin="round"/>' +
      // тело
      '<ellipse cx="60" cy="72" rx="40" ry="32" fill="url(#fg)" stroke="#23773B" stroke-width="3.5"/>' +
      '<ellipse cx="60" cy="82" rx="24" ry="19" fill="url(#fb)"/>' +
      // передние лапки
      '<ellipse cx="34" cy="97" rx="11" ry="6.5" fill="#6CCB62" stroke="#23773B" stroke-width="3"/><ellipse cx="86" cy="97" rx="11" ry="6.5" fill="#6CCB62" stroke="#23773B" stroke-width="3"/>' +
      // глаза
      '<circle cx="38" cy="38" r="17" fill="url(#fg)" stroke="#23773B" stroke-width="3.5"/><circle cx="82" cy="38" r="17" fill="url(#fg)" stroke="#23773B" stroke-width="3.5"/>' +
      '<circle cx="38" cy="39" r="12.5" fill="#fff"/><circle cx="82" cy="39" r="12.5" fill="#fff"/>' +
      '<circle cx="40" cy="41" r="7" fill="#2B2A4C"/><circle cx="80" cy="41" r="7" fill="#2B2A4C"/>' +
      '<circle cx="43" cy="38" r="2.6" fill="#fff"/><circle cx="83" cy="38" r="2.6" fill="#fff"/>' +
      '<g class="lid"><circle cx="38" cy="39" r="12.8" fill="#58C45E"/><circle cx="82" cy="39" r="12.8" fill="#58C45E"/></g>' +
      // щёчки и улыбка
      '<ellipse cx="26" cy="68" rx="8" ry="5" fill="#FF9AA8" opacity=".7"/><ellipse cx="94" cy="68" rx="8" ry="5" fill="#FF9AA8" opacity=".7"/>' +
      '<path d="M40 64 Q60 80 80 64" stroke="#23773B" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="53" cy="55" r="1.8" fill="#23773B"/><circle cx="67" cy="55" r="1.8" fill="#23773B"/>' +
      '</svg></div>';
  }

  function crownSVG(hue) {
    var g1 = 'hsl(' + hue + ',90%,62%)', g2 = 'hsl(' + ((hue + 120) % 360) + ',85%,60%)', g3 = 'hsl(' + ((hue + 220) % 360) + ',85%,62%)';
    return '<svg viewBox="0 0 120 100" overflow="visible" aria-hidden="true">' +
      '<defs><linearGradient id="cr' + hue + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE98A"/><stop offset=".6" stop-color="#FFC93C"/><stop offset="1" stop-color="#E69A12"/></linearGradient></defs>' +
      '<path d="M12 84 L6 28 L36 52 L60 14 L84 52 L114 28 L108 84 Z" fill="url(#cr' + hue + ')" stroke="#B8780A" stroke-width="4" stroke-linejoin="round"/>' +
      '<rect x="12" y="76" width="96" height="16" rx="6" fill="#FFD25A" stroke="#B8780A" stroke-width="4"/>' +
      '<circle cx="6" cy="26" r="7" fill="' + g1 + '" stroke="#B8780A" stroke-width="3"/><circle cx="60" cy="12" r="8" fill="' + g2 + '" stroke="#B8780A" stroke-width="3"/><circle cx="114" cy="26" r="7" fill="' + g3 + '" stroke="#B8780A" stroke-width="3"/>' +
      '<circle cx="36" cy="84" r="4.5" fill="' + g2 + '"/><circle cx="60" cy="84" r="4.5" fill="' + g1 + '"/><circle cx="84" cy="84" r="4.5" fill="' + g3 + '"/>' +
      '<path d="M20 40 Q22 60 26 72" stroke="#fff" stroke-width="3" opacity=".5" fill="none" stroke-linecap="round"/></svg>';
  }
  var HUES = [45, 330, 200, 15, 270, 150, 95, 230];

  function padSVG(rot, hue) {
    var a1 = rot * Math.PI / 180, a2 = (rot + 30) * Math.PI / 180, r = 47;
    var x1 = 50 + r * Math.cos(a1), y1 = 50 + r * Math.sin(a1), x2 = 50 + r * Math.cos(a2), y2 = 50 + r * Math.sin(a2);
    var id = 'pg' + Math.floor(Math.random() * 1e6);
    var d = 'M50 50 L' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ' A47 47 0 1 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' Z';
    var veins = '';
    for (var i = 0; i < 7; i++) { var a = a2 + (i + 0.6) * (330 / 7) * Math.PI / 180; veins += 'M50 50 L' + (50 + 40 * Math.cos(a)).toFixed(1) + ' ' + (50 + 40 * Math.sin(a)).toFixed(1) + ' '; }
    return '<svg class="disc" viewBox="0 0 100 100" style="filter:hue-rotate(' + hue + 'deg)" aria-hidden="true"><defs>' +
      '<radialGradient id="' + id + '" cx="40%" cy="32%" r="80%"><stop offset="0" stop-color="#9CF08F"/><stop offset=".55" stop-color="#46BE6A"/><stop offset="1" stop-color="#1E8A52"/></radialGradient></defs>' +
      '<ellipse cx="52" cy="58" rx="46" ry="40" fill="rgba(0,0,0,.18)"/>' +
      '<path d="' + d + '" fill="url(#' + id + ')" stroke="#146A3E" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<path d="' + veins + '" stroke="#1E8A52" stroke-width="1.6" opacity=".55" stroke-linecap="round" fill="none"/>' +
      '<ellipse cx="36" cy="30" rx="18" ry="8" fill="#fff" opacity=".28" transform="rotate(-25 36 30)"/></svg>';
  }

  function lotusSVG() {
    var petals = '';
    for (var i = 0; i < 8; i++) {
      var a = -90 + (i - 3.5) * 24, scale = 1 - Math.abs(i - 3.5) * 0.06;
      petals += '<g transform="rotate(' + a + ' 60 84)"><path class="petal" style="transition-delay:' + (i * 0.05) + 's" d="M60 84 C 36 62 44 22 60 10 C 76 22 84 62 60 84 Z" fill="url(#lp)" stroke="#C2417A" stroke-width="2.4" transform="scale(' + scale + ')" transform-origin="60 84"/></g>';
    }
    return '<svg viewBox="0 0 120 110" overflow="visible" aria-hidden="true"><defs><radialGradient id="lp" cx="50%" cy="80%" r="80%"><stop offset="0" stop-color="#FFE6F3"/><stop offset=".6" stop-color="#FF9BC8"/><stop offset="1" stop-color="#F0589A"/></radialGradient></defs>' +
      '<ellipse cx="60" cy="90" rx="56" ry="18" fill="#1E8A52" stroke="#146A3E" stroke-width="3"/>' + petals +
      '<circle cx="60" cy="72" r="9" fill="#FFD25A" stroke="#E69A12" stroke-width="2.5"/></svg>';
  }

  // Бесшовные каустики: сумма синусов с целыми частотами (плитка стыкуется идеально)
  var causticsURL = (function () {
    var url = null;
    return function () {
      if (url) return url;
      var c = document.createElement('canvas'); c.width = c.height = 256;
      var x = c.getContext('2d'), img = x.createImageData(256, 256), T = Math.PI * 2;
      for (var py = 0; py < 256; py++) for (var px = 0; px < 256; px++) {
        var u = px / 256 * T, v = py / 256 * T;
        var w = Math.sin(u * 2 + Math.sin(v * 3) * 0.9) + Math.sin(v * 2 + Math.sin(u * 3 + 1) * 0.9) + Math.sin(u + v + Math.sin(u * 2 - v) * 1.2);
        var t = Math.pow(1 - Math.abs(Math.sin(w * 1.25)), 6), i = (py * 256 + px) * 4;
        img.data[i] = 190; img.data[i + 1] = 255; img.data[i + 2] = 245; img.data[i + 3] = Math.min(255, t * 300);
      }
      x.putImageData(img, 0, 0);
      return (url = c.toDataURL());
    };
  })();

  function play(round, api) {
    var stage = api.stage, W = stage.clientWidth, H = stage.clientHeight;
    var items = api.items, decoys = api.decoys;
    var answers = G.shuffle(items);
    var N = answers.length;
    var hintAfter = api.settings.hintAfter;

    var D = Math.max(70, Math.min(W * 0.26, H * 0.17, 120));
    var ROW = Math.max(112, Math.min(H * 0.26, 180));
    var baseY = H * 0.74;
    var k = 0, wrong = 0, locked = true, hintTimer = null, resetIdle;

    /* ---------- сцена ---------- */
    stage.innerHTML = '';
    var sky = el('div', 'sky'); sky.innerHTML = SKY_SVG; stage.appendChild(sky);
    var water = el('div', 'water'); var gA = el('div', 'glint'), gB = el('div', 'glint b'); gA.style.backgroundImage = gB.style.backgroundImage = 'url(' + causticsURL() + ')'; water.appendChild(gA); water.appendChild(gB); stage.appendChild(water);
    stage.appendChild(el('div', 'moonpath'));
    var reedL = el('div', 'reeds l'), reedR = el('div', 'reeds r'); stage.appendChild(reedL); stage.appendChild(reedR);
    var clip = el('div', 'wclip'); var world = el('div', 'world'); clip.appendChild(world); stage.appendChild(clip);
    // мир живёт в координатах stage: смещаем так, чтобы y стадии совпадал с y мира
    var clipTop = H * 0.11; world.style.top = -clipTop + 'px';
    var clue = el('div', 'clue'); stage.appendChild(clue);

    fx.startAmbient('fireflies', 26, function () { var r = stage.getBoundingClientRect(); return { x: r.left, y: r.top + r.height * 0.18, w: r.width, h: r.height * 0.82 }; });
    api.cleanup(function () { fx.stopAmbient(); clearInterval(hintTimer); });

    /* ---------- лягушка ---------- */
    var FW = D * 1.05, FH = FW * 0.92;
    var frog = el('div', 'frog'); frog.style.width = FW + 'px'; frog.style.height = FH + 'px';
    frog.innerHTML = frogSVG() + '<div class="crown">' + crownSVG(HUES[round.idx % HUES.length]) + '</div>';
    world.appendChild(frog);
    function frogAt(cx, cy) { frog.style.left = (cx - FW / 2) + 'px'; frog.style.top = (cy - FH * 0.86) + 'px'; }
    function rowY(i) { return baseY - i * ROW; }

    function screenOf(node) { return fx.center(node); }

    /* ---------- кувшинки ---------- */
    function makePad(cx, cy, label, size, cls) {
      var pad = el('button', 'pad ' + (cls || '')); pad.type = 'button';
      pad.style.width = size + 'px'; pad.style.height = size + 'px'; pad.style.left = (cx - size / 2) + 'px'; pad.style.top = (cy - size / 2) + 'px';
      pad.style.setProperty('--del', (-Math.random() * 3).toFixed(2) + 's'); pad.style.setProperty('--rot', ((Math.random() - 0.5) * 4).toFixed(1) + 'deg');
      pad.innerHTML = padSVG(Math.round(Math.random() * 360), Math.round((Math.random() - 0.3) * 50));
      if (label) {
        var l = el('span', 'lbl', label);
        var fs = Math.min(size * 0.27, (size * 0.76) / (label.length * 0.56));
        l.style.fontSize = Math.max(11, fs) + 'px'; pad.appendChild(l); pad.setAttribute('aria-label', label);
      }
      world.appendChild(pad);
      return pad;
    }

    // стартовая кувшинка с лягушкой
    var cur = { x: W / 2, y: rowY(0) };
    var startPad = makePad(cur.x, cur.y, 'GO!', D * 1.05, 'start done'); startPad.style.animation = 'padin .6s backwards';
    frogAt(cur.x, cur.y);
    var candidates = [];

    function showRow() {
      if (k >= N) return;
      var target = answers[k];
      // варианты: правильный + до двух отвлекающих
      var pool = items.concat(decoys).filter(function (x) { return x.w.toLowerCase() !== target.w.toLowerCase(); });
      var opts = [target].concat(G.shuffle(pool).slice(0, 2));
      if (opts.length < 2) opts.push({ w: '…', zh: '', e: '' });
      var xs = G.shuffle([0.2, 0.5, 0.8].slice(0, opts.length === 2 ? 3 : opts.length));
      if (opts.length === 2) xs = G.shuffle([0.28, 0.72]);
      opts = G.shuffle(opts);
      candidates = opts.map(function (o, i) {
        var cx = W * (xs[i] + (Math.random() - 0.5) * 0.05), cy = rowY(k + 1) + (Math.random() - 0.5) * 14;
        var pad = makePad(cx, cy, o.w, D);
        pad.dataset.ok = o.w.toLowerCase() === target.w.toLowerCase() ? '1' : '0';
        pad.style.animationDelay = (0.25 + i * 0.1) + 's, 0s';
        pad.addEventListener('click', function () { onPad(pad, o); });
        pad._cx = cx; pad._cy = cy;
        return pad;
      });
      // подсказка-картинка
      clue.className = 'clue'; void clue.offsetWidth; clue.classList.add('pop');
      var hasPic = !!target.e;
      clue.innerHTML = (hasPic ? '<div class="pic">' + target.e + '</div>' : '') +
        (target.zh ? '<div class="zhtxt' + (hasPic ? ' zhline' : '') + '">' + G.kit.esc(target.zh) + '</div>' : '') +
        '<div class="ask">Which word? 选哪个词？</div><button class="ear" type="button" aria-label="Listen">🔊</button>';
      clue.querySelector('.ear').addEventListener('click', function () { G.ac(); api.speak(target); });
      if (!hasPic && !target.zh) api.speak(target);
      locked = false; wrong = 0;
      resetIdle = api.idle(function () { hint(); });
    }

    function hint() {
      var good = candidates.filter(function (p) { return p.dataset.ok === '1' && !p.classList.contains('gone'); })[0];
      if (!good || good.classList.contains('hint')) return;
      good.classList.add('hint'); api.hinted();
      var c = screenOf(good), n = 0;
      clearInterval(hintTimer);
      hintTimer = setInterval(function () {
        var cc = screenOf(good);
        fx.trail(cc.x + fx.rnd(-cc.w / 3, cc.w / 3), cc.y - fx.rnd(0, cc.h * 0.7), '#FFF3B0');
        if (++n > 40) clearInterval(hintTimer);
      }, 70);
      fx.ring(c.x, c.y, '#FFE066', 12);
      api.speak(answers[k]);
    }

    /* ---------- ход ---------- */
    function onPad(pad, o) {
      if (locked || !api.alive()) return;
      G.ac();
      if (pad.dataset.ok === '1') hop(pad, o); else oops(pad, o);
    }

    function oops(pad, o) {
      wrong++;
      api.mistake(answers[k].w, o.w, answers[k].w);
      G.sfx.soft();
      pad.classList.add('wrong'); pad.disabled = true;
      var c = screenOf(pad); fx.bubbles(c.x, c.y, 9); fx.ring(c.x, c.y, '#BDEBFF', 8);
      frog.classList.remove('no'); void frog.offsetWidth; frog.classList.add('no');
      api.speak(o);
      var fc = screenOf(frog);
      api.bubble('Hmm… 再想想 🤔', fc.x, fc.y - FH * 0.4, 1500);
      setTimeout(function () { pad.classList.add('gone'); }, 520);
      if (wrong >= hintAfter) hint();
      if (resetIdle) resetIdle();
    }

    function hop(pad, o) {
      locked = true; clearInterval(hintTimer);
      var target = answers[k];
      candidates.forEach(function (p) { if (p !== pad) { p.classList.add('gone'); var c = screenOf(p); fx.bubbles(c.x, c.y, 4); } });
      pad.classList.remove('hint'); pad.classList.add('done');
      var tx = pad._cx, ty = pad._cy;
      jump(tx, ty, ROW * 0.35, 640, function () {
        var c = screenOf(pad);
        G.sfx.good(); fx.splash(c.x, c.y + 6, 14); fx.ring(c.x, c.y, '#fff', 10); fx.sparkle(c.x, c.y - 10, 12); fx.stars(c.x, c.y - 20, 6);
        api.speak(target);
        k++; api.progress(k, N);
        api.bubble('<b>' + G.kit.esc(target.w) + '</b>' + (target.zh ? '<small>' + G.kit.esc(target.zh) + '</small>' : ''), c.x, c.y - FH * 0.9, 1100);
        setTimeout(function () {
          if (k >= N) { finale(); return; }
          pan(); showRow();
        }, 650);
      });
    }

    // прыжок лягушки по параболе с «резиной»
    function jump(tx, ty, arc, ms, done) {
      var sx = cur.x, sy = cur.y, kf = [], steps = 14;
      for (var i = 0; i <= steps; i++) {
        var t = i / steps, dx = (tx - sx) * t, dy = (ty - sy) * t - arc * 4 * t * (1 - t);
        var sc = i === 0 ? [1, 1] : (t < 0.2 ? [0.92, 1.12] : (t > 0.88 ? [1.14, 0.86] : [0.94, 1.08]));
        kf.push({ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc[0] + ',' + sc[1] + ')', offset: t });
      }
      frog.getAnimations().forEach(function (a) { a.cancel(); });
      G.sfx.pop();
      var an = frog.animate(kf, { duration: ms, easing: 'cubic-bezier(.4,0,.6,1)' });
      setTimeout(function () { var c = screenOf(frog); fx.splash(c.x, c.y + FH * 0.3, 6); }, 10);
      an.onfinish = function () {
        cur.x = tx; cur.y = ty; frogAt(tx, ty);
        fx.squash(frog, 380);
        done && done();
      };
    }

    function pan() {
      world.style.transform = 'translateY(' + (k * ROW) + 'px)';
      var off = k * ROW * 0.7;
      reedL.style.backgroundPositionY = off + 'px'; reedR.style.backgroundPositionY = off + 'px';
    }

    /* ---------- финал: золотой лотос, корона, салют ---------- */
    function finale() {
      clue.style.transition = 'opacity .4s'; clue.style.opacity = 0;
      pan();
      var lx = W / 2, ly = rowY(N + 1) + 6, LS = D * 1.9;
      var lotus = el('div', 'lotus'); lotus.style.cssText = 'position:absolute;z-index:2;width:' + LS + 'px;height:' + LS * 0.92 + 'px;left:' + (lx - LS / 2) + 'px;top:' + (ly - LS * 0.7) + 'px;animation:padin .8s cubic-bezier(.3,1.5,.5,1) backwards';
      lotus.innerHTML = '<div class="aura" style="position:absolute;inset:-40%;border-radius:50%;background:radial-gradient(circle,rgba(255,226,130,.75),rgba(255,226,130,0) 65%);filter:blur(4px)"></div>' + lotusSVG();
      var st = document.createElement('style'); st.textContent = '.lotus svg{position:relative} .lotus .petal{transform-origin:60px 84px; transform:scale(.2); transition:transform .8s cubic-bezier(.3,1.5,.5,1)} .lotus.open .petal{transform:scale(1)}';
      document.head.appendChild(st); api.cleanup(function () { st.remove(); });
      world.appendChild(lotus);
      setTimeout(function () {
        jump(lx, ly - LS * 0.12, ROW * 0.5, 800, function () {
          lotus.classList.add('open');
          var c = screenOf(frog);
          G.sfx.win(); fx.splash(c.x, c.y + 10, 24); fx.ring(c.x, c.y, '#FFE066', 14);
          setTimeout(function () {
            var cr = frog.querySelector('.crown');
            cr.animate([{ transform: 'translate(-50%,-160px) rotate(-14deg)', opacity: 0 }, { transform: 'translate(-50%,4px) rotate(6deg)', opacity: 1, offset: .6 }, { transform: 'translate(-50%,-4px) rotate(-3deg)', opacity: 1, offset: .8 }, { transform: 'translate(-50%,0) rotate(0)', opacity: 1 }], { duration: 900, easing: 'ease-out', fill: 'forwards' });
            setTimeout(function () { G.sfx.sparkle(); var cc = screenOf(frog); fx.stars(cc.x, cc.y - FH * 0.7, 18); fx.hearts(cc.x, cc.y - FH * 0.4, 10); }, 800);
          }, 400);
          setTimeout(function () {
            frog.classList.add('dance');
            fx.fireworks(7);
            fx.emojiRain(items.map(function (x) { return x.e; }).filter(Boolean).concat(['✨', '⭐']), 26, 2.6);
            var cc = screenOf(frog);
            api.bubble('Ribbit! Thank you! 谢谢你！💚', cc.x, cc.y - FH * 1.0, 0);
            api.speak('Thank you!');
          }, 1500);
          setTimeout(function () { api.hideBubble(); }, 4700);
          setTimeout(function () { api.complete(N); }, 5200);
        });
      }, 900);
    }

    /* ---------- старт ---------- */
    api.progress(0, N);
    pan();
    setTimeout(function () { showRow(); }, 500);
  }

  G.kit.create({
    id: 'frog', title: 'Lily Hop', zh: '青蛙过河', emoji: '🐸', className: 'g-frog',
    blurb: 'Look at the picture and hop to the lily pad with the right word. Cross the moonlit pond and earn a golden crown! 看图片，跳到正确单词的荷叶上，穿过月光下的池塘，赢得金皇冠！',
    defaults: window.FROG_DEFAULTS, minWords: 3,
    albumLabel: 'My crowns 我的皇冠', rewardTitle: 'A golden crown! 获得金皇冠！',
    reward: function (r) { return crownSVG(HUES[r.idx % HUES.length]); },
    play: play
  });
})();
