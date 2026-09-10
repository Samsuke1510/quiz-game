// ResultsScreen.js
// ==========================================================================
// FINAL STANDINGS — SHOWN AFTER THE LAST MULTIPLAYER QUESTION
// ==========================================================================
//
// Shows everyone ranked by score. The HOST gets a "Play again" button that
// starts a brand-new round with the same players; everybody else just sees a
// "waiting for host" line and waits for the server to kick off round 2.
//
// Props:
//   standings      : array of { id, name, score } already sorted top-first
//   totalQuestions : how many questions were in the round (just for display)
//   isHost         : am I the host? (host is the only one who can restart)
//   onPlayAgain    : called when the host taps "Play again"
//   onBack         : called when anyone taps "Back to menu"
// ==========================================================================

import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLanguage } from "../i18n/LanguageContext";

export default function ResultsScreen({ standings, totalQuestions, isHost, onPlayAgain, onBack }) {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("finalResults")}</Text>
      <Text style={styles.subtitle}>{t("questionsPlayed", { n: totalQuestions })}</Text>

      <ScrollView style={styles.list}>
        {standings.map((player, index) => (
          <View key={player.id} style={styles.row}>
            {/* Rank number */}
            <Text style={styles.rank}>{index + 1}.</Text>
            <View style={styles.rowBody}>
              <Text style={styles.name}>{player.name}</Text>
              {index === 0 && <Text style={styles.winnerTag}>{t("winner")}</Text>}
            </View>
            <Text style={styles.score}>{player.score}</Text>
          </View>
        ))}
      </ScrollView>

      {isHost ? (
        <TouchableOpacity style={styles.primaryButton} onPress={onPlayAgain}>
          <Text style={styles.buttonText}>{t("playAgain")}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.waiting}>{t("waitingRound2")}</Text>
      )}

      <TouchableOpacity style={styles.linkButton} onPress={onBack}>
        <Text style={styles.linkText}>{t("backToMenu")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 32,
  },
  title: { color: "#f8fafc", fontSize: 28, fontWeight: "800", textAlign: "center" },
  subtitle: { color: "#94a3b8", fontSize: 15, textAlign: "center", marginTop: 4, marginBottom: 24 },
  list: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  rank: { color: "#64748b", fontSize: 18, fontWeight: "800", width: 32 },
  rowBody: { flex: 1, flexDirection: "row", alignItems: "center" },
  name: { color: "#f8fafc", fontSize: 18, fontWeight: "600" },
  winnerTag: {
    color: "#0ea5e9",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 8,
  },
  score: { color: "#f8fafc", fontSize: 20, fontWeight: "800" },
  primaryButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: { color: "#ffffff", fontSize: 17, fontWeight: "700" },
  waiting: { color: "#94a3b8", fontSize: 15, textAlign: "center", marginTop: 20 },
  linkButton: { alignItems: "center", marginTop: 16 },
  linkText: { color: "#94a3b8", fontSize: 15, fontWeight: "600" },
});