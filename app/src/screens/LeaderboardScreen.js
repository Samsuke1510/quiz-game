// LeaderboardScreen.js
// ==========================================================================
// THE PERSISTENT LEADERBOARD — RANDOM-GAME SCORES ONLY
// ==========================================================================
//
// Fetches the best Random-Game scores from the server and shows them in a
// simple ranked list: rank, player name, score, percent. Only Random-Game
// matches are saved (solo and coded-room games are not).
//
// The screen handles loading, error, and empty states using the same visual
// patterns as the rest of the app.
// ==========================================================================

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchScores } from "../services/api";
import { useLanguage } from "../i18n/LanguageContext";

export default function LeaderboardScreen({ onBack }) {
  const { t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadScores();
  }, []);

  async function loadScores() {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchScores(20);
      setRows(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  // --- Loading spinner ------------------------------------------------
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.helperText}>{t("fetchingQuestions")}</Text>
      </View>
    );
  }

  // --- Error state ----------------------------------------------------
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>{t("errorTitle")}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadScores}>
          <Text style={styles.retryText}>{t("tryAgain")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={onBack}>
          <Text style={styles.linkText}>{t("back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Empty state ----------------------------------------------------
  if (rows.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{t("leaderboard")}</Text>
        <Text style={styles.helperText}>{t("noScoresYet")}</Text>
        <TouchableOpacity style={styles.linkButton} onPress={onBack}>
          <Text style={styles.linkText}>{t("back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Leaderboard list -----------------------------------------------
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("leaderboard")}</Text>

      {/* Column headers */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.rankCol]}>#</Text>
        <Text style={[styles.headerCell, styles.nameCol]}>{t("player")}</Text>
        <Text style={[styles.headerCell, styles.scoreCol]}>{t("score")}</Text>
        <Text style={[styles.headerCell, styles.pctCol]}>{t("percent")}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {rows.map((row, i) => (
          <View key={row.id ?? i} style={[styles.dataRow, i % 2 === 0 && styles.dataRowAlt]}>
            <Text style={[styles.dataCell, styles.rankCol]}>{i + 1}</Text>
            <Text style={[styles.dataCell, styles.nameCol]} numberOfLines={1}>
              {row.playerName}
            </Text>
            <Text style={[styles.dataCell, styles.scoreCol]}>
              {row.score}/{row.total}
            </Text>
            <Text style={[styles.dataCell, styles.pctCol]}>{row.percent}%</Text>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.linkButton} onPress={onBack}>
        <Text style={styles.linkText}>{t("back")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    paddingTop: 56,
    paddingHorizontal: 20,
  },
  center: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    color: "#f8fafc",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 20,
  },
  helperText: { color: "#94a3b8", fontSize: 15, marginTop: 12 },
  errorTitle: { color: "#f87171", fontSize: 20, fontWeight: "700", marginBottom: 8 },

  // --- Table headers ---
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    paddingBottom: 8,
    marginBottom: 4,
  },
  headerCell: { color: "#94a3b8", fontSize: 13, fontWeight: "700" },

  // --- Table rows ---
  listContent: { paddingBottom: 24 },
  dataRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  dataRowAlt: { backgroundColor: "#1e293b", borderRadius: 8 },
  dataCell: { color: "#f8fafc", fontSize: 15 },

  // --- Column widths ---
  rankCol: { width: 36, textAlign: "center" },
  nameCol: { flex: 1 },
  scoreCol: { width: 60, textAlign: "right", marginRight: 12 },
  pctCol: { width: 52, textAlign: "right" },

  retryButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 16,
  },
  retryText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  linkButton: { alignItems: "center", marginTop: 24 },
  linkText: { color: "#94a3b8", fontSize: 15, fontWeight: "600" },
});
