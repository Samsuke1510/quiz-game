// game.js
// ==========================================================================
// THE MULTIPLAYER GAME ENGINE (Phase 2)
// ==========================================================================
//
// This file is the heart of multiplayer. It creates rooms, runs the games,
// and acts as the REFEREE: it keeps all the correct answers secret, grades
// every player's answer, and only reveals the answers after a question ends.
//
// Two services talk to each other over a real-time connection:
//   - the SERVER (this file, inside `server/`)  — the referee
//   - the APP (the game the players see)         — the players
//
// This file listens for "events". A player in the app sends us an event like
// "I want to answer 'Naruto'", and we reply with our own events telling
// everyone what's happening ("here's the reveal!", "here's the next
// question!", "this player left").
//
// The event list (names in quotes) is the "protocol" — a shared language
// both sides understand. Keep this file and the app's MultiplayerScreen.js
// in sync: every event name and its payload must match on both sides.
// ==========================================================================

import { getQuestions } from "./opentdb.js";

// ---- Tunable settings ------------------------------------------------
const QUESTION_SECONDS = 15; // how long each player has to answer a question
const GAME_AMOUNT = 10;      // default questions per multiplayer game
const ALLOWED_AMOUNTS = [10, 20, 30, 40, 50]; // the counts the app offers
const MAX_PLAYERS = 8;       // max players per CODED room
const RANDOM_MAX_PLAYERS = 10; // max players per RANDOM (no-code) room
const REVEAL_PAUSE_MS = 3000; // pause after the reveal so everyone can see it

// ---- Memory (no database needed yet) ---------------------------------
const rooms = new Map();        // roomCode -> Room
const socketToRoom = new Map(); // socketId -> roomCode  (lets us find a room fast)

