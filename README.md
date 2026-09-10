# Quiz Game 🎮

A quiz game you can play **in the browser and on your phone**. It pulls fresh questions from the free **Open Trivia DB** API (General Knowledge and Anime & Manga), serves them through your own backend, and lets you **play live against friends** in multiplayer rooms.

> **Current status:** Phases 1, 2 & 3 (scores) done — single-player, **coded multiplayer**, and a **Random Game** mode all work, plus an **English/French language switcher** and a **persistent leaderboard** for Random-Game scores. The whole stack is deployed live on Render.

---

## Tech stack

| Layer | Technology | Why it was chosen |
|---|---|---|
| Mobile **and** Web app | **Expo (React Native)** | One codebase produces an iOS app, an Android app, *and* a website. |
| Backend server | **Node.js + Express** | Simple, popular, same language (JavaScript) as the app. |
| Questions | **Open Trivia DB API** | Free, no account needed. Returns questions with the correct answer *and* the 3 wrong answers. |
| Real-time multiplayer | **Socket.io** | Live rooms + racing questions; the server acts as the referee. |
| Database (Phase 3) | **PostgreSQL** | For saved scores and history. |
| Hosting (Phase 3) | **Render** | Easy cloud deploy for the Node server, the database, and the web site. |
| Languages | **EN / FR settings** | English via Open Trivia DB; French via live server-side translation |

**One language everywhere: JavaScript.** That keeps things simple to learn and to read.

---

## Project structure

```
QuizzGame/
├── server/            ← the backend
│   ├── index.js       ← creates the Express server + Socket.io, mounts routes
│   └── src/
│       ├── game.js            ← the MULTIPLAYER referee: rooms, questions, timer, grading
│       ├── db.js              ← score storage: PostgreSQL (Render) or in-memory (local dev)
│       ├── opentdb.js         ← where questions come from: Open Trivia DB (EN) + translation (FR)
│       └── translate.js       ← LIVE translation (MyMemory API): turns English questions into French
│
└── app/               ← the Expo app (web + iOS + Android)
    ├── App.js               ← home screen + mode switcher (Solo / Multiplayer / Settings)
    ├── app.json             ← Expo project settings (name, icons)
    └── src/
        ├── components/
        │   ├── QuestionCard.js             ← ONE question (single-player)
        │   └── MultiplayerQuestionCard.js  ← ONE question (multiplayer, server reveal)
        ├── i18n/
        │   ├── strings.js           ← every word, in English AND French
        │   └── LanguageContext.js   ← remembers the language + the t() translator
        ├── screens/
        │   ├── HomeScreen.js           ← "Play Solo" / "Multiplayer" / ⚙ buttons
        │   ├── SettingsScreen.js       ← the language picker (English / Français)
        │   ├── MultiplayerScreen.js    ← the whole multiplayer flow
        │   ├── ResultsScreen.js        ← final standings + "Play again"
        │   └── LeaderboardScreen.js   ← persistent Random-Game scores from the server
        └── services/
            ├── api.js           ← the only file that calls the backend (HTTP)
            └── socket.js        ← the real-time connection to the server
```

---

## What you need installed

