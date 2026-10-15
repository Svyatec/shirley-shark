/* Набор по умолчанию для «Пчёлки и цветов» (аудирование). w, zh, e (картинка), say (произношение учителя). */
(function (global) {
  'use strict';
  function W(w, zh, e, say) { return { w: w, zh: zh || '', e: e || '', say: say || '' }; }

  global.BEE_DEFAULTS = {
    settings: { showChinese: true, speechRate: 0.8, hintAfter: 2, idleHintSec: 12, flowers: 4 },
    rounds: [
      { id: 'colors', title: 'Colors', zh: '颜色', emoji: '🎨', kind: 'list', enabled: true,
        words: [W('red', '红色', '🔴'), W('blue', '蓝色', '🔵'), W('green', '绿色', '🟢'), W('yellow', '黄色', '🟡'), W('purple', '紫色', '🟣'), W('orange', '橙色', '🟠')],
        decoys: [W('black', '黑色', '⚫'), W('white', '白色', '⚪')] },
      { id: 'numbers', title: 'Numbers', zh: '数字', emoji: '🔢', kind: 'list', enabled: true,
        words: [W('one', '一', '1️⃣'), W('two', '二', '2️⃣'), W('three', '三', '3️⃣'), W('four', '四', '4️⃣'), W('five', '五', '5️⃣'), W('six', '六', '6️⃣'), W('seven', '七', '7️⃣'), W('eight', '八', '8️⃣')],
        decoys: [W('nine', '九', '9️⃣'), W('ten', '十', '🔟')] },
      { id: 'actions', title: 'Action words', zh: '动作', emoji: '🏃', kind: 'list', enabled: true,
        words: [W('run', '跑', '🏃'), W('jump', '跳', '🤸'), W('swim', '游泳', '🏊'), W('sing', '唱歌', '🎤'), W('dance', '跳舞', '💃'), W('sleep', '睡觉', '😴')],
        decoys: [W('read', '读', '📖'), W('eat', '吃', '🍽️')] },
      { id: 'family', title: 'My family', zh: '我的家人', emoji: '👨‍👩‍👧', kind: 'list', enabled: true,
        words: [W('mother', '妈妈', '👩'), W('father', '爸爸', '👨'), W('sister', '姐妹', '👧'), W('brother', '兄弟', '👦'), W('grandma', '奶奶', '👵'), W('grandpa', '爷爷', '👴')],
        decoys: [W('baby', '宝宝', '👶'), W('teacher', '老师', '🧑‍🏫')] },
      { id: 'sounds', title: 'Listen closely', zh: '仔细听', emoji: '👂', kind: 'list', enabled: true,
        words: [W('ship', '船', '🚢'), W('sheep', '绵羊', '🐑'), W('bed', '床', '🛏️'), W('bird', '鸟', '🐦'), W('cat', '猫', '🐱'), W('cup', '杯子', '☕')],
        decoys: [W('bad', '坏的', '👎'), W('bid', '出价', ''), W('cut', '切', '✂️')] }
    ]
  };
})(window);
