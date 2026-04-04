/* =============================================
   accounts.js — Système de comptes joueurs
   Stockage local multi-comptes avec sessions
============================================= */

const Accounts = (() => {
  const DB_KEY = 'serpentis_accounts_v3';
  const SESSION_KEY = 'serpentis_session_v3';

  // Avatars disponibles (émojis serpent/nature)
  const AVATARS = ['🐍','🦎','🐢','🦕','🐉','🦖','🌿','🍀','🔥','⚡','🌊','❄️','🌙','⭐','💎','🎯','👑','🏆','🎮','🧬'];

  const TITLES = [
    { id: 'novice',    label: 'Novice',       minGames: 0,   minScore: 0   },
    { id: 'apprenti',  label: 'Apprenti',     minGames: 5,   minScore: 100 },
    { id: 'serpent',   label: 'Serpent',      minGames: 10,  minScore: 300 },
    { id: 'chasseur',  label: 'Chasseur',     minGames: 25,  minScore: 500 },
    { id: 'predateur', label: 'Prédateur',    minGames: 50,  minScore: 1000},
    { id: 'roi',       label: 'Roi du Marais',minGames: 100, minScore: 2000},
    { id: 'legendaire',label: '✦ Légendaire', minGames: 200, minScore: 5000},
  ];

  const BADGES = [
    { id: 'first_blood',  icon: '🎯', label: 'Premier Sang',    desc: 'Première partie terminée',   check: (s) => s.gamesPlayed >= 1 },
    { id: 'centurion',    icon: '💯', label: 'Centurion',       desc: 'Score 100 ou plus',           check: (s) => s.bestScore >= 100 },
    { id: 'millionaire',  icon: '💰', label: 'Millionnaire',    desc: '1000+ coins au total',        check: (s) => s.totalCoinsEarned >= 1000 },
    { id: 'marathon',     icon: '🏃', label: 'Marathonien',     desc: '50 parties jouées',           check: (s) => s.gamesPlayed >= 50 },
    { id: 'collector',    icon: '🛒', label: 'Collectionneur',  desc: '3 skins achetés',             check: (s) => (s.ownedSkins||[]).length >= 3 },
    { id: 'speedrunner',  icon: '⚡', label: 'Speedrunner',     desc: 'Score 200+ en mode Blitz',   check: (s) => (s.bestScores?.blitz||0) >= 200 },
    { id: 'architect',    icon: '🧱', label: 'Architecte',      desc: 'Score 300+ en Labyrinthe',   check: (s) => (s.bestScores?.maze||0) >= 300 },
    { id: 'zenmaster',    icon: '☯',  label: 'Maître Zen',      desc: 'Score 1000+ en mode Zen',    check: (s) => (s.bestScores?.zen||0) >= 1000 },
    { id: 'portal_king',  icon: '🌀', label: 'Roi des Portails',desc: 'Score 400+ en Portails',     check: (s) => (s.bestScores?.portal||0) >= 400 },
    { id: 'smooth_op',    icon: '🌊', label: 'Smooth Operator', desc: 'Score 300+ en Smooth',       check: (s) => (s.bestScores?.smooth||0) >= 300 },
    { id: 'legend',       icon: '👑', label: 'Légende',         desc: 'Score 5000 en classique',    check: (s) => (s.bestScores?.classic||0) >= 5000 },
    { id: 'veteran',      icon: '🎖', label: 'Vétéran',         desc: '200 parties jouées',         check: (s) => s.gamesPlayed >= 200 },
  ];

  function loadDB() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      return raw ? JSON.parse(raw) : { accounts: {}, globalLeaderboard: [] };
    } catch { return { accounts: {}, globalLeaderboard: [] }; }
  }

  function saveDB(db) {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch(e) { console.warn('Storage error', e); }
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function saveSession(session) {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }

  // ---- Utilitaires ----
  function hashPassword(pwd) {
    // Simple hash côté client (pas de vrai backend)
    let hash = 0;
    for (let i = 0; i < pwd.length; i++) {
      hash = ((hash << 5) - hash) + pwd.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(16);
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function createDefaultStats() {
    return {
      gamesPlayed: 0,
      totalApples: 0,
      totalCoinsEarned: 0,
      bestScore: 0,
      bestScores: {},
      allTimeScores: {},
      coins: 100, // bonus de départ
      ownedSkins: ['classic'],
      equippedSkin: 'classic',
      badges: [],
      joinDate: new Date().toLocaleDateString('fr-FR'),
      lastPlayed: null,
      favoriteMode: null,
      totalPlayTime: 0, // secondes
      winStreak: 0,
      maxWinStreak: 0,
    };
  }

  function getTitle(stats) {
    let best = TITLES[0];
    for (const t of TITLES) {
      if (stats.gamesPlayed >= t.minGames && stats.bestScore >= t.minScore) best = t;
    }
    return best;
  }

  function checkBadges(stats) {
    const earned = stats.badges || [];
    const newBadges = [];
    for (const badge of BADGES) {
      if (!earned.includes(badge.id) && badge.check(stats)) {
        earned.push(badge.id);
        newBadges.push(badge);
      }
    }
    stats.badges = earned;
    return newBadges;
  }

  function getFavoriteMode(allTimeScores) {
    if (!allTimeScores) return null;
    let best = null, max = 0;
    for (const [mode, scores] of Object.entries(allTimeScores)) {
      if ((scores?.length || 0) > max) { max = scores.length; best = mode; }
    }
    return best;
  }

  // ---- Session courante ----
  let _session = loadSession();

  // ---- API publique ----

  function register(username, password, avatarIdx = 0) {
    if (!username || username.length < 2 || username.length > 20) {
      return { ok: false, error: 'Le pseudo doit avoir entre 2 et 20 caractères' };
    }
    if (!password || password.length < 4) {
      return { ok: false, error: 'Le mot de passe doit avoir au moins 4 caractères' };
    }
    if (!/^[a-zA-Z0-9_\-éèàùâêûîôäëüïöÉÈÀÙÂÊÛÎÔÄËÜÏÖ ]+$/.test(username)) {
      return { ok: false, error: 'Pseudo invalide (lettres, chiffres, _ - seulement)' };
    }

    const db = loadDB();
    const key = username.toLowerCase();
    if (db.accounts[key]) {
      return { ok: false, error: 'Ce pseudo est déjà pris' };
    }

    const id = generateId();
    const account = {
      id,
      username,
      passwordHash: hashPassword(password),
      avatar: AVATARS[avatarIdx % AVATARS.length],
      stats: createDefaultStats(),
      createdAt: Date.now(),
    };

    db.accounts[key] = account;
    saveDB(db);

    // Auto-login
    _session = { id, username, key };
    saveSession(_session);

    return { ok: true, account };
  }

  function login(username, password) {
    const db = loadDB();
    const key = username.toLowerCase();
    const account = db.accounts[key];

    if (!account) return { ok: false, error: 'Compte introuvable' };
    if (account.passwordHash !== hashPassword(password)) {
      return { ok: false, error: 'Mot de passe incorrect' };
    }

    _session = { id: account.id, username: account.username, key };
    saveSession(_session);
    return { ok: true, account };
  }

  function logout() {
    _session = null;
    saveSession(null);
  }

  function isLoggedIn() {
    return !!_session;
  }

  function currentUser() {
    if (!_session) return null;
    const db = loadDB();
    return db.accounts[_session.key] || null;
  }

  function getCurrentStats() {
    const user = currentUser();
    return user ? user.stats : null;
  }

  function updateStats(patch) {
    if (!_session) return;
    const db = loadDB();
    const account = db.accounts[_session.key];
    if (!account) return;
    Object.assign(account.stats, patch);
    account.stats.favoriteMode = getFavoriteMode(account.stats.allTimeScores);
    const newBadges = checkBadges(account.stats);
    db.accounts[_session.key] = account;
    saveDB(db);
    return newBadges;
  }

  function saveGameResult(mode, score, level, applesEaten, coinsEarned, durationSec) {
    if (!_session) return { newBadges: [], isNewRecord: false };
    const db = loadDB();
    const account = db.accounts[_session.key];
    if (!account) return { newBadges: [], isNewRecord: false };

    const s = account.stats;
    s.gamesPlayed++;
    s.totalApples += applesEaten;
    s.totalCoinsEarned += coinsEarned;
    s.coins += coinsEarned;
    s.lastPlayed = new Date().toLocaleDateString('fr-FR');
    s.totalPlayTime = (s.totalPlayTime || 0) + durationSec;

    // Best score global
    const isNewRecord = score > (s.bestScore || 0);
    if (isNewRecord) s.bestScore = score;

    // Best score par mode
    if (!s.bestScores) s.bestScores = {};
    if (score > (s.bestScores[mode] || 0)) s.bestScores[mode] = score;

    // Historique par mode (top 10)
    if (!s.allTimeScores) s.allTimeScores = {};
    if (!s.allTimeScores[mode]) s.allTimeScores[mode] = [];
    s.allTimeScores[mode].push({ score, level, date: new Date().toLocaleDateString('fr-FR') });
    s.allTimeScores[mode].sort((a, b) => b.score - a.score);
    s.allTimeScores[mode] = s.allTimeScores[mode].slice(0, 10);

    // Favorite mode
    s.favoriteMode = getFavoriteMode(s.allTimeScores);

    // Badges
    const newBadges = checkBadges(s);

    // Leaderboard global
    if (!db.globalLeaderboard) db.globalLeaderboard = [];
    db.globalLeaderboard.push({
      username: account.username,
      avatar: account.avatar,
      mode, score, level,
      date: new Date().toLocaleDateString('fr-FR'),
    });
    db.globalLeaderboard.sort((a, b) => b.score - a.score);
    db.globalLeaderboard = db.globalLeaderboard.slice(0, 100);

    db.accounts[_session.key] = account;
    saveDB(db);

    return { newBadges, isNewRecord };
  }

  function getGlobalLeaderboard(mode = 'all', limit = 20) {
    const db = loadDB();
    let lb = db.globalLeaderboard || [];
    if (mode !== 'all') lb = lb.filter(e => e.mode === mode);
    return lb.slice(0, limit);
  }

  function getAllPlayers() {
    const db = loadDB();
    return Object.values(db.accounts).map(a => ({
      username: a.username,
      avatar: a.avatar,
      stats: a.stats,
      title: getTitle(a.stats),
    })).sort((a, b) => (b.stats.bestScore || 0) - (a.stats.bestScore || 0));
  }

  function changeAvatar(avatarIdx) {
    if (!_session) return false;
    const db = loadDB();
    db.accounts[_session.key].avatar = AVATARS[avatarIdx % AVATARS.length];
    saveDB(db);
    return true;
  }

  function changePassword(oldPwd, newPwd) {
    if (!_session) return { ok: false, error: 'Non connecté' };
    if (newPwd.length < 4) return { ok: false, error: 'Mot de passe trop court' };
    const db = loadDB();
    const account = db.accounts[_session.key];
    if (account.passwordHash !== hashPassword(oldPwd)) {
      return { ok: false, error: 'Ancien mot de passe incorrect' };
    }
    account.passwordHash = hashPassword(newPwd);
    db.accounts[_session.key] = account;
    saveDB(db);
    return { ok: true };
  }

  function getRankAmong(mode) {
    const lb = getGlobalLeaderboard(mode, 100);
    if (!_session) return null;
    const user = currentUser();
    if (!user) return null;
    const idx = lb.findIndex(e => e.username === user.username);
    return idx >= 0 ? idx + 1 : null;
  }

  // Storage compat — redirect Storage calls to current account
  function getCoins() {
    const s = getCurrentStats();
    return s ? s.coins : 0;
  }

  function addCoins(n) {
    const s = getCurrentStats();
    if (!s) return;
    s.coins += n;
    updateStats({ coins: s.coins });
  }

  function removeCoins(n) {
    const s = getCurrentStats();
    if (!s || s.coins < n) return false;
    s.coins -= n;
    updateStats({ coins: s.coins });
    return true;
  }

  function unlockSkin(id) {
    const s = getCurrentStats();
    if (!s) return;
    if (!s.ownedSkins.includes(id)) {
      s.ownedSkins = [...s.ownedSkins, id];
      updateStats({ ownedSkins: s.ownedSkins });
    }
  }

  function equipSkin(id) {
    updateStats({ equippedSkin: id });
  }

  function hasSkin(id) {
    const s = getCurrentStats();
    return s ? (s.ownedSkins || []).includes(id) : false;
  }

  function getEquippedSkin() {
    const s = getCurrentStats();
    return s ? (s.equippedSkin || 'classic') : 'classic';
  }

  function getBest(mode) {
    const s = getCurrentStats();
    return s ? (s.bestScores?.[mode] || 0) : 0;
  }

  function getTopScores(mode, n = 5) {
    const s = getCurrentStats();
    return s ? (s.allTimeScores?.[mode] || []).slice(0, n) : [];
  }

  function getConfig() {
    // Config globale partagée
    try {
      const raw = localStorage.getItem('serpentis_config_v3');
      const defaults = { coinsPerApple: 2, coinsPerLevel: 5, speedBase: 80, mazeObstacles: 12, doubleCoinEvent: false };
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch { return { coinsPerApple: 2, coinsPerLevel: 5, speedBase: 80, mazeObstacles: 12, doubleCoinEvent: false }; }
  }

  function setConfig(cfg) {
    try {
      const current = getConfig();
      localStorage.setItem('serpentis_config_v3', JSON.stringify({ ...current, ...cfg }));
    } catch(e) {}
  }

  return {
    // Auth
    register, login, logout, isLoggedIn, currentUser, getCurrentStats,

    // Données
    saveGameResult, updateStats,
    getGlobalLeaderboard, getAllPlayers, getRankAmong,

    // Profile
    changeAvatar, changePassword,
    AVATARS, TITLES, BADGES,
    getTitle, checkBadges,

    // Compat Storage API
    get(key) {
      const s = getCurrentStats();
      if (!s) return null;
      const map = { coins: 'coins', equippedSkin: 'equippedSkin', ownedSkins: 'ownedSkins' };
      return s[map[key] ?? key];
    },
    set(key, val) { updateStats({ [key]: val }); },
    getCoins, addCoins, removeCoins,
    unlockSkin, equipSkin, hasSkin, getEquippedSkin,
    getBest, getTopScores,
    getConfig, setConfig,
  };
})();