- **Node.js** (version 18 or newer) — [nodejs.org](https://nodejs.org)
- **npm** (comes with Node)
- Optional for phone testing: the **Expo Go** app on your phone.

---

## How to run it

Open a terminal. You'll need **two terminals** — one for the server, one for the app.

> **Using Windows PowerShell?** Press Enter between commands instead of joining them with `&&` (PowerShell uses `;` to join, not `&&`). Every command below is already written as one-per-line for you.

### 1. Start the backend server

```bash
cd server
npm install        # only the first time
npm run dev        # developer mode: restarts automatically when you edit code
```

You should see: `Quiz server running at http://localhost:3000`

**Test it in your browser:** open http://localhost:3000/questions — you should see JSON questions appear.

### 2. Start the app (web)

In a **second** terminal:

```bash
cd app
npm install        # only the first time
npx expo start --web
```

A browser tab should open with the quiz. (If it doesn't, press `w` in that terminal or open the URL it prints.)

To run on your **phone** instead: install Expo Go, then press `a` (Android) or scan the QR code shown by `npx expo start`. Make sure the phone and computer are on the same Wi‑Fi, and that `BASE_URL` in `app/src/services/api.js` points to your computer's local IP instead of `localhost`.

### 3. Play multiplayer (two tabs = two players)

With the server AND the app running, open **two browser tabs** at the Expo web URL (the one `npx expo start --web` printed, e.g. `http://localhost:8081`):

1. **Tab 1:** tap **Multiplayer** → type a name → **Create Room**. Write down the 4-letter room code it shows.
2. **Tab 2:** tap **Multiplayer** → type a different name → type the code → **Join**.
3. Back in **Tab 1** (the host), in the lobby pick how many questions (10–50) with the chips, then tap **Start Game** once it's enabled.
4. Both tabs now show the **same question** with a 15-second countdown — race to answer! (The round uses the count the *creator* chose.)
5. After the reveal, results appear; the host can tap **Play again**.

> Want a friend to join from their own machine? They connect to the same Expo URL over your Wi‑Fi, and `BASE_URL` in `app/src/services/api.js` must point at your computer's LAN IP instead of `localhost`.

---

## How it all works

```
       1. App asks for questions              2. Server asks Open Trivia DB
  ┌──────────────┐   fetch(...)   ┌──────────────────┐   fetch(...)   ┌────────────────┐
  │   Expo app   │ ─────────────> │  Node backend    │ ─────────────> │  Open Trivia DB │
  │  (your screen)│                │  localhost:3000  │                │  free API       │
  └──────────────┘ <───────────── └──────────────────┘ <───────────── └────────────────┘
       4. App shows questions           3. Server cleans & shuffles them

The server TIDIES the questions before sending them to the app:
  • decodes HTML codes  ("&amp;" → "&")   because Open Trivia DB returns them,
  • shuffles the answers (Open Trivia DB always lists the correct answer LAST —
    that would spoil the game),
  • splits the request half anime / half general when you ask for the mix.
```

**Why is there a server at all, if Open Trivia DB already exists?**
- The server is the multiplayer *referee*. It holds the correct answers and grades every player − nobody can cheat by looking at their own device.
- It bundles anime + general questions into one request.
- It's where scores can be saved to a database later.

### Multiplayer flow (Phase 2)

```
 Player A                        Server (referee)                    Player B
 ──────────                       ────────────────                    ──────────
 "Create Room"   ───────────────> makes room "WXYZ"  <─────────────── "Join WXYZ"
 Lobby: sees WXYZ + players       answers stay HERE                  Lobby: same players
 Host taps Start ──────────────> fetches questions via Open Trivia DB
                                 sends SAME question to everyone
  15s countdown + 4 answers  <────────────────────────────>  15s countdown + 4 answers
 tap answer ─────────────────> records it  <────────────────  tap answer
                          (reveal only when timer ends OR everyone answered)
   colors reveal  <─────────────── grades + reveals <──────────  colors reveal
   scores update      (3 second pause, then next question)         scores update
 Final Results <──────────────────── "game-finished" ──────────────────── Final Results
```

Key facts about multiplayer:
- The server sends **the question without the correct answer**. It only reveals it after the question closes, so cheating is impossible.
- The 15-second timer per question cuts off anyone who is too slow (they get no points for that question).
- One player makes a room and is the **host**; only the host can start the game.
- Everything lives in `server/src/game.js` — one file you read top to bottom to understand the whole game.

### Random Game (no code — play with strangers)

The home screen also has a **Random Game** button: same live quiz, but **no room code**.
- The **first person to search becomes the host**; everyone else who searches is
  matched into the same room automatically.
- Rooms cap at **10 players** (coded rooms cap at 8).
- The host still picks the question count and starts the game, exactly like a coded room.
- Once a random room fills up, the next person to search starts a fresh room.
- The server uses `search-random` (find-or-create) instead of `create-room` / `join-room`.

---

## The backend's API

| Route | What it does |
|---|---|
| `GET /` | A friendly "server is running" message |
| `GET /questions` | Returns 10 questions (mix of anime + general) |
| `GET /questions?amount=5` | Returns 5 mixed questions |
| `GET /questions?amount=5&category=anime` | Only anime questions |
| `GET /questions?amount=5&category=general` | Only general knowledge |
| `POST /scores` | Save a finished Random Game's standings |
| `GET /scores?limit=20` | The leaderboard (best Random-Game scores) |

Each question looks like this:

```json
{
  "id": 0,
  "category": "Entertainment: Japanese Anime & Manga",
  "difficulty": "easy",
  "question": "Which anime character is a ninja?",
  "answers": ["Sasuke", "Luffy", "Naruto", "Ichigo"],
  "correctAnswer": "Naruto"
}
```

> `correctAnswer` is included so the single-player app can grade you. In multiplayer the server **does not** send it — the server grades answers itself (see `server/src/game.js`).

---

## The app's behavior

- Shows a **spinner** while questions load, and a friendly page if the server is unreachable.
- Displays each question with **4 colored answer buttons**.
- After you pick: the **correct answer turns green**, a wrong pick turns **red**, others fade.
- Tracks your **score** and shows a results page with a percent score and a "Play again" button.

---

## Configuration you'll touch most

| What | Where | Notes |
|---|---|---|
| Backend address | `app/src/services/api.js` → `BASE_URL` | `localhost` for the web version; your computer's LAN IP for a real phone; the deployed backend URL (set via `EXPO_PUBLIC_API_URL` at build time) |
| Questions per round | solo: picker before the game; multiplayer: the **host picks in the lobby** | pick 10, 20, 30, 40, or 50 (default 10) |
| Categories | `server/src/opentdb.js` → `CATEGORIES` | `9` = General Knowledge, `31` = Japanese Anime & Manga |

---

## Configuring multiplayer (quick knobs)

| What | Where | Notes |
|---|---|---|
| Seconds per question | `server/src/game.js` → `QUESTION_SECONDS` | default 15 |
| Questions per multiplayer game | server uses the **host's pick** | `server/src/game.js` → `ALLOWED_AMOUNTS` (10–50; default 10) |
| Max players per room | `server/src/game.js` → `MAX_PLAYERS` | default 8 |

## Switching the language (English / Français)

Tap the **⚙ gear** on the home screen to open Settings, then pick **English** or
**Français**. The whole app switches instantly, *and* the questions follow:

- **English** — questions come from Open Trivia DB, as always (fresh every time).
- **French** — English questions are **translated live** on the server (via the
  free MyMemory API) before being sent to the app, so you get just as many
  French questions as English ones.

> Why live translation? Open Trivia DB accepts `language=fr` but its French pool is
> nearly empty for our categories, so it would silently send **English** questions.
> Instead, our own server fetches the English questions and translates them
> (`server/src/translate.js`). Each round takes ~1 second longer as questions are
> translated. If the translation service is unavailable, we send the English
> question as-is so the game never breaks.

Your choice is **remembered** on the device (AsyncStorage), so it stays even if
you close the app. All translations live in `app/src/i18n/strings.js` — add a
word to both the `en` and `fr` lists and it's translated everywhere.

---

## Saved scores (Phase 3)

Every finished **Random Game** match is automatically saved to a database so
players can compare their best results over time. Solo and coded-room games
are **not** stored — only Random games.

**How it works:**
- When a Random Game finishes, the host's app sends every player's result to
  `POST /scores` on the server.
- The server stores each player's name, score, total questions, and a
  percentage (`round(score/total × 100)`). The percentage is what the
  leaderboard sorts by, so a clean 10/10 beats a longer 40/50 game.
- Anyone can view the leaderboard from the home screen — best percentages
  first.

**Local dev:** scores live in memory (lost when the server restarts) — no
setup needed. **On Render:** scores are stored in PostgreSQL and persist
forever.

---

## Deploying to Render

Render hosts three things for us: the backend (Node server), a PostgreSQL
database, and a static web site. Everything is defined in **`render.yaml`**
at the repo root, so the whole stack can be created in one click.

### Live URLs

- **Web app (play):** https://samsuquizz-web.onrender.com
- **Backend:** https://samsuquizz-backend.onrender.com

> Render's **free** plan serves web requests quickly but spins a web service
> down after ~15 minutes of inactivity. The first request after that takes a
> few seconds to wake it back up — a normal free-tier cold start.

### How it's set up

1. **Push the repo to GitHub.**
2. On render.com, click **New + → Blueprint**, pick the repo, and **Apply**.
   Render reads `render.yaml` and creates three resources:
   - **samsuquizz-backend** — Node web service (`server/`), `npm install` +
     `npm start`. Its `DATABASE_URL` is filled in automatically from the
     database.
   - **samsuquizz-web** — static site built from `app/` via
     `npm ci && npx expo export --platform web`, publishing the `app/dist`
     folder. `EXPO_PUBLIC_API_URL` is baked in so the app knows the backend's
     URL.
   - **samsuquizz-postgres** — the free PostgreSQL database that stores
     Random-Game scores.
3. Every push to `master` redeploys the affected service automatically.

### What to change if you rename anything

- Service names → their `.onrender.com` URLs change.
- If you rename the backend, update the `EXPO_PUBLIC_API_URL` value under
  the `samsuquizz-web` service in `render.yaml` so the built app talks to it.
- `DATABASE_URL` is wired via the `fromDatabase` reference in `render.yaml`;
  the `name` there must match the database's `name` exactly.

---

## Roadmap

- **Phase 1 (✅ done)** — Single-player quiz: backend → Open Trivia DB → app.
- **Phase 2 (✅ done)** — Real-time multiplayer with Socket.io: create/join rooms with a code, everyone on the same question racing to answer, live scoreboard, server-side grading so no one can cheat.
- **Language switcher (✅ done)** — Settings ⚙ to pick English or Français; the whole app and the questions switch, and your choice is remembered.
- **Phase 3 — scores (✅ done)** — Random-Game scores saved to the database, persistent leaderboard viewable from the home screen. Only Random-Game matches are saved; in-memory locally, PostgreSQL on Render.
- **Phase 3 — deploy (✅ done)** — Entire stack deployed to Render via `render.yaml`: backend + PostgreSQL + static web site.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| App shows "Could not reach the server" | Start the server first (`npm run dev` in `server/`). Check `BASE_URL`. |
| Multiplayer can't connect | Server must be running; open the app in at least one browser tab. |
| Room code "not found" | Codes are 4 letters, uppercase. Make sure the game hasn't already started in that room. |
| Web page is blank / just a white screen | Press `r` in the Expo terminal to reload the bundle. |
| CORS error in the browser console | For HTTP: `app.use(cors())`. For WebSocket: the `cors: { origin: true }` option in `server/index.js` — both are already set. |
| "Only X questions available" | Open Trivia DB has limited questions for some categories; lower `amount` in the URL. |