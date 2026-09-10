// api.js
// ==========================================================================
// HOW THE APP TALKS TO THE SERVER
// ==========================================================================
//
// Every line of code that fetches data from our backend lives in this one
// file. That way, if the server's address ever changes, you only edit the
// single BASE_URL below instead of hunting through the whole app.
//
// This phase is SINGLE-PLAYER: the app asks the server for questions and the
// server returns a JSON list of them.
// (In Phase 2 we'll add multiplayer on top — joining rooms, racing friends —
// and that real-time connection will also live in this file or a sibling.)
// ==========================================================================

// The address of our BACKEND server.
// ---------------------------------------------------------------------------
//   Local dev (default):  localhost = this same computer, for the web version.
//   Real phone on your Wi-Fi:  set EXPO_PUBLIC_API_URL (or edit below) to your
//     computer's LAN IP, e.g. http://192.168.1.5:3000
//   After we deploy to RAILWAY:  set EXPO_PUBLIC_API_URL to the backend's URL,
//     e.g. https://quiz-backend.up.railway.app
//
// EXPO_PUBLIC_API_URL lets you point the app at a different server WITHOUT
// editing code — pass it when you build/deploy (Expo bakes it in at build
// time). The socket connection (socket.js) reuses this same BASE_URL.
// ---------------------------------------------------------------------------
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

/**
 * Ask the server for quiz questions.
 *
 * @param {number}  amount       how many questions to fetch (default 10)
 * @param {string}  [category]   "anime" or "general" — leave it out for a mix
 * @param {string}  [language]   "en" or "fr" — "fr" asks the server for French
 *                               questions (it falls back to English if none exist)
 * @returns {Promise<Array>} the list of question objects sent back by the server
 */
export async function fetchQuestions(amount = 10, category, language) {
  // Build the URL, e.g.  http://localhost:3000/questions?amount=10&category=anime&language=fr
  let url = `${BASE_URL}/questions?amount=${amount}`;
  if (category) {
    url += `&category=${category}`;
  }
  if (language && language !== "en") {
    url += `&language=${language}`;
  }

  // "fetch" returns a Response. When the call itself succeeds we get here,
  // even if the server replied with an error code.
  const response = await fetch(url);

  if (!response.ok) {
    // response.ok is false for status codes like 404 and 500.
    // We mark the error with isServerError so App.js can translate the
    // message into the player's language instead of showing a hardcoded one.
    const error = new Error("Could not reach the server.");
    error.isServerError = true;
    throw error;
  }

  // .json() turns the server's reply into a normal JavaScript array.
  return response.json();
}

/**
 * Get the leaderboard: the best RANDOM-game scores, best % first.
 * @param {number} limit how many to fetch (default 20)
 * @returns {Promise<Array>} rows like { playerName, score, total, percent, createdAt }
 */
export async function fetchScores(limit = 20) {
  const response = await fetch(`${BASE_URL}/scores?limit=${limit}`);
  if (!response.ok) {
    const error = new Error("Could not reach the server.");
    error.isServerError = true;
    throw error;
  }
  return response.json();
}

/**
 * Save a finished RANDOM game's standings (the host sends the whole match).
 * @param {Array<{playerName: string, score: number, total: number}>} scores
 */
export async function postScores(scores) {
  const response = await fetch(`${BASE_URL}/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scores }),
  });
  if (!response.ok) {
    const error = new Error("Could not save scores.");
    error.isServerError = true;
    throw error;
  }
  return response.json();
}