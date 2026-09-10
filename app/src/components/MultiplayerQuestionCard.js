// MultiplayerQuestionCard.js
// ==========================================================================
// SHOWS ONE MULTIPLAYER QUESTION (SERVER DRIVES THE REVEAL)
// ==========================================================================
//
// Looks similar to the single-player QuestionCard, but there is ONE big,
// important difference: this card NEVER learns the correct answer by itself.
//
// Single-player card:  the app grades your answer on the device.
// Multiplayer card:    the SERVER grades it. This card can only show the
//                      reveal once the server sends it (the `reveal` event),
//                      via the `revealData` prop.
//
// So the flow is:
//   1. Server sends the question (no correct answer in it).
//   2. You tap an answer -> we call `onAnswer(answer)` and lock the buttons.
//   3. The server tells everyone "the reveal!" -> this card colors the
//      correct answer green using revealData.correctAnswer.
//
// Props:
//   question     : the question object from the server (NO correctAnswer inside)
//   number       : which question number this is
//   total        : how many questions in the round
//   timeLeft     : seconds left on the countdown (ticked by the server)
//   questionTime : how many seconds the full countdown lasts (for the bar)
//   myAnswer     : the answer I tapped (or null if I haven't)
//   revealed     : true once the server's reveal event has arrived
//   revealData   : the reveal payload { correctAnswer, answers, standings }
//   onAnswer     : callback when I tap an answer
// ==========================================================================

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLanguage } from "../i18n/LanguageContext";

export default function MultiplayerQuestionCard({
  question,
  number,
  total,
  timeLeft,
  questionTime,
  myAnswer,
  revealed,
  revealData,
  onAnswer,
}) {
  const { t } = useLanguage();
  // Have I locked in an answer yet?
  const answered = myAnswer !== null;

  // Width of the countdown bar as a percentage (0-100).
  const barPercent = Math.max(0, Math.min(100, (timeLeft / questionTime) * 100));

  // Choose an answer button's color.
  function buttonStyle(answer) {
    if (revealed) {
      // The server told us the truth — paint it.
      if (answer === revealData.correctAnswer) return styles.answerGreen; // the right one
      if (answer === myAnswer) return styles.answerRed;                  // my wrong pick
      return styles.answerGray;                                          // everything else
    }
    // Not revealed yet: all plain blue until I pick, then mine stays blue.
    if (answered && answer === myAnswer) return styles.answerBlue;
    if (answered) return styles.answerGray;
    return styles.answerBlue;
  }

  return (
    <View style={styles.container}>
      {/* Top bar: progress + countdown badge */}
      <View style={styles.topBar}>
        <Text style={styles.progress}>
          {t("questionOf", { number, total })}
        </Text>
        <Text style={[styles.timer, timeLeft <= 5 && timeLeft > 0 && styles.timerUrgent]}>
          {timeLeft}s
        </Text>
      </View>

      {/* The thin countdown bar */}
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${barPercent}%` }]} />
      </View>

      <Text style={styles.category}>{question.category}</Text>
      <Text style={styles.question}>{question.question}</Text>

      {/* Answer buttons */}
      {question.answers.map((answer, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.answer, buttonStyle(answer)]}
          onPress={() => onAnswer(answer)}
          disabled={answered || revealed}
        >
          <Text style={styles.answerText}>{answer}</Text>
        </TouchableOpacity>
      ))}

      {/* After the reveal, show what each player answered */}
      {revealed && revealData && (
        <View style={styles.revealPanel}>
          <Text style={styles.revealTitle}>{t("answers")}</Text>
          {revealData.answers.map((entry) => (
            <View key={entry.playerId} style={styles.revealRow}>
              <View style={[styles.dot, entry.isCorrect ? styles.dotCorrect : styles.dotWrong]} />
              <Text style={styles.revealName}>{entry.playerName}</Text>
              <Text style={styles.revealAnswer}>{entry.answer ?? "—"}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: "#0f172a",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progress: { color: "#cbd5e1", fontSize: 15, fontWeight: "700" },
  timer: {
    color: "#0ea5e9",
    fontSize: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  timerUrgent: { color: "#f87171" },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#334155",
    marginTop: 10,
    marginBottom: 18,
    overflow: "hidden",
  },
  barFill: { height: 6, borderRadius: 3, backgroundColor: "#0ea5e9" },
  category: {
    color: "#818cf8",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "center",
  },
  question: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 30,
    textAlign: "center",
    marginVertical: 20,
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
  revealPanel: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  revealTitle: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  revealRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  dotCorrect: { backgroundColor: "#16a34a" },
  dotWrong: { backgroundColor: "#dc2626" },
  revealName: { color: "#f8fafc", fontSize: 15, fontWeight: "600", width: 90 },
  revealAnswer: { color: "#cbd5e1", fontSize: 15, flex: 1 },
});