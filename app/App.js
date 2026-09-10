// App.js
// ==========================================================================
// THE QUIZ APP'S MAIN SCREEN
// ==========================================================================
//
// This file drives the whole SINGLE-PLAYER game. It keeps all the game data
// (the questions, your position, your score) and decides what to paint on
// screen. Whenever a question needs to be shown, it hands it off to the
// QuestionCard component.
//
// The game has four "stages", and the "stage" state decides which screen
// the player sees:
//
//   "loading"  -> we asked the server for questions, waiting for the answer
//   "error"    -> something went wrong (server down, no internet)
//   "playing"  -> a question is on screen, the player is answering
//   "finished" -> all questions answered, showing the final score
//
// EVERYTHING between the two line-comment markers below follows this shape:
//   state  ->  what the player sees (a "return")  ->  buttons that change state
// ==========================================================================

import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import QuestionCard from "./src/components/QuestionCard";   // draws one question
import { fetchQuestions } from "./src/services/api";        // talks to our server
import HomeScreen from "./src/screens/HomeScreen";                  // the mode chooser
import SettingsScreen from "./src/screens/SettingsScreen";          // the language picker
import PregameScreen from "./src/screens/PregameScreen";            // "how many questions?" picker
import MultiplayerScreen from "./src/screens/MultiplayerScreen";    // the multiplayer game
import LeaderboardScreen from "./src/screens/LeaderboardScreen";  // persistent Random-Game scores
import { LanguageProvider, useLanguage } from "./src/i18n/LanguageContext"; // language support