// Register all the multiplayer logic with Socket.io.
export function registerSocketHandlers(io) {
  // io.on("connection", ...) runs once for EVERY player that connects.
  // Inside it, `socket` = THIS particular player's live connection.
  io.on("connection", (socket) => {
    // ------------- CREATE A ROOM ("I want to make a new game") --------
    socket.on("create-room", ({ playerName }) => {
      const code = generateRoomCode();

      // Build the room object. `Map` is like an object but keyed by anything.
      const room = createRoom(code, socket.id);

      addPlayer(room, socket, playerName);
      rooms.set(code, room);
      socketToRoom.set(socket.id, code);
      socket.join(code); // joins the Socket.io room "channel" named after the code

      // Tell ONLY the creator that their room exists, and hand back the player list.
      socket.emit("room-created", {
        roomCode: code,
        players: roomPlayers(room),
      });
    });

    // ------------- JOIN A ROOM ("my friend gave me a code") -----------
    socket.on("join-room", ({ roomCode, playerName }) => {
      const code = String(roomCode || "").toUpperCase().trim();
      const room = rooms.get(code);

      // A few friendly rules before letting someone in.
      // Each "error" has a machine-readable "code" (like room-not-found) plus
      // an English "message". The app uses the code to show the error in the
      // player's language, and keeps the message as a fallback.
      if (!room) {
        return socket.emit("error", { code: "room-not-found", roomCode: code, message: `Room "${code}" not found.` });
      }
      if (room.stage !== "lobby") {
        return socket.emit("error", { code: "game-already-started", message: "A game already started in that room." });
      }
      if (room.players.size >= MAX_PLAYERS) {
        return socket.emit("error", { code: "room-full", message: "That room is full." });
      }

      addPlayer(room, socket, playerName);
      socketToRoom.set(socket.id, code);
      socket.join(code);

      socket.emit("room-joined", {
        roomCode: code,
        players: roomPlayers(room),
      });

      // Announce the newcomer to everyone else already in the room.
      socket.to(code).emit("player-joined", { player: playerInfo(room.players.get(socket.id)) });
    });

    // ------------- RANDOM GAME (no room code — just "search") ---------
    // The first player to search creates a random room and becomes host.
    // Everyone after that is slipped into that same open room, until it's
    // full (RANDOM_MAX_PLAYERS), then a fresh room starts for the next wave.
    socket.on("search-random", ({ playerName } = {}) => {
      const existing = findRandomRoom();
      const isNew = !existing;

      // Create a new random room (the searcher is its host) or reuse one.
      const room = existing || createRoom(generateRoomCode(), socket.id, { random: true });
      if (isNew) rooms.set(room.code, room); // remember it so later searches can join it

      addPlayer(room, socket, playerName);
      socketToRoom.set(socket.id, room.code);
      socket.join(room.code);

      if (isNew) {
        // The creator -> the host. Same reply as "create-room".
        socket.emit("room-created", {
          roomCode: room.code,
          players: roomPlayers(room),
        });
      } else {
        // Matched into someone's room -> same reply as "join-room".
        socket.emit("room-joined", {
          roomCode: room.code,
          players: roomPlayers(room),
        });
        socket.to(room.code).emit("player-joined", { player: playerInfo(room.players.get(socket.id)) });
      }
    });

    // ------------- START THE GAME (host presses "Start") -------------
    // The host's payload carries the language ("en"/"fr") AND how many
    // questions this round should have (10-50 from the pregame screen).
    socket.on("start-game", async ({ language, amount } = {}) => {
      const room = findRoom(socket.id);
      if (!room) return socket.emit("error", { code: "not-in-room", message: "You are not in a room." });
      if (room.host !== socket.id) return socket.emit("error", { code: "host-only", message: "Only the host can start the game." });
      if (room.stage === "playing") return socket.emit("error", { code: "game-in-progress", message: "A game is already in progress." });
      if (room.players.size < 2) return socket.emit("error", { code: "need-players", message: "You need at least 2 players to start." });

      // Start fresh: clear any leftover timer, reset scores, mark everyone connected.
      clearTimers(room);
      room.questionOpen = false;
      room.answers = new Map();
      room.currentQuestionIndex = 0;
      for (const player of room.players.values()) {
        player.score = 0;
        player.disconnected = false;
      }

      // Use the host's requested count, but only if it's one of the ones the
      // app actually offers — anything else falls back to the default.
      const gameAmount = ALLOWED_AMOUNTS.includes(Number(amount)) ? Number(amount) : GAME_AMOUNT;

      // The referee fetches ONE fresh set of questions for the whole room,
      // in the host's chosen language and requested count.
      try {
        room.questions = await getQuestions({ amount: gameAmount, language });
      } catch (err) {
        console.error("start-game fetch failed:", err);
        room.stage = "lobby";
        return io.to(room.code).emit("error", { code: "could-not-fetch-questions", message: "Could not fetch questions. Try starting again." });
      }
      if (room.questions.length === 0) {
        room.stage = "lobby";
        return io.to(room.code).emit("error", { code: "no-questions-available", message: "No questions available. Try again." });
      }

      room.stage = "playing";
      io.to(room.code).emit("game-started", {
        totalQuestions: room.questions.length,
        questionTime: QUESTION_SECONDS,
      });

      startNextQuestion(io, room);
    });

    // ------------- A PLAYER ANSWERS -----------------------------------
    socket.on("submit-answer", ({ answer }) => {
      const room = findRoom(socket.id);
      // Guard against late/misbehaving submissions:
      if (!room || room.stage !== "playing" || !room.questionOpen) return;
      if (room.answers.has(socket.id)) {
        return socket.emit("error", { code: "already-answered", message: "You already answered this question." });
      }

      // The referee records the answer. The correct answer stays secret — we
      // only compare it to this submission later, inside revealQuestion.
      room.answers.set(socket.id, { answer: String(answer), timestamp: Date.now() });

      // If EVERY player still in the game has answered, we don't need to wait
      // for the timer — close the question early so nobody is kept waiting.
      if (room.answers.size >= countActive(room)) {
        revealQuestion(io, room);
      }
    });

    // ------------- A PLAYER LEAVES / DISCONNECTS ----------------------
    socket.on("disconnect", () => {
      const code = socketToRoom.get(socket.id);
      socketToRoom.delete(socket.id);
      if (!code) return;

      const room = rooms.get(code);
      if (!room) return;

      const player = room.players.get(socket.id);
      room.players.delete(socket.id);
      if (player) io.to(code).emit("player-left", { playerId: socket.id, name: player.name });

      // If the HOST left, hand the host badge to whoever is left.
      if (room.host === socket.id && room.players.size > 0) {
        room.host = room.players.keys().next().value;
        io.to(code).emit("host-changed", { hostId: room.host });
      }

      // If the room is empty, remove it completely (and stop all timers).
      if (room.players.size === 0) {
        clearTimers(room);
        rooms.delete(code);
        return;
      }

      // Mid-question, if everyone remaining has now answered, close early.
      if (room.stage === "playing" && room.answers.size >= countActive(room)) {
        revealQuestion(io, room);
      }
    });
  });
}

// ==========================================================================
// HELPER FUNCTIONS (the "tools" the event handlers above use)
// ==========================================================================

/**
 * Make a brand-new room object. Rooms are normally made with a room code
 * ("coded" rooms, max MAX_PLAYERS). Random rooms are made with the
 * { random: true } option: no code is shown to players and they can hold up
 * to RANDOM_MAX_PLAYERS.
 */
function createRoom(code, hostSocketId, { random = false } = {}) {
  return {
    code,                    // e.g. "ABCD" (still used internally, even for random rooms)
    random,                  // true = a "Random Game" room (no code, 10 players)
    host: hostSocketId,      // socket.id of whoever created the room
    players: new Map(),      // socketId -> { id, name, score, disconnected }
    stage: "lobby",          // "lobby" | "playing" | "finished"
    questions: [],           // the round's questions (server keeps correctAnswer here)
    currentQuestionIndex: 0, // which question we're on
    questionOpen: false,     // true while a question is accepting answers
    answers: new Map(),      // socketId -> { answer, timestamp } for the CURRENT question
    timerHandle: null,       // the countdown interval
    revealPauseHandle: null, // the 3s pause before the next question
    timeLeft: 0,
    questionCountdown: QUESTION_SECONDS,
  };
}

