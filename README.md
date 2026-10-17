# Shirley's English Games 🎮

Classroom English mini-games with one teacher back office. Node + SQLite (zero dependencies) or plain PHP on shared hosting.

| Game | Path | For | Idea |
| --- | --- | --- | --- |
| 🐛 Hungry Caterpillar | `/caterpillar/` | young / beginner (Chinese kids) | Eat the words **in the right order**; no losing. The caterpillar grows, turns into a butterfly, says "Thank you!" and flies away. Butterflies are collected in an album. |
| 🐸 Lily Hop | `/frog/` | beginners | Picture (emoji / Chinese) → hop to the lily pad with the right word; moonlit pond, golden crown. |
| 🐝 Bee Garden | `/bee/` | beginners | Listening: hear the word, fly the bee to the right flower; honey jar, rainbow finale. |
| 🫧 Bubble Spell | `/spell/` | beginners | Spelling: pop letter bubbles in order; a new fish per word, treasure chest finale. |
| 🐉 Dragon Eggs | `/dragon/` | beginners | Memory pairs word ↔ picture; each pair hatches a baby dragon, Mama Dragon finale. |
| 🍦 Ice Cream Tower | `/icecream/` | beginners | Colors: hear a color, drag (or tap) the right scoop onto the cone; 3–7 scoops, cream + cherry finale. Colors come from the word (red, mint, chocolate…), an emoji circle or a `#hex` in the emoji field. |
| 🦈 Shirley & the Shark | `/shark/` | B1 | Quiz + grammar; mistakes bring the shark closer. |

`/` is the game menu, `/admin/` is the teacher back office (Chinese UI), `/teacher-guide.html` is the teacher's manual in Chinese (also shown inside the back office, tab 📖).

## Run

```bash
npm start        # or: node --no-warnings server.js
```

Open `http://localhost:3000`. The console prints LAN addresses (`http://192.168.x.x:3000`) for students on the same Wi-Fi. Requires **Node 22.13+** (built-in `node:sqlite`). The database is created at `data/game.db`.

Teacher name (case-insensitive): default **`Shirley`**, change with `TEACHER_NAME=... node server.js` (Node) or `TEACHER_NAME` in `public/api.php` (PHP). Playing with the teacher name is a practice mode: nothing is saved.

## Without a website (offline / classroom PC)

- **Simplest:** open `public/index.html` straight from the folder (Chrome / Edge). Everything plays offline; results are not saved; the admin opens without login and its *Save* downloads `local-config.js`.
- **With saving + tablets on the same Wi-Fi:** double-click `start-windows.bat` / `start-mac.command` (needs Node.js 22.13+, otherwise it falls back to offline mode). It starts `server.js` and opens `http://localhost:3000`; the console prints the LAN address.
- **Custom rounds offline:** `public/local-config.js` (`window.LOCAL_CONFIG = { game: config }`). Admin → 💻 本地运行 → *下载 local-config.js* exports every game's edited rounds. Priority in games: server config → `local-config.js` → built-in defaults.

## Structure

```
public/
  index.html              game menu
  shark/                  Shirley & the Shark (own question builder inside the game)
  caterpillar/            index.html + game.js + defaults.js (built-in rounds, also used by the admin)
  frog/ bee/ spell/ dragon/ icecream/  same layout, built on shared/kit.js (shell: name, menu, rewards album, end card)
  local-config.js         offline copy of the teacher's rounds (empty by default)
  admin/index.html        back office: results of all games, caterpillar editor, link to shark builder, guide viewer
  teacher-guide.html      Chinese manual (print-friendly)
  shared/core.js,base.css API detection, speech (browser SpeechSynthesis), sounds, base styles
  shared/fx.js            canvas particle engine: confetti, sparks, stars, hearts, bubbles, fireworks, ambient fireflies
  shared/kit.js,kit.css   game shell for new games: play(round, api) gets stage, progress, speak, mistake, idle hints, complete
  api.php  .htaccess  data/   PHP backend for shared hosting
server.js                 Node backend (same routes as api.php)
```

No external fonts / CDNs anywhere (they are often blocked in mainland China).

## Adding a new game

1. Create `public/<game>/index.html` with `../shared/core.js` (`data-root="../"`), `fx.js`, `kit.js`, `kit.css`, then `Games.kit.create({ id, title, zh, emoji, defaults, reward, play })` — see `public/frog/game.js`.
2. Without the kit: start a run with `Games.startSession(name, '<game>', detail)`, report `Games.reportMistake(word, chosen, correct)`, finish with `Games.finishSession('done', words, seconds)`.
3. Lay out answer options with `api.cells(n, area, aspect)` (one rectangle per option — they never overlap) and re-layout in `api.onResize(fn)` (rotation / window resize keeps progress).
4. Store teacher-editable content with `GET /api/games/<game>/config` (game) and `PUT /api/teacher/games/<game>/config` (admin). The config is any JSON object.
5. Add an entry to `EDITORS` in `public/admin/index.html` (the editor tab is generated), a card in `public/index.html`, a chapter in `public/teacher-guide.html`.

## Caterpillar content format

Round = `{ id, title, zh, emoji, kind: 'list' | 'sentence', enabled, words: [{w, zh, e, say}], decoys: [...] }`. First word is the given start word; the rest must be eaten in order (max 12 words, 6 decoys). `say` overrides pronunciation. Settings: `showChinese`, `speechRate`, `hintAfter` (mistakes in a row before the right word glows), `idleHintSec`.

## Shared hosting (PHP)

Upload the **contents of `public/`** to the site root:

```
index.html  teacher-guide.html  api.php  .htaccess  data/.htaccess
shark/  caterpillar/  frog/  bee/  spell/  dragon/  icecream/  admin/  shared/  local-config.js
```

PHP 7.4+ with `pdo_sqlite`; `data/` must be writable. **Never overwrite `data/game.db`** when updating — it holds results and the teacher's edited rounds. The schema migrates itself (old sessions become `game = 'shark'`). The frontend tries `api/ping` and falls back to `api.php/api/ping` when `mod_rewrite` is off.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/sessions` `{name, game?, detail?}` | register a player / start a run (`game` defaults to `shark`) |
| POST | `/api/sessions/:id/mistake` `{word, chosen, correct}` | record a mistake |
| POST | `/api/sessions/:id/finish` `{status: won\|eaten\|done, wordsDone, durationSec}` | finish a run |
| GET | `/api/games/:game/config` | teacher-edited content of a game (`null` = built-in) |
| PUT/DELETE | `/api/teacher/games/:game/config?name=…` | save / reset it |
| GET | `/api/teacher/results?name=…&game=shark\|caterpillar\|all` | report (default `shark`) |
| DELETE | `/api/teacher/results?name=…` | clear all results |
| GET | `/api/questions` | shark: custom question set + rules |
| POST/PUT/DELETE | `/api/teacher/questions[/:id]?name=…` | shark: manage questions |
| POST | `/api/teacher/settings?name=…` | shark: game rules |
