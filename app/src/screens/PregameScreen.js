// PregameScreen.js
// ==========================================================================
// "HOW MANY QUESTIONS?" — SHOWN BEFORE A SOLO GAME
// ==========================================================================
//
// After tapping "Play Solo" on the home screen, the player lands here to pick
// how many questions the round will have: 10, 20, 30, 40, or 50. Then they
// press Start to actually begin.
//
// NOTE: this screen is SOLO-only. In multiplayer the count is chosen by the
// room creator inside the lobby instead (see MultiplayerScreen.js), so a
// joining player never has their own pick to conflict with the host's.
//
// This screen does NOT remember the choice between app launches — it always
// starts at the last-chosen value for the current session (or 10 by default).
//
// Props:
//   defaultCount : the count already chosen this session (default 10)
//   onStart      : called with the chosen number when Start is pressed
//   onBack       : called when the player goes back to the home screen
// ==========================================================================

import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLanguage } from "../i18n/LanguageContext";

// The choices we offer. Kept here so the app and the server agree on what's
// allowed (the server double-checks anyway in game.js).
export const QUESTION_COUNTS = [10, 20, 30, 40, 50];

export default function PregameScreen({ defaultCount = 10, onStart, onBack }) {
  const { t } = useLanguage();
  const [chosen, setChosen] = useState(defaultCount);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("howManyQuestions")}</Text>

      {/* The row of number chips. The tapped one turns blue. */}
      <View style={styles.chipRow}>
        {QUESTION_COUNTS.map((n) => {
          const selected = n === chosen;
          return (
            <TouchableOpacity
              key={n}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setChosen(n)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {n}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => onStart(chosen)}>
        <Text style={styles.buttonText}>{t("start")}</Text>
      </TouchableOpacity>

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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: { color: "#f8fafc", fontSize: 28, fontWeight: "800", marginBottom: 40 },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom: 48,
  },
  chip: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 22,
    minWidth: 64,
    alignItems: "center",
  },
  chipSelected: { backgroundColor: "#0ea5e9" },
  chipText: { color: "#f8fafc", fontSize: 22, fontWeight: "800" },
  chipTextSelected: { color: "#ffffff" },
  primaryButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 64,
    alignItems: "center",
  },
  buttonText: { color: "#ffffff", fontSize: 18, fontWeight: "700" },
  linkButton: { alignItems: "center", marginTop: 24 },
  linkText: { color: "#94a3b8", fontSize: 15, fontWeight: "600" },
});