// translate.js
// ==========================================================================
// LIVE TRANSLATION VIA MYMEMORY API
// ==========================================================================
//
// When the player picks French, we fetch English questions from Open Trivia DB
// and translate them here on the server before sending them to the app.
//
// MyMemory (https://mymemory.translated.net/) is a free translation API:
//   - No account or API key needed
//   - ~5000 words/day limit (plenty for a quiz game)
//   - ~500 characters per request
//
// We translate each question's text + its 4 answers in parallel (5 API calls
// per question). If the translation API fails for any reason, we keep the
// English text — the game still works, just in English for that item.
// ==========================================================================

const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

/**
 * Translate a single string from English to French.
 * Returns the French text, or the original English if translation fails.
 *
 * @param {string} text - English text to translate
 * @returns {Promise<string>} - French text (or English fallback)
 */
export async function translateText(text) {
  if (!text || typeof text !== "string") return text;

  try {
    const url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=en|fr`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Translate API error: ${response.status}`);
      return text; // fallback to English
    }

    const data = await response.json();

    // MyMemory returns responseStatus 200 on success.
    // The translated text is in data.responseData.translatedText.
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const translated = data.responseData.translatedText;
      // MyMemory sometimes returns the original text wrapped in "UNTRANSLATED(...)"
      // when it can't translate — detect that and fall back to English.
      if (translated.startsWith("UNTRANSLATED(")) return text;
      return translated;
    }

    return text; // fallback to English
  } catch (err) {
    console.error("Translation failed:", err.message);
    return text; // fallback to English
  }
}

/**
 * Translate a full quiz question from English to French.
 * Translates the question text AND all answer choices in parallel.
 *
 * @param {object} question - A clean question object from opentdb.js
 * @returns {Promise<object>} - The same object with French text
 */
export async function translateQuestion(question) {
  // Translate the question text and all 4 answers at the same time (5 parallel calls).
  const [translatedQuestion, ...translatedAnswers] = await Promise.all([
    translateText(question.question),
    ...question.answers.map((a) => translateText(a)),
  ]);

  // Also translate correctAnswer so grading still works on the server.
  const translatedCorrect = await translateText(question.correctAnswer);

  return {
    ...question,
    question: translatedQuestion,
    answers: translatedAnswers,
    correctAnswer: translatedCorrect,
  };
}
