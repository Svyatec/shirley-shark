/*
 * Набор по умолчанию для игры «Гусеница». Используется, пока учитель не сохранил свой набор в админке.
 * Формат слова: w — английское слово, zh — перевод, e — эмодзи (необязательно), say — как произнести (необязательно).
 * Формат раунда: kind = 'list' (ряд: дни недели, числа) или 'sentence' (предложение).
 * Первое слово раунда — вводное: гусеница стартует с него, остальные слова ученик находит по порядку.
 */
(function (global) {
  'use strict';

  function W(w, zh, e, say) { return { w: w, zh: zh || '', e: e || '', say: say || '' }; }

  global.CATERPILLAR_DEFAULTS = {
    settings: {
      showChinese: true,   // показывать перевод под словами
      speechRate: 0.85,    // скорость речи (0.5 – 1.2)
      hintAfter: 2,        // после стольких ошибок подряд подсвечиваем верное слово
      idleHintSec: 15      // подсказка, если ученик долго не нажимает (0 — выключено)
    },
    rounds: [
      {
        id: 'hello', title: 'Hello!', zh: '你好，我叫汤姆', emoji: '👋', kind: 'sentence', enabled: true,
        words: [W('Hello', '你好', '👋'), W('my', '我的'), W('name', '名字', '🏷️'), W('is', '是'), W('Tom', '汤姆', '👦')],
        decoys: [W('cat', '猫', '🐱'), W('blue', '蓝色', '🔵')]
      },
      {
        id: 'fruit', title: 'I like apples', zh: '我喜欢红苹果', emoji: '🍎', kind: 'sentence', enabled: true,
        words: [W('I', '我', '🙋'), W('like', '喜欢', '❤️'), W('red', '红色的', '🔴'), W('apples', '苹果', '🍎')],
        decoys: [W('blue', '蓝色的', '🔵'), W('milk', '牛奶', '🥛'), W('run', '跑', '🏃')]
      },
      {
        id: 'week', title: 'Days of the week', zh: '星期', emoji: '📅', kind: 'list', enabled: true,
        words: [W('Monday', '星期一'), W('Tuesday', '星期二'), W('Wednesday', '星期三'), W('Thursday', '星期四'),
                W('Friday', '星期五'), W('Saturday', '星期六'), W('Sunday', '星期日')],
        decoys: [W('Month', '月'), W('Today', '今天')]
      },
      {
        id: 'numbers', title: 'Numbers', zh: '数字 1–8', emoji: '🔢', kind: 'list', enabled: true,
        words: [W('one', '一', '1️⃣'), W('two', '二', '2️⃣'), W('three', '三', '3️⃣'), W('four', '四', '4️⃣'),
                W('five', '五', '5️⃣'), W('six', '六', '6️⃣'), W('seven', '七', '7️⃣'), W('eight', '八', '8️⃣')],
        decoys: [W('ten', '十', '🔟')]
      },
      {
        id: 'rainbow', title: 'Rainbow colors', zh: '彩虹的颜色', emoji: '🌈', kind: 'list', enabled: true,
        words: [W('red', '红色', '🔴'), W('orange', '橙色', '🟠'), W('yellow', '黄色', '🟡'),
                W('green', '绿色', '🟢'), W('blue', '蓝色', '🔵'), W('purple', '紫色', '🟣')],
        decoys: [W('black', '黑色', '⚫'), W('white', '白色', '⚪')]
      },
      {
        id: 'dog', title: 'The big dog', zh: '大狗跑得很快', emoji: '🐶', kind: 'sentence', enabled: true,
        words: [W('The', ''), W('big', '大的', '🐘'), W('dog', '狗', '🐶'), W('runs', '跑', '🏃'), W('fast', '快', '💨')],
        decoys: [W('small', '小的', '🐜'), W('sleeps', '睡觉', '😴')]
      }
    ]
  };
})(window);
