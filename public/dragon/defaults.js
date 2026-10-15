/* Набор по умолчанию для «Драконьих яиц» (мемори: слово ↔ картинка). Нужна картинка (e) или перевод (zh). */
(function (global) {
  'use strict';
  function W(w, zh, e, say) { return { w: w, zh: zh || '', e: e || '', say: say || '' }; }

  global.DRAGON_DEFAULTS = {
    settings: { showChinese: true, speechRate: 0.85, hintAfter: 3, idleHintSec: 20, pairs: 6 },
    rounds: [
      { id: 'toys', title: 'Toys', zh: '玩具', emoji: '🧸', kind: 'list', enabled: true,
        words: [W('ball', '球', '⚽'), W('doll', '娃娃', '🪆'), W('kite', '风筝', '🪁'), W('robot', '机器人', '🤖'), W('car', '小汽车', '🚗'), W('teddy bear', '泰迪熊', '🧸'), W('drum', '鼓', '🥁')],
        decoys: [] },
      { id: 'transport', title: 'Transport', zh: '交通工具', emoji: '🚂', kind: 'list', enabled: true,
        words: [W('bus', '公共汽车', '🚌'), W('plane', '飞机', '✈️'), W('train', '火车', '🚆'), W('boat', '船', '⛵'), W('bike', '自行车', '🚲'), W('rocket', '火箭', '🚀')],
        decoys: [] },
      { id: 'body', title: 'My body', zh: '身体', emoji: '🙂', kind: 'list', enabled: true,
        words: [W('eye', '眼睛', '👁️'), W('ear', '耳朵', '👂'), W('nose', '鼻子', '👃'), W('mouth', '嘴巴', '👄'), W('hand', '手', '✋'), W('foot', '脚', '🦶')],
        decoys: [] },
      { id: 'zoo', title: 'At the zoo', zh: '动物园', emoji: '🦁', kind: 'list', enabled: true,
        words: [W('lion', '狮子', '🦁'), W('tiger', '老虎', '🐯'), W('monkey', '猴子', '🐵'), W('elephant', '大象', '🐘'), W('panda', '熊猫', '🐼'), W('giraffe', '长颈鹿', '🦒'), W('zebra', '斑马', '🦓')],
        decoys: [] }
    ]
  };
})(window);
