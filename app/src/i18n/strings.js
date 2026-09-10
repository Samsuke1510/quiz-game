// strings.js
// ==========================================================================
// THE APP'S TRANSLATIONS (ENGLISH + FRENCH)
// ==========================================================================
//
// Every word shown on screen lives here, in a simple dictionary. The app
// picks one language at a time ("en" or "fr") and looks up each word by its
// key. For example:  t("playSolo")  →  "Play Solo"  (or "Jouer seul").
//
// If a key is ever missing from the chosen language, the app falls back to
// the English version (see LanguageContext.js) so nothing ever crashes.
//
// A couple of keys contain a {place} in curly braces. That's a tiny template:
// before showing the text, the app replaces {place} with a real value, e.g.
//   t("questionOf", { number: 3, total: 10 })  →  "Question 3 of 10"
// ==========================================================================

const strings = {
  // ------------------------- ENGLISH (default) -------------------------
  en: {
    // Home screen
    appTitle: "Quiz Game",
    subtitle: "Answer fast. Beat your friends.",
    playSolo: "Play Solo",
    randomGame: "Random Game",
    randomSubtitle: "Play with strangers — no code needed",
    search: "Search",
    randomAutoMatch: "The first player in becomes the host. Players join automatically.",
    multiplayer: "Multiplayer",
    settings: "Settings",

    // Pregame screen (pick how many questions)
    howManyQuestions: "How many questions?",
    start: "Start",

    // Settings screen
    back: "Back",
    language: "Language",
    english: "English",
    french: "French",

    // Multiplayer menu
    yourName: "Your name",
    createRoom: "Create Room",
    joinWithCode: "Make a room or join with a friend's code",
    codeHint: "Code (e.g. WXYZ)",
    join: "Join",

    // Multiplayer lobby
    roomCodeLabel: "ROOM CODE",
    shareCode: "Share it with your friends",
    players: "Players ({n})",
    you: "(you)",
    waitingForPlayer: "Waiting for 1 more player…",
    startGame: "Start Game",
    waitingForHost: "Waiting for the host to start…",
    leaveRoom: "Leave room",
    connecting: "Connecting…",
    starting: "Starting…",

    // Questions
    questionOf: "Question {number} of {total}",
    score: "Score: {score}",
    nextQuestion: "Next question",
    seeResults: "See results",
    answers: "Answers",

    // Results
    finalResults: "Final Results",
    questionsPlayed: "{n} questions played",
    winner: "Winner",
    playAgain: "Play again",
    waitingRound2: "Waiting for the host to start round 2…",
    backToMenu: "Back to menu",

    // Solo loading / error / finished
    fetchingQuestions: "Fetching fresh questions…",
    errorTitle: "Something went wrong",
    serverError: "Could not reach the server. Is it running?",
    tryAgain: "Try again",
    quizComplete: "Quiz complete!",
    perfectScore: "Perfect score!",
    greatJob: "Great job!",
    niceWork: "Nice work, keep going!",
    keepPracticing: "Keep practicing!",

    // Server error messages (multiplier room)
    roomNotFound: 'Room "{code}" not found.',
    gameAlreadyStarted: "A game already started in that room.",
    gameInProgress: "A game is already in progress.",
    roomFull: "That room is full.",
    notInRoom: "You are not in a room.",
    hostOnly: "Only the host can start the game.",
    needPlayers: "You need at least 2 players to start.",
    couldNotFetchQuestions: "Could not fetch questions. Try starting again.",
    noQuestionsAvailable: "No questions available. Try again.",
    alreadyAnswered: "You already answered this question.",

    // Leaderboard
    leaderboard: "Leaderboard",
    noScoresYet: "No games yet — play a Random Game!",
    randomTag: "Random",
    player: "Player",
    percent: "Percent",
  },

  // ------------------------- FRENCH -------------------------
  fr: {
    // Home screen
    appTitle: "Quiz Game",
    subtitle: "Réponds vite. Bat tes amis.",
    playSolo: "Jouer seul",
    randomGame: "Partie aléatoire",
    randomSubtitle: "Joue avec des inconnus — pas de code nécessaire",
    search: "Rechercher",
    randomAutoMatch: "Le premier arrivé devient l'hôte. Les joueurs rejoignent automatiquement.",
    multiplayer: "Multijoueur",
    settings: "Paramètres",

    // Pregame screen (pick how many questions)
    howManyQuestions: "Combien de questions ?",
    start: "Commencer",

    // Settings screen
    back: "Retour",
    language: "Langue",
    english: "Anglais",
    french: "Français",

    // Multiplayer menu
    yourName: "Ton prénom",
    createRoom: "Créer une salle",
    joinWithCode: "Crée une salle ou rejoins avec un code",
    codeHint: "Code (ex: WXYZ)",
    join: "Rejoindre",

    // Multiplayer lobby
    roomCodeLabel: "CODE DE LA SALLE",
    shareCode: "Partage-le avec tes amis",
    players: "Joueurs ({n})",
    you: "(toi)",
    waitingForPlayer: "En attente d'un joueur…",
    startGame: "Lancer la partie",
    waitingForHost: "En attente de l'hôte…",
    leaveRoom: "Quitter la salle",
    connecting: "Connexion…",
    starting: "Démarrage…",

    // Questions
    questionOf: "Question {number} sur {total}",
    score: "Score : {score}",
    nextQuestion: "Question suivante",
    seeResults: "Voir les résultats",
    answers: "Réponses",

    // Results
    finalResults: "Résultats finaux",
    questionsPlayed: "{n} questions jouées",
    winner: "Gagnant",
    playAgain: "Rejouer",
    waitingRound2: "En attente de l'hôte pour le round 2…",
    backToMenu: "Retour au menu",

    // Solo loading / error / finished
    fetchingQuestions: "Chargement des questions…",
    errorTitle: "Oups, une erreur",
    serverError: "Impossible de joindre le serveur. Est-il lancé ?",
    tryAgain: "Réessayer",
    quizComplete: "Quiz terminé !",
    perfectScore: "Score parfait !",
    greatJob: "Bravo !",
    niceWork: "Pas mal, continue !",
    keepPracticing: "Continue de t'entraîner !",

    // Server error messages (multiplier room)
    roomNotFound: "Salle « {code} » introuvable.",
    gameAlreadyStarted: "Une partie a déjà commencé.",
    gameInProgress: "Une partie est déjà en cours.",
    roomFull: "Cette salle est pleine.",
    notInRoom: "Tu n'es pas dans une salle.",
    hostOnly: "Seul l'hôte peut lancer la partie.",
    needPlayers: "Il faut au moins 2 joueurs.",
    couldNotFetchQuestions: "Impossible de charger les questions. Réessaie.",
    noQuestionsAvailable: "Aucune question disponible. Réessaie.",
    alreadyAnswered: "Tu as déjà répondu.",

    // Leaderboard
    leaderboard: "Classement",
    noScoresYet: "Aucune partie — joue une partie aléatoire !",
    randomTag: "Aléatoire",
    player: "Joueur",
    percent: "Pourcentage",
  },
};

export default strings;