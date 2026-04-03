/* =============================================
   storage.js — localStorage wrapper sécurisé
============================================= */
const Storage = (() => {
  const KEY = 'serpentis_v2';
  const DEFAULTS = {
    coins: 0,
    ownedSkins: ['classic'],
    equippedSkin: 'classic',
    bestScores: {},     // { mode: score }
    allTimeScores: {},  // { mode: [{ score, level, date }] }
    stats: { gamesPlayed: 0, totalApples: 0, totalCoins: 0 },
    config: {
      coinsPerApple: 2,
      coinsPerLevel: 5,
      speedBase: 80,
      doubleCoinEvent: false,
      zenMode: true,
      mazeObstacles: 12,
    },
    players: [],        // [{name, score, mode, date}]
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULTS));
      return Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), JSON.parse(raw));
    } catch { return JSON.parse(JSON.stringify(DEFAULTS)); }
  }

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch(e) { console.warn('Storage full', e); }
  }

  let _data = load();

  return {
    get(key) { return _data[key]; },
    set(key, val) { _data[key] = val; save(_data); },
    getAll() { return _data; },
    reset() { _data = JSON.parse(JSON.stringify(DEFAULTS)); save(_data); },
    reload() { _data = load(); },

    addCoins(n) {
      _data.coins += n;
      _data.stats.totalCoins += n;
      save(_data);
    },
    removeCoins(n) {
      if (_data.coins < n) return false;
      _data.coins -= n;
      save(_data);
      return true;
    },
    unlockSkin(id) {
      if (!_data.ownedSkins.includes(id)) _data.ownedSkins.push(id);
      save(_data);
    },
    equipSkin(id) {
      _data.equippedSkin = id;
      save(_data);
    },
    hasSkin(id) { return _data.ownedSkins.includes(id); },

    saveBest(mode, score, level) {
      const prev = _data.bestScores[mode] || 0;
      const isNew = score > prev;
      if (isNew) _data.bestScores[mode] = score;

      if (!_data.allTimeScores[mode]) _data.allTimeScores[mode] = [];
      _data.allTimeScores[mode].push({ score, level, date: new Date().toLocaleDateString() });
      _data.allTimeScores[mode].sort((a,b) => b.score - a.score);
      _data.allTimeScores[mode] = _data.allTimeScores[mode].slice(0, 10);

      _data.stats.gamesPlayed++;
      save(_data);
      return isNew;
    },
    getBest(mode) { return _data.bestScores[mode] || 0; },
    getTopScores(mode, n = 5) { return (_data.allTimeScores[mode] || []).slice(0, n); },

    updateStats(apples) {
      _data.stats.totalApples += apples;
      save(_data);
    },

    getConfig() { return { ..._data.config }; },
    setConfig(cfg) { _data.config = { ..._data.config, ...cfg }; save(_data); },
  };
})();
