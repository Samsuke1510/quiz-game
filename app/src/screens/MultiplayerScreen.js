// MultiplayerScreen.js
// ==========================================================================
// THE WHOLE MULTIPLAYER GAME, IN ONE SCREEN
// ==========================================================================
//
// This component is a small state machine — it shows a different "screen"
// depending on the `screen` state variable:
//
//   "menu"     -> type your name, then create/join a room code OR (random
//                 mode) just hit Search and let the server matchmake you
//   "loading"  -> waiting for the server to answer create/join/search
//   "lobby"    -> show the room code + who's inside; host can start
//   "playing"  -> a question is live, with the countdown and reveal
//   "finished" -> final results
//   "error"    -> something went wrong (room not found, room full, etc.)
//
// The SERVER drives everything. This screen never needs to know the correct
// answer — it shows the question, sends your pick, and waits for the server's
// "reveal" and "question" events. All the event names and shapes below must
// match server/src/game.js exactly.
// ==========================================================================

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getSocket, disconnectSocket } from "../services/socket";
import { postScores } from "../services/api";
import MultiplayerQuestionCard from "../components/MultiplayerQuestionCard";
import ResultsScreen from "./ResultsScreen";
import { QUESTION_COUNTS } from "./PregameScreen"; // the counts the host can pick (10-50)
import { useLanguage } from "../i18n/LanguageContext";

// The server replies to mistakes with a machine-readable "code" (like
// room-not-found). This map turns each code into a translation key so the
// error can be shown in the player's language. If a code isn't in this map,
// we fall back to the server's plain-English message.
const ERROR_KEYS = {
  "room-not-found": "roomNotFound",
  "game-already-started": "gameAlreadyStarted",
  "game-in-progress": "gameInProgress",
  "room-full": "roomFull",
  "not-in-room": "notInRoom",
  "host-only": "hostOnly",
  "need-players": "needPlayers",
  "could-not-fetch-questions": "couldNotFetchQuestions",
  "no-questions-available": "noQuestionsAvailable",
  "already-answered": "alreadyAnswered",
};

// Fallback countdown length — the server tells us the real number when the
// game starts (and the bar needs to know it right away for question one).
const DEFAULT_QUESTION_TIME = 15;

