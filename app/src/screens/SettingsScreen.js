// SettingsScreen.js
// ==========================================================================
// THE SETTINGS PAGE — WHERE YOU PICK THE APP'S LANGUAGE
// ==========================================================================
//
// This screen currently has one setting: the language. Tap "English" or
// "Français" to switch the whole app (menus, buttons, and quiz questions).
// The active language's button is highlighted in blue; the other stays gray.
//
// Props:
//   onBack : function called when the player taps Back (returns to Home)
// ==========================================================================

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLanguage } from "../i18n/LanguageContext";

export default function SettingsScreen({ onBack }) {
  const { lang, setLang, t } = useLanguage();

  // Build one button per language. "active" just tells the style which one
  // is currently selected, so it can be highlighted.
  function LanguageButton({ code, label, active }) {
    return (
      <TouchableOpacity
        style={[styles.languageButton, active && styles.languageActive]}
        onPress={() => setLang(code)}
      >
        <Text style={styles.languageText}>{label}</Text>
        {active && <Text style={styles.checked}>✓</Text>}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("settings")}</Text>

      <Text style={styles.label}>{t("language")}</Text>
      <LanguageButton code="en" label={t("english")} active={lang === "en"} />
      <LanguageButton code="fr" label={t("french")} active={lang === "fr"} />

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
    paddingHorizontal: 24,
    paddingTop: 72,
  },
  title: { color: "#f8fafc", fontSize: 28, fontWeight: "800", textAlign: "center", marginBottom: 32 },
  label: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  languageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  languageActive: { backgroundColor: "#0ea5e9" },
  languageText: { color: "#ffffff", fontSize: 18, fontWeight: "700" },
  checked: { color: "#ffffff", fontSize: 18, fontWeight: "800" },
  linkButton: { alignItems: "center", marginTop: 32 },
  linkText: { color: "#94a3b8", fontSize: 15, fontWeight: "600" },
});