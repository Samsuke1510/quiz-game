// HomeScreen.js
// ==========================================================================
// THE APP'S FIRST SCREEN — CHOOSE A MODE
// ==========================================================================
//
// Three buttons lead to the three ways to play:
//   - "Random Game": jump straight into a match with strangers (no code)
//   - "Play Solo":   the original single-player quiz from Phase 1
//   - "Multiplayer": join a room code and play friends in real time (Phase 2)
//
// The actual logic lives in App.js (solo) and MultiplayerScreen.js
// (both multiplayer modes). This screen is just the front door: it receives
// the mode functions as props and passes the player on.
// ==========================================================================

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLanguage } from "../i18n/LanguageContext";

export default function HomeScreen({ onRandom, onSolo, onMultiplayer, onSettings, onLeaderboard }) {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      {/* The gear button in the corner opens Settings (pick the language). */}
      <TouchableOpacity style={styles.settingsButton} onPress={onSettings}>
        <Text style={styles.settingsIcon}>⚙</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{t("appTitle")}</Text>
      <Text style={styles.subtitle}>{t("subtitle")}</Text>

      {/* Random Game sits on top: jump straight into a match with strangers. */}
      <TouchableOpacity style={styles.primaryButton} onPress={onRandom}>
        <Text style={styles.buttonText}>{t("randomGame")}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.primaryButton} onPress={onSolo}>
        <Text style={styles.buttonText}>{t("playSolo")}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={onMultiplayer}>
        <Text style={styles.buttonText}>{t("multiplayer")}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkButton} onPress={onLeaderboard}>
        <Text style={styles.linkText}>{t("leaderboard")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  settingsButton: {
    position: "absolute",
    top: 56,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsIcon: { color: "#cbd5e1", fontSize: 22 },
  title: { color: "#f8fafc", fontSize: 40, fontWeight: "800", marginBottom: 8 },
  subtitle: { color: "#94a3b8", fontSize: 16, marginBottom: 48 },
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
    paddingVertical: 16,
    alignItems: "center",
    alignSelf: "stretch",
  },
  buttonText: { color: "#ffffff", fontSize: 18, fontWeight: "700" },
  linkButton: { alignItems: "center", marginTop: 28 },
  linkText: { color: "#94a3b8", fontSize: 15, fontWeight: "600" },
});