// "random" switches this screen between the two multiplayer styles:
//   random=false -> coded rooms: enter a join code, create/join a room
//   random=true  -> Random Game: no code, players get matchmade by the server
export default function MultiplayerScreen({ onBack, random = false }) {
  const { lang, t } = useLanguage();

  // ---- screen navigation + identity --------------------------------
  const [screen, setScreen] = useState("menu"); // menu|loading|lobby|playing|finished|error
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);   // names in the lobby
  const [errorMessage, setErrorMessage] = useState("");

  // How many questions this round has. ONLY the room creator (host) can
  // change it — the chips show in the lobby for the host alone. It stays for
  // the whole room (round 2 uses the same count when the host plays again).
  const [questionCount, setQuestionCount] = useState(10);

  // ---- live game data ----------------------------------------------
  const [question, setQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [questionTime, setQuestionTime] = useState(DEFAULT_QUESTION_TIME);
  const [timeLeft, setTimeLeft] = useState(0);
  const [myAnswer, setMyAnswer] = useState(null); // null = haven't picked yet
  const [revealed, setRevealed] = useState(false);
  const [revealData, setRevealData] = useState(null);
  const [standings, setStandings] = useState([]);

  // Socket listeners below are registered ONCE (they close over the values at
  // that moment), but "isHost" changes after room creation. A ref always holds
  // the CURRENT value, so a listener can read it without a stale closure.
  const isHostRef = useRef(isHost);
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  // ------------------------------------------------------------------
  // LISTEN TO THE SERVER: set up all the event handlers once, when this
  // screen mounts. The cleanup function (the function we return) removes
  // them and closes the connection when the player leaves.
  // ------------------------------------------------------------------
  useEffect(() => {
    const socket = getSocket(); // make sure we have a live connection

    // --- room events -----------------------------------------------
    socket.on("room-created", (data) => {
      setRoomCode(data.roomCode);
      setPlayers(data.players);
      setIsHost(true);
      setScreen("lobby");
    });
    socket.on("room-joined", (data) => {
      setRoomCode(data.roomCode);
      setPlayers(data.players);
      setIsHost(false);
      setScreen("lobby");
    });
    socket.on("player-joined", (data) => {
      setPlayers((prev) => [...prev, data.player]);
    });
    socket.on("player-left", (data) => {
      setPlayers((prev) => prev.filter((p) => p.id !== data.playerId));
    });
    socket.on("host-changed", (data) => {
      setIsHost(data.hostId === socket.id);
    });

    // --- game events ------------------------------------------------
    socket.on("game-started", (data) => {
      setTotalQuestions(data.totalQuestions);
      setQuestionTime(data.questionTime);
    });
    socket.on("question", (data) => {
      setQuestion(data.question);
      setQuestionNumber(data.questionNumber);
      setTotalQuestions(data.totalQuestions);
      setTimeLeft(data.timeLeft);
      setMyAnswer(null);   // fresh question -> fresh, unpicked answer
      setRevealed(false);
      setRevealData(null);
      setScreen("playing");
    });
    socket.on("timer-tick", (data) => {
      setTimeLeft(data.timeLeft);
    });
    socket.on("reveal", (data) => {
      setRevealed(true);
      setRevealData(data);
      setStandings(data.standings);
    });
    socket.on("game-finished", (data) => {
      setStandings(data.standings);
      setScreen("finished");

      // Phase 3: only the HOST of a RANDOM game saves the scores, and only
      // once. (Solo and coded-room games are intentionally not saved.) If
      // every player sent them, the match would be stored once per player.
      if (isHostRef.current && random) {
        postScores(
          data.standings.map((p) => ({
            playerName: p.name,
            score: p.score,
            total: data.totalQuestions,
          }))
        ).catch((err) => console.error("save scores failed:", err));
      }
    });
    socket.on("error", (data) => {
      // Translate the server's error code into the player's language
      // (e.g. room-not-found -> "Room WXYZ not found."). Codes we don't
      // know just show the server's original message.
      const key = data.code ? ERROR_KEYS[data.code] : null;
      setErrorMessage(
        key ? t(key, { code: data.roomCode }) : data.message || t("errorTitle")
      );
      setScreen("error");
    });

    // Cleanup: stop listening and close the connection (leaves the room).
    return () => {
      socket.off();
      disconnectSocket();
    };
  }, []);

  // ------------------------------------------------------------------
  // ACTIONS (called by the buttons)
  // ------------------------------------------------------------------
  function createRoom() {
    if (!playerName.trim()) return;
    setScreen("loading");
    getSocket().emit("create-room", { playerName: playerName.trim() });
  }

  function joinRoom() {
    if (!playerName.trim() || !joinCode.trim()) return;
    setScreen("loading");
    getSocket().emit("join-room", { roomCode: joinCode.trim(), playerName: playerName.trim() });
  }

  function searchRandom() {
    // No code: the server drops us into an open random room, or makes us the
    // host of a fresh one. Either way it replies room-created / room-joined.
    if (!playerName.trim()) return;
    setScreen("loading");
    getSocket().emit("search-random", { playerName: playerName.trim() });
  }

  function startGame() {
    // The server fetches questions for the whole room in the host's language
    // and for however many questions the host picked. That fetch (and French
    // translation) can take a few seconds, so we flip to the "Starting..."
    // spinner right away instead of leaving everyone staring at the lobby.
    setQuestion(null);    // clear any past question so the spinner shows
    setScreen("playing"); // the "playing" screen shows "Starting…" while question is null
    getSocket().emit("start-game", { language: lang, amount: questionCount });
  }

  function pickAnswer(answer) {
    if (myAnswer !== null || revealed) return; // one pick per question
    setMyAnswer(answer);                       // lock it locally (feels instant)
    getSocket().emit("submit-answer", { answer });
  }

  function leaveRoom() {
    disconnectSocket(); // tells the server to remove us from the room
    onBack();           // go back to the home screen
  }

  // ==================================================================
  // SCREENS
  // ==================================================================

  // --- MENU ---------------------------------------------------------
  if (screen === "menu") {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{random ? t("randomGame") : t("multiplayer")}</Text>
        <Text style={styles.subtitle}>{random ? t("randomSubtitle") : t("joinWithCode")}</Text>

        <TextInput
          style={styles.input}
          placeholder={t("yourName")}
          placeholderTextColor="#64748b"
          value={playerName}
          onChangeText={setPlayerName}
          maxLength={20}
        />

        {/* Random Game: one Search button, no room code at all. */}
        {random ? (
          <TouchableOpacity
            style={[styles.primaryButton, !playerName.trim() && styles.disabled]}
            onPress={searchRandom}
            disabled={!playerName.trim()}
          >
            <Text style={styles.buttonText}>{t("search")}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.primaryButton, !playerName.trim() && styles.disabled]}
              onPress={createRoom}
              disabled={!playerName.trim()}
            >
              <Text style={styles.buttonText}>{t("createRoom")}</Text>
            </TouchableOpacity>

            <View style={styles.joinRow}>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder={t("codeHint")}
                placeholderTextColor="#64748b"
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="characters"
                maxLength={4}
              />
              <TouchableOpacity
                style={[styles.secondaryButton, (!playerName.trim() || !joinCode.trim()) && styles.disabled]}
                onPress={joinRoom}
                disabled={!playerName.trim() || !joinCode.trim()}
              >
                <Text style={styles.buttonText}>{t("join")}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <TouchableOpacity style={styles.linkButton} onPress={onBack}>
          <Text style={styles.linkText}>{t("back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- LOADING (waiting for the server to reply to create/join) -----
  if (screen === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.helperText}>{t("connecting")}</Text>
      </View>
    );
  }

  // --- LOBBY (in the room, waiting to start) ------------------------
  if (screen === "lobby") {
    return (
      <View style={styles.center}>
        {/* Random Game hides the code entirely — people just appear. */}
        {random ? (
          <>
            <Text style={styles.title}>{t("randomGame")}</Text>
            <Text style={styles.helperText}>{t("randomAutoMatch")}</Text>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>{t("roomCodeLabel")}</Text>
            <Text style={styles.roomCode}>{roomCode}</Text>
            <Text style={styles.helperText}>{t("shareCode")}</Text>
          </>
        )}

        <Text style={styles.playersTitle}>{t("players", { n: players.length })}</Text>
        {players.map((player) => (
          <Text key={player.id} style={styles.playerRow}>
            {player.name}
            {player.id === getSocket().id ? `  ${t("you")}` : ""}
          </Text>
        ))}

        {/* The HOST picks how many questions — the others just see the room,
            so everyone's always using the creator's choice. */}
        {isHost && (
          <>
            <Text style={styles.countLabel}>{t("howManyQuestions")}</Text>
            <View style={styles.countRow}>
              {QUESTION_COUNTS.map((n) => {
                const selected = n === questionCount;
                return (
                  <TouchableOpacity
                    key={n}
                    style={[styles.countChip, selected && styles.countChipSelected]}
                    onPress={() => setQuestionCount(n)}
                  >
                    <Text style={[styles.countChipText, selected && styles.countChipTextSelected]}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {isHost ? (
          <TouchableOpacity
            style={[styles.primaryButton, players.length < 2 && styles.disabled]}
            onPress={startGame}
            disabled={players.length < 2}
          >
            <Text style={styles.buttonText}>
              {players.length < 2
                ? t("waitingForPlayer")
                : `${t("startGame")} (${questionCount})`}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.waiting}>{t("waitingForHost")}</Text>
        )}

        <TouchableOpacity style={styles.linkButton} onPress={leaveRoom}>
          <Text style={styles.linkText}>{t("leaveRoom")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- PLAYING (a question is live) ----------------------------------
  if (screen === "playing") {
    if (!question) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.helperText}>{t("starting")}</Text>
        </View>
      );
    }
    return (
      <View style={styles.game}>
        {revealed && standings.length > 0 && (
          <Text style={styles.scoreLine}>
            {standings.map((p) => `${p.name} ${p.score}`).join("   •   ")}
          </Text>
        )}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <MultiplayerQuestionCard
            // A unique key per question -> every new question is a fresh card
            // with no leftover answer/lock state from the previous one.
            key={question.id}
            question={question}
            number={questionNumber}
            total={totalQuestions}
            timeLeft={timeLeft}
            questionTime={questionTime}
            myAnswer={myAnswer}
            revealed={revealed}
            revealData={revealData}
            onAnswer={pickAnswer}
          />
        </ScrollView>
      </View>
    );
  }

  // --- FINISHED -------------------------------------------------------
  if (screen === "finished") {
    return (
      <ResultsScreen
        standings={standings}
        totalQuestions={totalQuestions}
        isHost={isHost}
        onPlayAgain={startGame}
        onBack={leaveRoom}
      />
    );
  }

  // --- ERROR ----------------------------------------------------------
  return (
    <View style={styles.center}>
      <Text style={styles.errorTitle}>{t("errorTitle")}</Text>
      <Text style={styles.helperText}>{errorMessage}</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={leaveRoom}>
        <Text style={styles.buttonText}>{t("backToMenu")}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ====================== STYLING ==========================================
const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  game: { flex: 1, backgroundColor: "#0f172a", paddingTop: 24 },
  scrollContent: { paddingBottom: 24, justifyContent: "center", flexGrow: 1 },
  title: { color: "#f8fafc", fontSize: 30, fontWeight: "800" },
  subtitle: { color: "#94a3b8", fontSize: 15, marginTop: 6, marginBottom: 28 },
  input: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#f8fafc",
    fontSize: 17,
    alignSelf: "stretch",
    marginBottom: 16,
  },
  joinRow: { flexDirection: "row", alignSelf: "stretch", gap: 12 },
  codeInput: { flex: 1, textTransform: "uppercase" },
  primaryButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    alignSelf: "stretch",
    marginBottom: 16,
  },
  secondaryButton: {
    backgroundColor: "#334155",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#ffffff", fontSize: 17, fontWeight: "700" },
  disabled: { opacity: 0.4 },
  helperText: { color: "#94a3b8", fontSize: 15, marginTop: 12 },
  errorTitle: { color: "#f87171", fontSize: 20, fontWeight: "700", marginBottom: 8 },
  roomCode: {
    color: "#0ea5e9",
    fontSize: 56,
    fontWeight: "800",
    letterSpacing: 8,
    textAlign: "center",
  },
  playersTitle: {
    color: "#cbd5e1",
    fontSize: 15,
    fontWeight: "700",
    alignSelf: "flex-start",
    marginTop: 32,
    marginBottom: 8,
  },
  playerRow: { color: "#f8fafc", fontSize: 18, fontWeight: "600", alignSelf: "flex-start" },
  countLabel: { color: "#cbd5e1", fontSize: 15, fontWeight: "700", marginTop: 32, marginBottom: 10 },
  countRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginBottom: 28 },
  countChip: {
    backgroundColor: "#1e293b",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    minWidth: 56,
    alignItems: "center",
  },
  countChipSelected: { backgroundColor: "#0ea5e9" },
  countChipText: { color: "#f8fafc", fontSize: 18, fontWeight: "800" },
  countChipTextSelected: { color: "#ffffff" },
  waiting: { color: "#94a3b8", fontSize: 15, marginTop: 28 },
  linkButton: { alignItems: "center", marginTop: 24 },
  linkText: { color: "#94a3b8", fontSize: 15, fontWeight: "600" },
  scoreLine: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 4,
  },
});