/* Набор по умолчанию для «Лягушки на пруду». Формат слов как везде: w, zh, e (картинка-подсказка), say. */
(function (global) {
  'use strict';
  function W(w, zh, e, say) { return { w: w, zh: zh || '', e: e || '', say: say || '' }; }

  global.FROG_DEFAULTS = {
    settings: { showChinese: true, speechRate: 0.85, hintAfter: 2, idleHintSec: 12 },
    rounds: [
      { id: 'animals', title: 'Animals', zh: '动物', emoji: '🐾', kind: 'list', enabled: true,
        words: [W('cat', '猫', '🐱'), W('dog', '狗', '🐶'), W('bird', '鸟', '🐦'), W('fish', '鱼', '🐟'), W('rabbit', '兔子', '🐰'), W('horse', '马', '🐴')],
        decoys: [W('lion', '狮子', '🦁'), W('frog', '青蛙', '🐸')] },
      { id: 'fruit', title: 'Fruit', zh: '水果', emoji: '🍎', kind: 'list', enabled: true,
        words: [W('apple', '苹果', '🍎'), W('banana', '香蕉', '🍌'), W('orange', '橙子', '🍊'), W('grapes', '葡萄', '🍇'), W('strawberry', '草莓', '🍓'), W('watermelon', '西瓜', '🍉')],
        decoys: [W('pear', '梨', '🍐'), W('lemon', '柠檬', '🍋')] },
      { id: 'food', title: 'Yummy food', zh: '好吃的', emoji: '🍔', kind: 'list', enabled: true,
        words: [W('bread', '面包', '🍞'), W('milk', '牛奶', '🥛'), W('egg', '鸡蛋', '🥚'), W('cake', '蛋糕', '🍰'), W('pizza', '披萨', '🍕'), W('ice cream', '冰淇淋', '🍦')],
        decoys: [W('rice', '米饭', '🍚'), W('juice', '果汁', '🧃')] },
      { id: 'weather', title: 'Weather', zh: '天气', emoji: '⛅', kind: 'list', enabled: true,
        words: [W('sunny', '晴天', '☀️'), W('rainy', '下雨', '🌧️'), W('cloudy', '多云', '☁️'), W('snowy', '下雪', '❄️'), W('windy', '刮风', '💨'), W('stormy', '暴风雨', '⛈️')],
        decoys: [W('hot', '热', '🥵'), W('cold', '冷', '🥶')] },
      { id: 'school', title: 'At school', zh: '在学校', emoji: '🎒', kind: 'list', enabled: true,
        words: [W('book', '书', '📖'), W('pencil', '铅笔', '✏️'), W('bag', '书包', '🎒'), W('ruler', '尺子', '📏'), W('clock', '时钟', '⏰'), W('computer', '电脑', '💻')],
        decoys: [W('phone', '手机', '📱'), W('ball', '球', '⚽')] }
    ]
  };
})(window);
