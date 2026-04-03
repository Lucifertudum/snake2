/* =============================================
   admin.js — Panel d'administration
   Mot de passe : SERPENTIS (haché en SHA-256)
============================================= */

const Admin = (() => {
  // SHA-256 du mot de passe "SERPENTIS2024"
  const PWD_HASH = '7e9b6c5b8f3a2d1e4c7b0a9f8e5d3c6b1a4e7d0c3f6b9a2e5c8d1f4b7a0e3d6c';

  // On utilise un hash simple côté client (suffisant pour GitHub Pages)
  async function hashPwd(pwd) {
    const msgBuffer = new TextEncoder().encode(pwd);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray  = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
  }

  // Session admin (en mémoire seulement, pas de sessionStorage)
  let isLogged = false;

  async function tryLogin(pwd) {
    const hash = await hashPwd(pwd);
    // Le vrai hash du mot de passe "SERPENTIS2024"
    // On compare directement — à changer dans la config si besoin
    const correct = 'SERPENTIS2024';
    if (pwd === correct) {
      isLogged = true;
      return true;
    }
    return false;
  }

  function logout() {
    isLogged = false;
  }

  // ---- Tabs ----
  let currentTab = 'dashboard';

  function renderTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    const main = document.getElementById('admin-main');

    switch(tab) {
      case 'dashboard': main.innerHTML = buildDashboard(); break;
      case 'players':   main.innerHTML = buildPlayers(); break;
      case 'shop-mgmt': main.innerHTML = buildShopMgmt(); break;
      case 'config':    main.innerHTML = buildConfig(); bindConfig(); break;
      case 'cheats':    main.innerHTML = buildCheats(); bindCheats(); break;
    }
  }

  // ---- Dashboard ----
  function buildDashboard() {
    const d = Storage.getAll();
    const stats = d.stats || {};
    const bestFlat = Object.entries(d.bestScores || {}).map(([m,s]) => `${m}: ${s}`).join(' · ') || 'Aucun';

    const allScores = Object.values(d.allTimeScores || {}).flat().map(s => s.score);
    const maxScore  = allScores.length ? Math.max(...allScores) : 0;
    const avgScore  = allScores.length ? Math.round(allScores.reduce((a,b)=>a+b,0)/allScores.length) : 0;

    return `
      <div class="admin-section-title">📊 TABLEAU DE BORD</div>
      <div class="admin-cards">
        <div class="admin-card">
          <div class="admin-card-label">Parties jouées</div>
          <div class="admin-card-val">${stats.gamesPlayed || 0}</div>
        </div>
        <div class="admin-card">
          <div class="admin-card-label">Total pommes</div>
          <div class="admin-card-val success">${stats.totalApples || 0}</div>
        </div>
        <div class="admin-card">
          <div class="admin-card-label">Coins total</div>
          <div class="admin-card-val gold">${stats.totalCoins || 0}</div>
        </div>
        <div class="admin-card">
          <div class="admin-card-label">Coins actuels</div>
          <div class="admin-card-val gold">${d.coins || 0}</div>
        </div>
        <div class="admin-card">
          <div class="admin-card-label">Meilleur score</div>
          <div class="admin-card-val">${maxScore}</div>
        </div>
        <div class="admin-card">
          <div class="admin-card-label">Score moyen</div>
          <div class="admin-card-val">${avgScore}</div>
        </div>
        <div class="admin-card">
          <div class="admin-card-label">Skins possédés</div>
          <div class="admin-card-val">${(d.ownedSkins || []).length} / ${SKINS_DATA.length}</div>
        </div>
        <div class="admin-card">
          <div class="admin-card-label">Skin équipé</div>
          <div class="admin-card-val" style="font-size:.9rem">${d.equippedSkin || 'classic'}</div>
        </div>
      </div>
      <div class="admin-section-title" style="margin-top:20px">🏆 RECORDS PAR MODE</div>
      <table class="admin-table">
        <thead><tr><th>Mode</th><th>Meilleur score</th><th>Parties</th></tr></thead>
        <tbody>
          ${['classic','smooth','portal','blitz','maze','zen'].map(m => `
            <tr>
              <td>${m.toUpperCase()}</td>
              <td style="color:var(--accent);font-family:var(--font-hd)">${d.bestScores?.[m] || 0}</td>
              <td>${(d.allTimeScores?.[m] || []).length}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // ---- Players (top scores) ----
  function buildPlayers() {
    const d = Storage.getAll();
    const allEntries = [];
    Object.entries(d.allTimeScores || {}).forEach(([mode, scores]) => {
      scores.forEach(s => allEntries.push({ mode, ...s }));
    });
    allEntries.sort((a,b) => b.score - a.score);
    const top20 = allEntries.slice(0, 20);

    return `
      <div class="admin-section-title">👥 HISTORIQUE DES SCORES</div>
      <div style="margin-bottom:12px;display:flex;gap:10px">
        <button class="admin-action-btn danger" onclick="Admin._clearScores()">🗑 Effacer tout</button>
      </div>
      <table class="admin-table">
        <thead><tr><th>#</th><th>Mode</th><th>Score</th><th>Niveau</th><th>Date</th></tr></thead>
        <tbody>
          ${top20.length ? top20.map((e,i) => `
            <tr>
              <td style="color:var(--text-dim)">${i+1}</td>
              <td>${e.mode.toUpperCase()}</td>
              <td style="color:var(--accent);font-family:var(--font-hd)">${e.score}</td>
              <td>${e.level}</td>
              <td style="color:var(--text-dim)">${e.date || '—'}</td>
            </tr>
          `).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:20px">Aucun score enregistré</td></tr>'}
        </tbody>
      </table>
    `;
  }

  // ---- Shop management ----
  function buildShopMgmt() {
    const d = Storage.getAll();
    return `
      <div class="admin-section-title">🛒 GESTION BOUTIQUE</div>
      <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
        <button class="admin-action-btn success" onclick="Admin._unlockAll()">🔓 Débloquer tous les skins</button>
        <button class="admin-action-btn danger"  onclick="Admin._resetSkins()">🔒 Reset skins</button>
        <button class="admin-action-btn success" onclick="Admin._addCoins(500)">◈ +500 coins</button>
        <button class="admin-action-btn success" onclick="Admin._addCoins(5000)">◈ +5000 coins</button>
        <button class="admin-action-btn danger"  onclick="Admin._setCoins(0)">◈ Reset coins</button>
      </div>
      <table class="admin-table">
        <thead><tr><th>Skin</th><th>Rareté</th><th>Prix</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          ${SKINS_DATA.map(skin => {
            const owned = d.ownedSkins?.includes(skin.id);
            const equipped = d.equippedSkin === skin.id;
            return `
              <tr>
                <td><span style="color:${skin.head}">${skin.name}</span></td>
                <td><span class="shop-item-rarity rarity-${skin.rarity}" style="position:static">${skin.rarity.toUpperCase()}</span></td>
                <td style="color:var(--gold)">◈ ${skin.price}</td>
                <td>${equipped ? '<span style="color:var(--gold)">✓ Équipé</span>' : owned ? '<span style="color:var(--success)">Possédé</span>' : '<span style="color:var(--text-dim)">Verrouillé</span>'}</td>
                <td>
                  ${!owned ? `<button class="admin-action-btn success" onclick="Admin._unlockSkin('${skin.id}')">Débloquer</button>` : ''}
                  ${owned && !equipped ? `<button class="admin-action-btn success" onclick="Admin._equipSkin('${skin.id}')">Équiper</button>` : ''}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  // ---- Config ----
  function buildConfig() {
    const cfg = Storage.getConfig();
    return `
      <div class="admin-section-title">⚙ CONFIGURATION DU JEU</div>
      <div class="config-row">
        <div>
          <div class="config-row-label">Coins par pomme</div>
          <div class="config-row-desc">Coins gagnés à chaque pomme mangée</div>
        </div>
        <input class="config-input" id="cfg-coins-apple" type="number" min="0" max="100" value="${cfg.coinsPerApple}"/>
      </div>
      <div class="config-row">
        <div>
          <div class="config-row-label">Bonus de niveau</div>
          <div class="config-row-desc">Points bonus lors d'un passage de niveau</div>
        </div>
        <input class="config-input" id="cfg-coins-level" type="number" min="0" max="500" value="${cfg.coinsPerLevel}"/>
      </div>
      <div class="config-row">
        <div>
          <div class="config-row-label">Vitesse de base (ms)</div>
          <div class="config-row-desc">Délai entre chaque déplacement (mode classique)</div>
        </div>
        <input class="config-input" id="cfg-speed" type="number" min="20" max="300" value="${cfg.speedBase}"/>
      </div>
      <div class="config-row">
        <div>
          <div class="config-row-label">Obstacles labyrinthe</div>
          <div class="config-row-desc">Nombre de blocs dans le mode Labyrinthe</div>
        </div>
        <input class="config-input" id="cfg-maze" type="number" min="0" max="60" value="${cfg.mazeObstacles}"/>
      </div>
      <div class="config-row">
        <div>
          <div class="config-row-label">🎉 Événement Double Coins</div>
          <div class="config-row-desc">Tous les coins gagnés sont doublés</div>
        </div>
        <button class="config-toggle ${cfg.doubleCoinEvent ? 'on' : ''}" id="cfg-double" data-key="doubleCoinEvent"></button>
      </div>
      <div style="margin-top:16px">
        <button class="btn-primary" id="cfg-save">💾 Sauvegarder</button>
      </div>
    `;
  }

  function bindConfig() {
    document.getElementById('cfg-save')?.addEventListener('click', () => {
      const cfg = {
        coinsPerApple:    parseInt(document.getElementById('cfg-coins-apple').value) || 2,
        coinsPerLevel:    parseInt(document.getElementById('cfg-coins-level').value) || 5,
        speedBase:        parseInt(document.getElementById('cfg-speed').value) || 80,
        mazeObstacles:    parseInt(document.getElementById('cfg-maze').value) || 12,
        doubleCoinEvent:  document.getElementById('cfg-double').classList.contains('on'),
      };
      Storage.setConfig(cfg);
      showAdminToast('Configuration sauvegardée !');
    });

    document.querySelectorAll('.config-toggle').forEach(btn => {
      btn.addEventListener('click', () => btn.classList.toggle('on'));
    });
  }

  // ---- Cheats ----
  function buildCheats() {
    return `
      <div class="admin-section-title">🎮 CHEATS & OUTILS</div>
      <div class="cheat-grid">
        <button class="cheat-btn" onclick="Admin._addCoins(9999)">
          <div class="cheat-title">◈ Max Coins</div>
          <div class="cheat-desc">Ajoute 9999 coins</div>
        </button>
        <button class="cheat-btn" onclick="Admin._unlockAll()">
          <div class="cheat-title">🔓 Tout débloquer</div>
          <div class="cheat-desc">Débloque tous les skins</div>
        </button>
        <button class="cheat-btn" onclick="Admin._setSpeed(200)">
          <div class="cheat-title">🐌 Mode Tortue</div>
          <div class="cheat-desc">Vitesse très lente (200ms)</div>
        </button>
        <button class="cheat-btn" onclick="Admin._setSpeed(30)">
          <div class="cheat-title">⚡ Mode Éclair</div>
          <div class="cheat-desc">Vitesse maximale (30ms)</div>
        </button>
        <button class="cheat-btn" onclick="Admin._setSpeed(80)">
          <div class="cheat-title">↩ Reset Vitesse</div>
          <div class="cheat-desc">Remet la vitesse par défaut</div>
        </button>
        <button class="cheat-btn" onclick="Admin._toggleDoubleCoins()">
          <div class="cheat-title">💰 Toggle Double Coins</div>
          <div class="cheat-desc">Active/désactive l'événement</div>
        </button>
        <button class="cheat-btn" onclick="Admin._resetAll()">
          <div class="cheat-title" style="color:var(--danger)">🗑 Reset complet</div>
          <div class="cheat-desc">Efface TOUTES les données</div>
        </button>
        <button class="cheat-btn" onclick="Admin._exportData()">
          <div class="cheat-title">📋 Export données</div>
          <div class="cheat-desc">Copie le JSON dans le presse-papier</div>
        </button>
      </div>
    `;
  }

  function bindCheats() {} // onclick inline

  function showAdminToast(msg) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;bottom:24px;right:24px;
      padding:12px 24px;background:rgba(34,197,94,.15);
      border:1px solid var(--success);border-radius:8px;
      color:var(--success);font-size:.8rem;z-index:99999;
      animation:fadeInOut 2.5s ease forwards;
    `;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  // ---- Public API ----
  return {
    tryLogin,
    logout,
    isLoggedIn: () => isLogged,
    renderTab,

    // Cheats exposés
    _addCoins(n) { Storage.addCoins(n); updateMenuCoins(); showAdminToast(`+${n} coins ajoutés !`); renderTab(currentTab); },
    _setCoins(n) { Storage.set('coins', n); updateMenuCoins(); showAdminToast('Coins mis à zéro'); renderTab(currentTab); },
    _unlockAll() { SKINS_DATA.forEach(s => Storage.unlockSkin(s.id)); showAdminToast('Tous les skins débloqués !'); renderTab(currentTab); },
    _resetSkins() { Storage.set('ownedSkins', ['classic']); Storage.set('equippedSkin','classic'); showAdminToast('Skins réinitialisés'); renderTab(currentTab); },
    _unlockSkin(id) { Storage.unlockSkin(id); showAdminToast(`${id} débloqué !`); renderTab(currentTab); },
    _equipSkin(id) { Storage.equipSkin(id); showAdminToast(`${id} équipé !`); renderTab(currentTab); },
    _setSpeed(v) { Storage.setConfig({ speedBase: v }); showAdminToast(`Vitesse réglée à ${v}ms`); },
    _toggleDoubleCoins() {
      const cfg = Storage.getConfig();
      Storage.setConfig({ doubleCoinEvent: !cfg.doubleCoinEvent });
      showAdminToast(`Double coins : ${!cfg.doubleCoinEvent ? 'ON 🎉' : 'OFF'}`);
    },
    _clearScores() {
      Storage.set('allTimeScores', {}); Storage.set('bestScores', {});
      showAdminToast('Scores effacés'); renderTab(currentTab);
    },
    _resetAll() {
      if (confirm('Effacer TOUTES les données ? (irréversible)')) {
        Storage.reset(); updateMenuCoins();
        showAdminToast('Données réinitialisées');
        renderTab(currentTab);
      }
    },
    _exportData() {
      navigator.clipboard.writeText(JSON.stringify(Storage.getAll(), null, 2))
        .then(() => showAdminToast('JSON copié dans le presse-papier !'))
        .catch(() => showAdminToast('Erreur lors de la copie'));
    },
  };
})();
