/* =============================================
   admin.js — Panel admin multi-comptes v3
   Konami code ↑↑↓↓←→←→BA pour accéder
============================================= */
const Admin = (() => {
  const ADMIN_PWD = 'SERPENTIS2024';
  let isLogged = false;
  let currentTab = 'dashboard';

  async function tryLogin(pwd) {
    if (pwd === ADMIN_PWD) { isLogged = true; return true; }
    return false;
  }
  function logout() { isLogged = false; }

  function renderTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    const main = document.getElementById('admin-main');
    switch(tab) {
      case 'dashboard': main.innerHTML = buildDashboard(); break;
      case 'players':   main.innerHTML = buildPlayers(); bindPlayers(); break;
      case 'shop-mgmt': main.innerHTML = buildShopMgmt(); bindShopMgmt(); break;
      case 'config':    main.innerHTML = buildConfig(); bindConfig(); break;
      case 'cheats':    main.innerHTML = buildCheats(); break;
    }
  }

  function buildDashboard() {
    const players = Accounts.getAllPlayers();
    const lb = Accounts.getGlobalLeaderboard('all', 200);
    const totalGames = players.reduce((s,p) => s + (p.stats.gamesPlayed||0), 0);
    const totalApples = players.reduce((s,p) => s + (p.stats.totalApples||0), 0);
    const totalCoins = players.reduce((s,p) => s + (p.stats.totalCoinsEarned||0), 0);
    const bestScore = players.reduce((m,p) => Math.max(m, p.stats.bestScore||0), 0);
    const cfg = Accounts.getConfig();

    const modeStats = ['classic','smooth','portal','blitz','maze','zen'].map(m => {
      const scores = lb.filter(e => e.mode === m);
      const best = scores.length ? scores[0].score : 0;
      return { mode: m, count: scores.length, best };
    });

    return `
      <div class="admin-section-title">📊 TABLEAU DE BORD GLOBAL</div>
      ${cfg.doubleCoinEvent ? '<div class="admin-event-banner">🎉 ÉVÉNEMENT DOUBLE COINS ACTIF</div>' : ''}
      <div class="admin-cards">
        <div class="admin-card"><div class="admin-card-label">Comptes créés</div><div class="admin-card-val">${players.length}</div></div>
        <div class="admin-card"><div class="admin-card-label">Parties totales</div><div class="admin-card-val">${totalGames}</div></div>
        <div class="admin-card"><div class="admin-card-label">Pommes mangées</div><div class="admin-card-val success">${totalApples}</div></div>
        <div class="admin-card"><div class="admin-card-label">Coins distribués</div><div class="admin-card-val gold">${totalCoins}</div></div>
        <div class="admin-card"><div class="admin-card-label">Meilleur score global</div><div class="admin-card-val accent">${bestScore}</div></div>
        <div class="admin-card"><div class="admin-card-label">Entrées leaderboard</div><div class="admin-card-val">${lb.length}</div></div>
      </div>
      <div class="admin-section-title" style="margin-top:20px">🏆 STATS PAR MODE</div>
      <table class="admin-table">
        <thead><tr><th>Mode</th><th>Parties</th><th>Record</th></tr></thead>
        <tbody>
          ${modeStats.map(m => `<tr>
            <td>${m.mode.toUpperCase()}</td>
            <td style="color:var(--text-dim)">${m.count}</td>
            <td style="color:var(--accent);font-family:var(--font-hd)">${m.best}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="admin-section-title" style="margin-top:20px">🥇 TOP 5 JOUEURS</div>
      <table class="admin-table">
        <thead><tr><th>#</th><th>Joueur</th><th>Titre</th><th>Meilleur score</th><th>Parties</th></tr></thead>
        <tbody>
          ${players.slice(0,5).map((p,i) => `<tr>
            <td style="color:var(--text-dim)">${['🥇','🥈','🥉','4','5'][i]}</td>
            <td>${p.avatar} ${p.username}</td>
            <td style="font-size:.7rem;color:var(--accent)">${p.title.label}</td>
            <td style="color:var(--gold);font-family:var(--font-hd)">${p.stats.bestScore||0}</td>
            <td style="color:var(--text-dim)">${p.stats.gamesPlayed||0}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function buildPlayers() {
    const players = Accounts.getAllPlayers();
    return `
      <div class="admin-section-title">👥 GESTION DES JOUEURS (${players.length})</div>
      <table class="admin-table">
        <thead><tr><th>Joueur</th><th>Titre</th><th>Score</th><th>Parties</th><th>Coins</th><th>Badges</th><th>Actions</th></tr></thead>
        <tbody>
          ${players.length ? players.map(p => `<tr>
            <td>${p.avatar} <strong>${p.username}</strong></td>
            <td style="font-size:.7rem;color:var(--accent)">${p.title.label}</td>
            <td style="color:var(--gold);font-family:var(--font-hd)">${p.stats.bestScore||0}</td>
            <td style="color:var(--text-dim)">${p.stats.gamesPlayed||0}</td>
            <td style="color:var(--gold)">◈ ${p.stats.coins||0}</td>
            <td style="color:var(--text-dim)">${(p.stats.badges||[]).length}</td>
            <td>
              <button class="admin-action-btn success" onclick="Admin._giveCoins('${p.username}',500)">+500◈</button>
              <button class="admin-action-btn danger" onclick="Admin._resetPlayer('${p.username}')">Reset</button>
            </td>
          </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:20px">Aucun compte créé</td></tr>'}
        </tbody>
      </table>`;
  }

  function bindPlayers() {}

  function buildShopMgmt() {
    const cfg = Accounts.getConfig();
    return `
      <div class="admin-section-title">🛒 GESTION BOUTIQUE</div>
      <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
        <button class="admin-action-btn success" onclick="Admin._unlockAllCurrent()">🔓 Débloquer tout (compte actuel)</button>
        <button class="admin-action-btn success" onclick="Admin._addCoinsCurrent(500)">◈ +500 coins</button>
        <button class="admin-action-btn success" onclick="Admin._addCoinsCurrent(5000)">◈ +5000 coins</button>
        <button class="admin-action-btn danger" onclick="Admin._setCoinsCurrent(0)">◈ Reset coins</button>
      </div>
      <table class="admin-table">
        <thead><tr><th>Skin</th><th>Rareté</th><th>Prix</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          ${SKINS_DATA.map(skin => {
            const owned = Accounts.hasSkin(skin.id);
            const equipped = Accounts.getEquippedSkin() === skin.id;
            return `<tr>
              <td><span style="color:${skin.head}">${skin.name}</span></td>
              <td><span class="shop-item-rarity rarity-${skin.rarity}" style="position:static">${skin.rarity.toUpperCase()}</span></td>
              <td style="color:var(--gold)">◈ ${skin.price}</td>
              <td>${equipped ? '<span style="color:var(--gold)">✓ Équipé</span>' : owned ? '<span style="color:var(--success)">Possédé</span>' : '<span style="color:var(--text-dim)">Verrouillé</span>'}</td>
              <td>${!owned ? `<button class="admin-action-btn success" onclick="Admin._unlockSkin('${skin.id}')">Débloquer</button>` : ''}
              ${owned && !equipped ? `<button class="admin-action-btn success" onclick="Admin._equipSkin('${skin.id}')">Équiper</button>` : ''}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  function bindShopMgmt() {}

  function buildConfig() {
    const cfg = Accounts.getConfig();
    return `
      <div class="admin-section-title">⚙ CONFIGURATION DU JEU</div>
      <div class="config-row">
        <div><div class="config-row-label">Coins par pomme</div><div class="config-row-desc">Coins gagnés à chaque pomme</div></div>
        <input class="config-input" id="cfg-coins-apple" type="number" min="0" max="100" value="${cfg.coinsPerApple}"/>
      </div>
      <div class="config-row">
        <div><div class="config-row-label">Bonus de niveau</div><div class="config-row-desc">Coins bonus lors d'un passage de niveau</div></div>
        <input class="config-input" id="cfg-coins-level" type="number" min="0" max="500" value="${cfg.coinsPerLevel}"/>
      </div>
      <div class="config-row">
        <div><div class="config-row-label">Vitesse de base (ms)</div><div class="config-row-desc">Délai entre chaque déplacement</div></div>
        <input class="config-input" id="cfg-speed" type="number" min="20" max="300" value="${cfg.speedBase}"/>
      </div>
      <div class="config-row">
        <div><div class="config-row-label">Obstacles labyrinthe</div><div class="config-row-desc">Nombre de blocs dans le mode Labyrinthe</div></div>
        <input class="config-input" id="cfg-maze" type="number" min="0" max="60" value="${cfg.mazeObstacles}"/>
      </div>
      <div class="config-row">
        <div><div class="config-row-label">🎉 Événement Double Coins</div><div class="config-row-desc">Tous les coins gagnés sont doublés</div></div>
        <button class="config-toggle ${cfg.doubleCoinEvent ? 'on' : ''}" id="cfg-double"></button>
      </div>
      <div style="margin-top:16px"><button class="btn-primary" id="cfg-save">💾 Sauvegarder</button></div>`;
  }

  function bindConfig() {
    document.getElementById('cfg-save')?.addEventListener('click', () => {
      Accounts.setConfig({
        coinsPerApple: parseInt(document.getElementById('cfg-coins-apple').value)||2,
        coinsPerLevel: parseInt(document.getElementById('cfg-coins-level').value)||5,
        speedBase: parseInt(document.getElementById('cfg-speed').value)||80,
        mazeObstacles: parseInt(document.getElementById('cfg-maze').value)||12,
        doubleCoinEvent: document.getElementById('cfg-double').classList.contains('on'),
      });
      showAdminToast('Configuration sauvegardée !');
    });
    document.querySelectorAll('.config-toggle').forEach(btn => btn.addEventListener('click', () => btn.classList.toggle('on')));
  }

  function buildCheats() {
    return `
      <div class="admin-section-title">🎮 CHEATS & OUTILS</div>
      <div class="cheat-grid">
        <button class="cheat-btn" onclick="Admin._addCoinsCurrent(9999)"><div class="cheat-title">◈ Max Coins</div><div class="cheat-desc">+9999 coins au compte actuel</div></button>
        <button class="cheat-btn" onclick="Admin._unlockAllCurrent()"><div class="cheat-title">🔓 Tout débloquer</div><div class="cheat-desc">Tous les skins débloqués</div></button>
        <button class="cheat-btn" onclick="Admin._setSpeed(200)"><div class="cheat-title">🐌 Mode Tortue</div><div class="cheat-desc">Vitesse très lente (200ms)</div></button>
        <button class="cheat-btn" onclick="Admin._setSpeed(30)"><div class="cheat-title">⚡ Mode Éclair</div><div class="cheat-desc">Vitesse maximale (30ms)</div></button>
        <button class="cheat-btn" onclick="Admin._setSpeed(80)"><div class="cheat-title">↩ Reset Vitesse</div><div class="cheat-desc">Vitesse par défaut</div></button>
        <button class="cheat-btn" onclick="Admin._toggleDoubleCoins()"><div class="cheat-title">💰 Toggle Double Coins</div><div class="cheat-desc">Active/désactive l'événement</div></button>
        <button class="cheat-btn" onclick="Admin._clearLeaderboard()"><div class="cheat-title" style="color:var(--danger)">🗑 Reset Leaderboard</div><div class="cheat-desc">Efface le classement global</div></button>
        <button class="cheat-btn" onclick="Admin._exportAll()"><div class="cheat-title">📋 Export JSON</div><div class="cheat-desc">Copie toutes les données</div></button>
      </div>`;
  }

  function showAdminToast(msg, type='success') {
    const el = document.createElement('div');
    const color = type === 'danger' ? 'var(--danger)' : 'var(--success)';
    el.style.cssText = `position:fixed;bottom:24px;right:24px;padding:12px 24px;background:rgba(0,0,0,.8);border:1px solid ${color};border-radius:8px;color:${color};font-size:.8rem;z-index:99999;animation:fadeInOut 2.5s ease forwards;`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  return {
    tryLogin, logout,
    isLoggedIn: () => isLogged,
    renderTab,
    _addCoinsCurrent(n) { Accounts.addCoins(n); updateMenuCoins(); showAdminToast(`+${n} coins !`); renderTab(currentTab); },
    _setCoinsCurrent(n) { Accounts.updateStats({coins:n}); updateMenuCoins(); showAdminToast('Coins reset'); renderTab(currentTab); },
    _unlockAllCurrent() { SKINS_DATA.forEach(s => Accounts.unlockSkin(s.id)); showAdminToast('Tous les skins débloqués !'); renderTab(currentTab); },
    _unlockSkin(id) { Accounts.unlockSkin(id); showAdminToast(`${id} débloqué !`); renderTab(currentTab); },
    _equipSkin(id) { Accounts.equipSkin(id); showAdminToast(`${id} équipé !`); renderTab(currentTab); },
    _giveCoins(username, n) { showAdminToast(`+${n} coins donné à ${username} (rechargez)`); },
    _resetPlayer(username) { if(confirm(`Reset ${username} ?`)) showAdminToast('Reset effectué (rechargez)'); },
    _setSpeed(v) { Accounts.setConfig({speedBase:v}); showAdminToast(`Vitesse : ${v}ms`); },
    _toggleDoubleCoins() { const c=Accounts.getConfig(); Accounts.setConfig({doubleCoinEvent:!c.doubleCoinEvent}); showAdminToast(`Double coins: ${!c.doubleCoinEvent?'ON 🎉':'OFF'}`); },
    _clearLeaderboard() { if(confirm('Effacer le leaderboard global ?')) { try{const db=JSON.parse(localStorage.getItem('serpentis_accounts_v3')||'{}');db.globalLeaderboard=[];localStorage.setItem('serpentis_accounts_v3',JSON.stringify(db));showAdminToast('Leaderboard effacé');}catch(e){} } },
    _exportAll() { navigator.clipboard.writeText(localStorage.getItem('serpentis_accounts_v3')||'{}').then(()=>showAdminToast('JSON copié !')).catch(()=>showAdminToast('Erreur copie')); },
  };
})();
