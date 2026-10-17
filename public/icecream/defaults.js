/*
 * Набор по умолчанию для «Собери мороженое». Слово = цвет или вкус.
 * Цвет шарика берётся по названию (red, pink, chocolate…), по эмодзи-кружку (🔴🟢…)
 * или напрямую из поля «表情»/emoji, если там записан код цвета вида #FF88CC.
 */
(function (global) {
  'use strict';
  function W(w, zh, e, say) { return { w: w, zh: zh || '', e: e || '', say: say || '' }; }

  global.ICECREAM_DEFAULTS = {
    settings: { showChinese: true, speechRate: 0.8, hintAfter: 2, idleHintSec: 12, scoops: 5, choices: 4 },
    rounds: [
      { id: 'rainbow', title: 'Rainbow colors', zh: '彩虹的颜色', emoji: '🌈', kind: 'list', enabled: true,
        words: [W('red', '红色', '🔴'), W('orange', '橙色', '🟠'), W('yellow', '黄色', '🟡'), W('green', '绿色', '🟢'), W('blue', '蓝色', '🔵'), W('purple', '紫色', '🟣')],
        decoys: [] },
      { id: 'sweet', title: 'Sweet colors', zh: '甜甜的颜色', emoji: '🍭', kind: 'list', enabled: true,
        words: [W('pink', '粉色', '🩷'), W('brown', '棕色', '🟤'), W('white', '白色', '⚪'), W('black', '黑色', '⚫'), W('gray', '灰色', '🩶')],
        decoys: [W('red', '红色', '🔴')] },
      { id: 'flavors', title: 'Yummy flavors', zh: '好吃的口味', emoji: '🍨', kind: 'list', enabled: true,
        words: [W('chocolate', '巧克力', '🍫'), W('vanilla', '香草', '🍦'), W('strawberry', '草莓', '🍓'), W('mint', '薄荷', '🌿'), W('lemon', '柠檬', '🍋'), W('blueberry', '蓝莓', '🫐')],
        decoys: [] },
      { id: 'more', title: 'More colors', zh: '更多颜色', emoji: '🎨', kind: 'list', enabled: true,
        words: [W('light blue', '浅蓝色', '#9ED8FF'), W('dark green', '深绿色', '#2E8B57'), W('gold', '金色', '#FFC93C'), W('silver', '银色', '#C9D1DC'), W('beige', '米色', '#F2DFC0')],
        decoys: [] }
    ]
  };
})(window);
