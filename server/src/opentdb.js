// opentdb.js
// ==========================================================================
// WHERE THE QUESTIONS COME FROM
// ==========================================================================
//
// This file's job is to hand the app a tidy list of questions:
//   1. It asks the free "Open Trivia DB" API for ENGLISH questions.
//   2. If the player picked FRENCH, it translates those English questions
//      into French on the server (see translate.js) before sending them out.
//   3. Either way, it cleans the questions and shuffles the answer choices so
//      the correct one isn't always last (which would spoil the game!).
//
// Open Trivia DB reference: https://opentdb.com/api_config.php
// Their API is free and needs no account, but the questions come with HTML
// codes like "&amp;" and "&#039;" that we must decode into "&" and "'".
// The "he" package below does that decoding for us.
//
// (A note on Open Trivia DB's own "language" parameter: it accepts
// "language=fr" but its French pool is nearly empty, so it silently returns
// ENGLISH questions. That's why we fetch English and translate ourselves.)
// ==========================================================================

import he from "he";
import { translateQuestion } from "./translate.js"; // live EN -> FR translation

// The category numbers used by Open Trivia DB (from their official docs).
//   9  = General Knowledge
//   31 = Entertainment: Japanese Anime & Manga
export const CATEGORIES = {
  GENERAL: 9,
  ANIME: 31,
};

/**
 * Fetch quiz questions and clean them up.
 *
 * @param {object}  options
 * @param {number}  [options.amount]   How many questions to return (default 10)
 * @param {string}  [options.category] "anime", "general", or undefined for a mix
 * @param {string}  [options.language] "en" (English) or "fr" (translated French)
 * @returns {Promise<object[]>} A tidy list of question objects
 */
export async function getQuestions({ amount = 10, category, language } = {}) {
  // Always start from the ENGLISH questions (they're the freshest and the
  // API has the most of them). We translate to French afterwards if needed.
  const half = Math.ceil(amount / 2);
  const requests =
    category === "anime"
      ? [{ category: CATEGORIES.ANIME, amount }]
      : category === "general"
        ? [{ category: CATEGORIES.GENERAL, amount }]
        : [
            { category: CATEGORIES.ANIME, amount: half },
            { category: CATEGORIES.GENERAL, amount: amount - half },
          ];

  // Promise.all runs all the requests at the same time so we aren't waiting
  // on them one after another.
  const rawResults = await Promise.all(requests.map(fetchFromOpenTDB));

  // Flatten the two arrays into one, clean each question, and shuffle.
  const questions = shuffle(rawResults.flat().map(cleanQuestion));

  // FRENCH: translate every question (text + answers) before returning.
  // Each question becomes its own translated copy; if translation is slow,
  // this is the one place we wait for it. We work through the questions in
  // small batches so a 50-question round doesn't fire up to 250 translation
  // requests at the same moment (a batch is 5 questions x 5 texts = 25 calls).
  if (language === "fr") {
    const translated = [];
    for (let i = 0; i < questions.length; i += 5) {
      const batch = await Promise.all(questions.slice(i, i + 5).map(translateQuestion));
      translated.push(...batch);
    }
    return translated;
  }

  return questions;
}

/**
 * Ask Open Trivia DB for questions and check the request went well.
 * @returns {Promise<Array>} the raw "results" array from their API
 */
async function fetchFromOpenTDB({ category, amount }) {
  const url = `https://opentdb.com/api.php?amount=${amount}&category=${category}`;

  // "fetch" is built into modern Node — it does a web request and gives us a response.
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open Trivia DB answered with status ${response.status}`);
  }

  const data = await response.json();

  // Open Trivia DB replies with response_code 0 when all went well,
  // or another code when it couldn't (e.g. not enough questions).
  if (data.response_code !== 0) {
    throw new Error(`Open Trivia DB returned response_code ${data.response_code}`);
  }

  return data.results;
}

/**
 * Turn ONE raw question from Open Trivia DB into a display-friendly object.
 *
 * A raw question looks like this:
 *   {
 *     category: "...",
 *     difficulty: "easy",
 *     question: "Who is ...?",
 *     correct_answer: "Naruto",
 *     incorrect_answers: ["Sasuke", "Luffy", "Ichigo"]
 *   }
 */
function cleanQuestion(raw, index) {
  // Build the full list of answer choices = the 3 wrong ones + the correct one.
  // We decode them all ("&amp;" -> "&") while we're at it.
  const answers = raw.incorrect_answers
    .map(decode)                       // the wrong answers
    .concat(decode(raw.correct_answer)); // then the correct answer

  return {
    id: index,                 // a simple number id so the app can tell questions apart
    category: decode(raw.category),
    difficulty: raw.difficulty, // "easy" | "medium" | "hard"
    question: decode(raw.question),
    answers: shuffle(answers),  // answers in a random order (correct one is NOT last)
    correctAnswer: decode(raw.correct_answer), // kept for grading the single-player game
  };
}

/** Decode HTML entities. "&amp;" -> "&", "&#039;" -> "'", and so on. */
function decode(text) {
  return he.decode(text);
}

/**
 * Shuffle an array. We use the Fisher–Yates algorithm, the classic way to
 * shuffle — it visits each spot once and swaps it with a random spot.
 */
function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // a random index from 0..i
    [list[i], list[j]] = [list[j], list[i]]; // swap the two spots
  }
  return list;
}