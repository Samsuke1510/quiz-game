// LanguageContext.js
// ==========================================================================
// REMEMBERS THE APP'S LANGUAGE AND LETS EVERY SCREEN USE IT
// ==========================================================================
//
// This file provides two things:
//   1. A <LanguageProvider> that wraps the whole app in App.js.
//   2. A useLanguage() hook that any screen can call to get:
//        lang    — "en" or "fr"
//        setLang — the function to change it
//        t       — a function that translates a key: t("playSolo")
//
// The language is also saved on the device with AsyncStorage, so if the
// player closes the app and comes back later, their choice is remembered.
//
// "t" handles the {place} templates too:  t("questionOf", { number: 1, total: 10 })
// ==========================================================================

import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import strings from "./strings";

// The key used in AsyncStorage (the phone/browser's small hard drive).
const STORAGE_KEY = "quiz.language";

// The saved value is a string like "en" or "fr". This just makes it safe.
const DEFAULT_LANGUAGE = "en";

// Create the Context object. Context is React's way to share data with
// every screen at once without passing it down through every level.
// (The provider below fills it in; the hook reads from it.)
const LanguageContext = createContext(null);

/**
 * The provider. Put this around the whole app so every screen can use
 * useLanguage(). It loads the saved language when the app starts, exposes
 * the t() function, and saves any change back to AsyncStorage.
 */
export function LanguageProvider({ children }) {
  // null = still loading the saved language from storage (we don't fully
  // know the language yet). Once loaded it becomes "en" or "fr".
  const [lang, setLangState] = useState(null);

  // React runs this once when the app starts: go read AsyncStorage.
  useEffect(() => {
    let cancelled = false; // guard against setState after unmount
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!cancelled) setLangState(saved === "fr" ? "fr" : DEFAULT_LANGUAGE);
      })
      .catch(() => {
        // Storage can occasionally fail (private mode, etc.). Don't crash —
        // just fall back to English.
        if (!cancelled) setLangState(DEFAULT_LANGUAGE);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Change the language AND remember it on the device for next time.
  function setLang(next) {
    setLangState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Saving failed — the app still works, it just won't remember next time.
    });
  }

  // Translate a key. Returns the chosen language's word, or English if the
  // key is missing (so a single missing word never breaks the app).
  function t(key, params = {}) {
    const table = lang ? strings[lang] : strings[DEFAULT_LANGUAGE];
    let text = table[key] ?? strings[DEFAULT_LANGUAGE][key] ?? key;

    // Replace {place} with real values, e.g. { number: 3 } → 3.
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, value);
    }
    return text;
  }

  // Until the saved language has loaded, lang is null. Ask t() to behave
  // like English in the meantime (it already does, via the line above).
  return (
    <LanguageContext.Provider value={{ lang: lang ?? DEFAULT_LANGUAGE, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * The hook every screen calls to reach the language and translation.
 *   const { lang, setLang, t } = useLanguage();
 */
export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error("useLanguage must be used inside a <LanguageProvider>.");
  }
  return value;
}