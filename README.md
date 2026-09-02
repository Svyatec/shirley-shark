# Shirley & the Shark 🏄‍♀️🦈

A classroom mini-game about sharks: quiz facts + B1 English grammar. Surfer Shirley paddles to the beach by answering questions; every mistake (or too much idling) brings the hungry shark closer. Results of every player are stored in SQLite and shown on the teacher's panel.

## Run

```bash
npm start        # or: node --no-warnings server.js
```

Open `http://localhost:3000`. The console also prints LAN addresses (`http://192.168.x.x:3000`) — share one of them with students on the same Wi-Fi.

Requires **Node 22.13+** (built-in `node:sqlite`, no npm dependencies). The database is created automatically at `data/game.db`.

## How it works

- The quiz has **10 questions** (shark facts, True/False, Past Simple / Past Continuous). A wrong question returns to the queue until answered.
- **Students** type their name → *Save & start* → play. Each mistake and the final result (reached beach / eaten, words done, mistakes, time) are saved live.
- **Teacher** types the magic name **`Shirley`** (change with `TEACHER_NAME=... node server.js`). The interface is the same, plus a **📋 Teacher panel** button in the top bar with:
  - totals (players, games, mistakes, won / eaten),
  - the **two most common mistakes** across all players (word, how often, the typical wrong answer),
  - a table of all players with their mistakes,
  - **Refresh** and **Reset all results** (wipes the database).
- Teacher practice games are not stored.
- **Question builder** (🛠 button inside the teacher panel) lets the teacher fully customize the game: write questions with 2-4 options, mark the correct one, add an explanation shown after the answer, edit and delete entries. When the custom set has at least 2 questions, every new game uses it instead of the built-in shark quiz; "Clear custom questions" brings the default set back. Game rules are editable too: the shark gap (mistakes before being eaten, 2-8) and whether the shark drifts closer while the player thinks. Everything is stored in the same SQLite database.
- Player names may be in any script (Cyrillic, Chinese, Thai, ...) — data travels as UTF-8 JSON.

## Shared hosting (PHP) — no Node needed

Regular shared hosting cannot run Node. Upload the **contents of `public/`** to the site root (or any subfolder):

```
index.html   shark.svg   api.php   .htaccess   data/.htaccess
```

Requirements: PHP 7.4+ with `pdo_sqlite` (present on virtually every shared host). The `data/` folder must be writable — the SQLite database `data/game.db` is created automatically on first request, and `.htaccess` blocks direct downloads of it.

The frontend detects the backend automatically: it tries `api/ping` (Node or Apache rewrite) and falls back to `api.php/api/ping` when `mod_rewrite` is off. No configuration needed. The teacher name for the PHP backend is set in `api.php` (`TEACHER_NAME`).

## Extras

- The shark artwork lives in `public/shark.svg`; the animation rig (idle sway, waterline foam, bubbles, sunglasses glint, lunge splash, bite snap, fed belly) is pure CSS in `public/index.html`.
- `http://localhost:3000/?demo=1` starts the game instantly without registration (nothing is saved) — handy for previews.

## API (for the curious)

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/sessions` `{name}` | register a player / start a game |
| POST | `/api/sessions/:id/mistake` `{word, chosen, correct}` | record a mistake |
| POST | `/api/sessions/:id/finish` `{status, wordsDone, durationSec}` | finish a game |
| GET | `/api/teacher/results?name=Shirley` | full report |
| DELETE | `/api/teacher/results?name=Shirley` | clear results |
| GET | `/api/questions` | active custom question set + game rules |
| POST/PUT/DELETE | `/api/teacher/questions[/:id]?name=Shirley` | add / edit / delete custom questions (DELETE without id clears the set) |
| POST | `/api/teacher/settings?name=Shirley` | save game rules (startGap, idleEnabled) |
