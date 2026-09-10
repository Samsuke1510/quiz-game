// QuestionCard.js
// ==========================================================================
// SHOWS ONE QUIZ QUESTION AND ITS ANSWER BUTTONS
// ==========================================================================
//
// This is a REUSABLE component. The app hands it a single question object,
// and this file is in charge of drawing it and reacting to taps. Using
// components like this keeps the code easy to read and reuse.
//
// The three stages of a question:
//   1. WAITING — every answer button looks the same, the player picks one.
//   2. REVEAL  — the pick is locked in. Correct answer turns GREEN. If the
//                player picked wrong, that pick turns RED. Everything else
//                fades to gray.
//   3. NEXT    — a "Next question" (or "See results") button appears.
//
// A quick note on the function line below: everything inside its parentheses
// are called "props" — values the parent (App.js) passes in for us to use:
//   question : one question object, e.g. { question, answers, correctAnswer, ... }
//   number   : which question number this is (1-based, for the header)
//   total    : how many questions are in the round
//   score    : the player's score so far (just for display)
//   onNext   : a callback function we call when the player taps Next
// ==========================================================================

import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLanguage } from "../i18n/LanguageContext";

export default function QuestionCard({ question, number, total, score, onNext }) {
  const { t } = useLanguage();
  // "picked" remembers which answer the player tapped. null = not answered yet.
  const [picked, setPicked] = useState(null);

  // Once picked is set, the question is "answered" and gets locked.
  const answered = picked !== null;

  // Is this the last question of the round?
  const isLast = number === total;

  // Called when the player taps an answer button.
  function handlePick(answer) {
    if (answered) return; // ignore taps once we've already locked in
    setPicked(answer);
  }

  // Called when the player taps Next. We compare the pick to the correct
  // answer and report true/false to the parent, which updates the score.
  function handleNext() {
    const isCorrect = picked === question.correctAnswer;
    onNext(isCorrect);
  }

  return (
    <View style={styles.container}>
      {/* Top bar: which question we're on + the running score */}
      <Text style={styles.progress}>
        {t("questionOf", { number, total })}   •   {t("score", { score })}
      </Text>

      {/* Category tag, e.g. "Entertainment: Anime & Manga" */}
      <Text style={styles.category}>{question.category}</Text>

      {/* The question text itself */}
      <Text style={styles.question}>{question.question}</Text>

      {/* One button per answer choice */}
      {question.answers.map((answer, i) => {
        // Pick the button's color depending on the stage:
        const buttonStyle =
          !answered
            ? styles.answerBlue            // waiting: all buttons are blue
            : answer === question.correctAnswer
              ? styles.answerGreen         // reveal: the right one turns green
              : answer === picked
                ? styles.answerRed         // reveal: a wrong pick turns red
                : styles.answerGray;       // reveal: the rest fade to gray

        return (
          <TouchableOpacity
            key={i}                  // React needs a unique "key" for each item in a list
            style={[styles.answer, buttonStyle]}
            onPress={() => handlePick(answer)}
            disabled={answered}      // no re-taps once the question is locked
          >
            <Text style={styles.answerText}>{answer}</Text>
          </TouchableOpacity>
        );
      })}

      {/* The Next button only appears AFTER the player has answered */}
      {answered && (
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextText}>{isLast ? t("seeResults") : t("nextQuestion")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ---- Styling ------------------------------------------------------------
// StyleSheet.create just bundles our style rules together. Each color is
// chosen to match the app's dark, game-like theme.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: "#0f172a",
  },
  progress: {
    color: "#cbd5e1",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  category: {
    color: "#818cf8",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: 12,
  },
  question: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 30,
    textAlign: "center",
    marginBottom: 28,
  },
  answer: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: "center",
  },
  answerBlue: { backgroundColor: "#2563eb" },
  answerGreen: { backgroundColor: "#16a34a" },
  answerRed: { backgroundColor: "#dc2626" },
  answerGray: { backgroundColor: "#334155" },
  answerText: { color: "#ffffff", fontSize: 17, fontWeight: "600" },
  nextButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },
  nextText: { color: "#ffffff", fontSize: 17, fontWeight: "700" },
});