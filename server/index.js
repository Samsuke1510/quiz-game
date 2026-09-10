// index.js
// ==========================================================================
// THE BACKEND (also called the "server") OF OUR QUIZ GAME
// ==========================================================================
//
// A beginner-friendly tour of what this file does:
//   1. It creates a web server using a library called Express.
//   2. That server waits for requests from our app (and from your browser).
//   3. When the app asks for quiz questions, the server goes out to the
//      "Open Trivia DB" website, downloads fresh questions, cleans them up,
//      and sends them back to the app as JSON.
//
// Why do we need a server at all if Open Trivia DB already exists?
//   - For MULTIPLAYER (later phases) the server becomes the "referee". It
//     keeps the correct answers a secret and grades every player, so nobody
//     can cheat by peeking at their own device.
//   - It lets us bundle anime + general questions into one easy request.
//   - Later we can save scores in a database.
//
// You do NOT need to write any server file from scratch to run this —
// just "npm install" and "npm run dev" inside the server folder.
// ==========================================================================

import express from "express"; // Express: a tiny, well-known library for making web servers
import cors from "cors";       // CORS: lets our web app (a different "origin") call this server
import http from "http";       // Node's built-in HTTP server. Socket.io needs this to attach to.
import { Server } from "socket.io"; // Socket.io: the library that powers our real-time multiplayer.
import { getQuestions } from "./src/opentdb.js"; // our helper that talks to Open Trivia DB
import { registerSocketHandlers } from "./src/game.js"; // the multiplayer game logic (Phase 2)
import { saveRandomScores, getTopRandomScores } from "./src/db.js"; // Random-Game scores (Phase 3)

const app = express(); // build the Express app (handles the classic /questions HTTP requests)
const PORT = process.env.PORT || 3000; // On Railway the PORT number is given to us; locally we use 3000

// Allow any website to talk to this server. (Perfectly fine for learning;
// later you might restrict it to your own domains.)
app.use(cors());

// ---------------------------------------------------------------------------
// Route 1: GET /
// A friendly hello so visiting the server's address in a browser isn't empty.
// ---------------------------------------------------------------------------
app.get("/", (req, res) => {
  res.json({ message: "Quiz server is running! Try /questions" });
});

// ---------------------------------------------------------------------------
// Route 2: GET /questions
// The route the app calls to get quiz questions.
//
//   Try it in your browser:  http://localhost:3000/questions
//   With options:            http://localhost:3000/questions?amount=5&category=anime
//
//   amount   = how many questions you want (default 10)
//   category = "anime" or "general" (if you leave it out, you get a mix of both)
//   language = "en" or "fr" — "en" returns the raw English questions,
//              "fr" translates them live into French first (see translate.js)
// ---------------------------------------------------------------------------
app.get("/questions", async (req, res) => {
  try {
    // req.query is the part of the URL after "?" (the "query parameters").
    // Everything there is a string, so we convert amount to a number.
    const amount = Number(req.query.amount) || 10;
    const category = req.query.category; // e.g. "anime" — or undefined
    const language = req.query.language; // e.g. "fr" — or undefined

    // Go fetch questions from Open Trivia DB (see src/opentdb.js).
    const questions = await getQuestions({ amount, category, language });

    // Send them back to the app with a 200 ("OK") status.
    res.status(200).json(questions);
  } catch (err) {
    // If anything above failed, log it here (where only you see it) and send
    // a clean error message to the app.
    console.error("GET /questions failed:", err);
    res.status(500).json({ error: "Could not fetch questions. Try again later." });
  }
});

// ---------------------------------------------------------------------------
// Route 3: POST /scores — save a finished RANDOM game's standings (Phase 3)
// The app (the host of a Random Game) sends EVERY player's result at once:
//   { "scores": [{ "playerName": "Bob", "score": 7, "total": 10 }, ...] }
// ---------------------------------------------------------------------------
app.post("/scores", async (req, res) => {
  try {
    // Express doesn't parse JSON bodies by default — we read the raw chunks
    // and JSON.parse them ourselves (no extra middleware needed).
    let body = "";
    for await (const chunk of req) body += chunk;
    const data = JSON.parse(body || "{}");

    const scores = Array.isArray(data.scores) ? data.scores : [];
    // Only keep rows that look reasonable, so a bad client can't crash the DB.
    const clean = scores
      .filter((s) => typeof s.playerName === "string" && Number.isFinite(Number(s.score)))
      .map((s) => ({
        playerName: String(s.playerName).slice(0, 20),
        score: Math.max(0, Math.floor(Number(s.score))),
        total: Math.max(1, Math.floor(Number(s.total) || 0)),
      }));

    await saveRandomScores(clean);
    res.status(201).json({ ok: true, saved: clean.length });
  } catch (err) {
    console.error("POST /scores failed:", err);
    res.status(400).json({ error: "Could not save scores." });
  }
});

// ---------------------------------------------------------------------------
// Route 4: GET /scores — the leaderboard (best Random-Game scores first)
//   Try it:  http://localhost:3000/scores
//   Options: http://localhost:3000/scores?limit=10
// ---------------------------------------------------------------------------
app.get("/scores", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 20));
    const rows = await getTopRandomScores(limit);
    res.status(200).json(rows);
  } catch (err) {
    console.error("GET /scores failed:", err);
    res.status(500).json({ error: "Could not load scores." });
  }
});

// ---------------------------------------------------------------------------
// MULTIPLAYER (Phase 2)
// ---------------------------------------------------------------------------
// The regular HTTP server above already handles single-player questions.
// For MULTIPLAYER we need a second, always-open connection type called a
// WebSocket. Socket.io manages those WebSockets for us, and it needs a raw
// HTTP server to hang onto — so we create "server" from our Express app.
//
//   Express  ->  server (plain Node HTTP)  ->  socket.io (WebSockets on top)
//                |                                  |
//                +-- /questions (single player)     +-- rooms, chat, game events

const server = http.createServer(app);

// Create the Socket.io layer. "cors: origin: true" says: accept connections
// from any address. That's what we want in development, because our Expo web
// app runs on a DIFFERENT port (8081) and has to be allowed to connect.
const io = new Server(server, {
  cors: { origin: true, methods: ["GET", "POST"] },
});

// Tell Socket.io how to react to multiplayer messages, rooms, disconnects, etc.
// All of that lives in src/game.js so this file stays about the HTTP server.
registerSocketHandlers(io);

// Finally, start listening. Until this line, the server isn't actually on yet.
server.listen(PORT, () => {
  console.log(`Quiz server running at http://localhost:${PORT}`);
});