export default function App() {
  // The whole app is wrapped in the LanguageProvider so EVERY screen can use
  // useLanguage() to read the current language and translate its words.
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

function AppContent() {
  const { lang, t } = useLanguage();
  // ============================ STATE ======================================
  // React "state" is data that, when it changes, redraws the screen.

  // "mode" decides WHICH big screen we're on:
  //   "home"        -> the mode chooser (Random / Solo / Multiplayer / Settings)
  //   "settings"    -> the language picker
  //   "pregame"     -> "how many questions?" picker (SOLO only)
  //   "solo"        -> the single-player quiz (all the states below)
  //   "multiplayer" -> multiplayer with a room code (MultiplayerScreen.js)
  //   "random"      -> multiplayer with no code, random strangers (same screen)
  //   "leaderboard" -> persistent Random-Game scores from the server
  const [mode, setMode] = useState("home");

  // How many questions a SOLO round will have — picked on the pregame screen,
  // defaulting to 10, and NOT saved between app launches (session only).
  // (Multiplayer has its own count, chosen by the host in the room lobby.)
  const [questionCount, setQuestionCount] = useState(10);

  // These are the SINGLE-PLAYER states. They're only used when mode === "solo".
  const [questions, setQuestions] = useState([]);   // the whole round of questions
  const [current, setCurrent] = useState(0);        // index of the question we're on
  const [score, setScore] = useState(0);            // points earned so far
  const [stage, setStage] = useState("loading");    // which solo screen to show
  const [errorMessage, setErrorMessage] = useState("");

  // Load fresh solo questions each time the player RE-ENTERS solo mode
  // (this is why "mode" is in the dependency list below). It also means we
  // don't waste a request while the player is still on the home screen.
  // "lang" is also a dependency: if the language changed, refetch the
  // questions so they match the new language.
  useEffect(() => {
    if (mode === "solo") loadGame();
  }, [mode, lang]);

  // ============================ ACTIONS ====================================
  // Ask the server for a fresh round of questions and start the game.
  // The current language is passed along so French players get French questions.
  async function loadGame() {
    setStage("loading");
    setErrorMessage("");
    try {
      const fetched = await fetchQuestions(questionCount, undefined, lang);
      setQuestions(fetched);
      setCurrent(0);
      setScore(0);
      setStage("playing");
    } catch (err) {
      // Something went wrong (server off, no internet...). Tell the player.
      // Known connection failures are translated; anything else is shown as-is.
      setErrorMessage(err.isServerError ? t("serverError") : err.message);
      setStage("error");
    }
  }

  // Called by QuestionCard after the player answered and pressed Next.
  function handleNext(isCorrect) {
    // Add a point if the answer was right.
    if (isCorrect) setScore((s) => s + 1);

    // Advance to the next question, or finish if that was the last one.
    if (current + 1 >= questions.length) {
      setStage("finished");
    } else {
      setCurrent(current + 1);
    }
  }

  // ============================ SCREENS ====================================
  // Each early "return" below paints one screen. Whichever return runs,
  // that's what the player sees.

  // --- Screen: HOME (the mode chooser) -----------------------------------
  // "Play Solo" stops at a pregame screen to pick how many questions.
  // "Multiplayer" goes straight to the game — the count is chosen by the
  // room creator inside the lobby, so there's no picker here to get confused.
  if (mode === "home") {
    return (
      <HomeScreen
        onRandom={() => setMode("random")}
        onSolo={() => setMode("pregame")}
        onMultiplayer={() => setMode("multiplayer")}
        onSettings={() => setMode("settings")}
        onLeaderboard={() => setMode("leaderboard")}
      />
    );
  }

  // --- Screen: SETTINGS (the language picker) ----------------------------
  if (mode === "settings") {
    return <SettingsScreen onBack={() => setMode("home")} />;
  }

  // --- Screen: PREGAME ("how many questions?" — solo only) ---------------
  if (mode === "pregame") {
    return (
      <PregameScreen
        defaultCount={questionCount}
        onStart={(count) => {
          setQuestionCount(count);
          setMode("solo");
        }}
        onBack={() => setMode("home")}
      />
    );
  }

  // --- Screen: MULTIPLAYER (Phase 2 — real-time rooms) -------------------
  // "random" mode is the SAME screen — the `random` prop just swaps the menu
  // (Search instead of a code), hides the room code, and matchmakes instead.
  if (mode === "multiplayer") {
    return <MultiplayerScreen onBack={() => setMode("home")} />;
  }

  // --- Screen: RANDOM GAME (no code, random strangers) -------------------
  if (mode === "random") {
    return <MultiplayerScreen onBack={() => setMode("home")} random />;
  }

  // --- Screen: LEADERBOARD (persistent Random-Game scores) ---------------
  if (mode === "leaderboard") {
    return <LeaderboardScreen onBack={() => setMode("home")} />;
  }

  // From here on mode === "solo", so it's the original single-player screens.

  // --- Screen: LOADING -----------------------------------------------
  if (stage === "loading") {
    return (
      <View style={styles.centerScreen}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.helperText}>{t("fetchingQuestions")}</Text>
      </View>
    );
  }

  // --- Screen: ERROR --------------------------------------------------
  if (stage === "error") {
    return (
      <View style={styles.centerScreen}>
        <StatusBar style="light" />
        <Text style={styles.errorTitle}>{t("errorTitle")}</Text>
        <Text style={styles.helperText}>{errorMessage}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={loadGame}>
          <Text style={styles.primaryButtonText}>{t("tryAgain")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Screen: FINISHED -----------------------------------------------
  if (stage === "finished") {
    const percent = Math.round((score / questions.length) * 100);

    // A little message that changes with how well they did.
    const message =
      percent === 100
        ? t("perfectScore")
        : percent >= 70
          ? t("greatJob")
          : percent >= 40
            ? t("niceWork")
            : t("keepPracticing");

    return (
      <View style={styles.centerScreen}>
        <StatusBar style="light" />
        <Text style={styles.finishedTitle}>{t("quizComplete")}</Text>
        <Text style={styles.finishedScore}>
          {score} / {questions.length}
        </Text>
        <Text style={styles.finishedPercent}>
          {percent}% — {message}
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={loadGame}>
          <Text style={styles.primaryButtonText}>{t("playAgain")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Screen: PLAYING (this is the default, so it has no "if") --------
  const question = questions[current];
  return (
    <View style={styles.gameContainer}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <QuestionCard
          // A unique "key" per question. It forces React to build a FRESH
          // QuestionCard (with an empty "picked" state) every time we move to
          // a new question. Without it, the previous question's answer choice
          // would carry over and the next question would open already-answered.
          key={question.id}
          question={question}
          number={current + 1}        // +1 so it reads "Question 1" not "Question 0"
          total={questions.length}
          score={score}
          onNext={handleNext}
        />
      </ScrollView>
    </View>
  );
}

// ============================ STYLING ======================================
const styles = StyleSheet.create({
  gameContainer: { flex: 1, backgroundColor: "#0f172a" },
  scrollContent: { flexGrow: 1, justifyContent: "center" },
  centerScreen: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  helperText: { color: "#cbd5e1", fontSize: 15, marginTop: 12, textAlign: "center" },
  errorTitle: { color: "#f87171", fontSize: 20, fontWeight: "700", marginBottom: 8 },
  finishedTitle: { color: "#f8fafc", fontSize: 26, fontWeight: "800" },
  finishedScore: { color: "#0ea5e9", fontSize: 52, fontWeight: "800", marginVertical: 8 },
  finishedPercent: { color: "#cbd5e1", fontSize: 16, marginBottom: 28 },
  primaryButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  primaryButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
});