/* Набор по умолчанию для «Пузырькового правописания»: короткие слова с картинками. */
(function (global) {
  'use strict';
  function W(w, zh, e, say) { return { w: w, zh: zh || '', e: e || '', say: say || '' }; }

  global.SPELL_DEFAULTS = {
    settings: { showChinese: true, speechRate: 0.8, hintAfter: 2, idleHintSec: 12, extraLetters: 2 },
    rounds: [
      { id: 'short', title: 'Short words', zh: '短单词', emoji: '🔤', kind: 'list', enabled: true,
        words: [W('cat', '猫', '🐱'), W('dog', '狗', '🐶'), W('sun', '太阳', '☀️'), W('pig', '猪', '🐷'), W('hat', '帽子', '🎩'), W('bus', '公共汽车', '🚌')],
        decoys: [] },
      { id: 'colors', title: 'Spell colors', zh: '拼颜色', emoji: '🎨', kind: 'list', enabled: true,
        words: [W('red', '红色', '🔴'), W('blue', '蓝色', '🔵'), W('pink', '粉色', '🌸'), W('green', '绿色', '🟢'), W('black', '黑色', '⚫')],
        decoys: [] },
      { id: 'sea', title: 'Sea animals', zh: '海洋动物', emoji: '🐠', kind: 'list', enabled: true,
        words: [W('fish', '鱼', '🐟'), W('crab', '螃蟹', '🦀'), W('shark', '鲨鱼', '🦈'), W('whale', '鲸鱼', '🐳'), W('turtle', '海龟', '🐢')],
        decoys: [] },
      { id: 'food', title: 'Spell food', zh: '拼食物', emoji: '🍰', kind: 'list', enabled: true,
        words: [W('egg', '鸡蛋', '🥚'), W('milk', '牛奶', '🥛'), W('cake', '蛋糕', '🍰'), W('rice', '米饭', '🍚'), W('apple', '苹果', '🍎')],
        decoys: [] }
    ]
  };
})(window);