/** Add a player to a room with a tidied-up name. */
function addPlayer(room, socket, playerName) {
  const name = String(playerName || "Player").trim().slice(0, 20) || "Player";
  room.players.set(socket.id, { id: socket.id, name, score: 0, disconnected: false });
}

/** A player's public, safe-to-send shape (no internal flags). */
function playerInfo(player) {
  return { id: player.id, name: player.name, score: player.score };
}

/** The public list of players for a room (skips disconnected ones). */
function roomPlayers(room) {
  return [...room.players.values()]
    .filter((p) => !p.disconnected)
    .map(playerInfo);
}

/** Find which room a socket belongs to, or undefined. */
function findRoom(socketId) {
  const code = socketToRoom.get(socketId);
  return code ? rooms.get(code) : undefined;
}

/** How many players are still connected and playing? */
function countActive(room) {
  return [...room.players.values()].filter((p) => !p.disconnected).length;
}

/** Create a unique 4-letter room code. */
function generateRoomCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code;
  do {
    code = "";
    for (let i = 0; i < 4; i++) {
      code += letters[Math.floor(Math.random() * letters.length)];
    }
  } while (rooms.has(code)); // regenerate until it's one nobody is using
  return code;
}

/**
 * Find a random room that's still open for new players: a "Random Game"
 * room, still in the lobby, that hasn't hit the random-player cap.
 * Returns undefined when there's no room to join (=> create a fresh one).
 */
function findRandomRoom() {
  for (const room of rooms.values()) {
    if (room.random && room.stage === "lobby" && room.players.size < RANDOM_MAX_PLAYERS) {
      return room;
    }
  }
  return undefined;
}

/** Stop any running timers for a room (always do this before cleanup). */
function clearTimers(room) {
  if (room.timerHandle) clearInterval(room.timerHandle);
  if (room.revealPauseHandle) clearTimeout(room.revealPauseHandle);
  room.timerHandle = null;
  room.revealPauseHandle = null;
}

/**
 * Build the safe copy of a question that we send to players.
 * The whole point: we DROP correctAnswer here, so no player can ever see it
 * until the reveal. Everything else passes through.
 */
function toClientQuestion(question) {
  const { correctAnswer, ...safe } = question; // prettier-ignore
  return safe;
}

/** Send the next question to everyone and start its countdown. */
function startNextQuestion(io, room) {
  const index = room.currentQuestionIndex;

  // Out of questions? Then the game is over.
  if (index >= room.questions.length) return finishGame(io, room);

  // Fresh slate for this question.
  room.questionOpen = true;
  room.answers = new Map();

  const question = room.questions[index];
  io.to(room.code).emit("question", {
    questionNumber: index + 1,
    totalQuestions: room.questions.length,
    question: toClientQuestion(question),
    timeLeft: QUESTION_SECONDS,
  });

  // Start the countdown. Each second we tell everyone how much time is left.
  room.timeLeft = QUESTION_SECONDS;
  clearTimers(room); // safety: never leave an old timer running
  room.timerHandle = setInterval(() => {
    room.timeLeft -= 1;
    io.to(room.code).emit("timer-tick", { timeLeft: room.timeLeft });
    if (room.timeLeft <= 0) {
      revealQuestion(io, room); // time's up
    }
  }, 1000);
}

/**
 * Grade the current question and reveal it. Called when the timer runs out
 * OR when everyone has answered.
 */
function revealQuestion(io, room) {
  // Never reveal twice for the same question.
  if (room.stage !== "playing" || !room.questionOpen) return;
  room.questionOpen = false;
  clearTimers(room);

  const correctAnswer = room.questions[room.currentQuestionIndex].correctAnswer;

  // Grade everyone and build the result list at the same time.
  const answers = [];
  const standings = [];
  for (const [socketId, player] of room.players) {
    if (player.disconnected) continue;

    const submission = room.answers.get(socketId);
    const isCorrect = submission ? submission.answer === correctAnswer : false;
    if (isCorrect) player.score += 1; // 1 point per correct answer

    answers.push({
      playerId: socketId,
      playerName: player.name,
      answer: submission ? submission.answer : null, // null = didn't answer in time
      isCorrect,
    });
    standings.push({ id: socketId, name: player.name, score: player.score, correct: isCorrect });
  }
  standings.sort((a, b) => b.score - a.score); // best score first

  // NOW we tell everyone the correct answer.
  io.to(room.code).emit("reveal", {
    correctAnswer,
    answers,
    standings,
    questionIndex: room.currentQuestionIndex,
  });

  // Small pause so everyone can see the result, then advance.
  room.revealPauseHandle = setTimeout(() => {
    room.revealPauseHandle = null;
    room.currentQuestionIndex += 1;
    if (room.currentQuestionIndex < room.questions.length) {
      startNextQuestion(io, room);
    } else {
      finishGame(io, room);
    }
  }, REVEAL_PAUSE_MS);
}

/** Send the final results to everyone. */
function finishGame(io, room) {
  room.stage = "finished";
  const standings = [...room.players.values()]
    .filter((p) => !p.disconnected)
    .map((p) => ({ id: p.id, name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);

  io.to(room.code).emit("game-finished", { standings, totalQuestions: room.questions.length });
}