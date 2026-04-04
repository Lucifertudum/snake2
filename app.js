/* =============================================
   app.js — Contrôleur principal v3
   Multi-comptes, profils, leaderboard global
============================================= */

function updateMenuCoins() {
  const c = Accounts.getCoins();
  ['menu-coins-val','shop-coins-val','hud-coins'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = c;
  });
}

const App = (() => {
  let currentMode = 'classic';

  // ---- Navigation ----
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + name);
    if (el) el.classList.add('active');
  }

  // ---- Init ----
  function init() {
    // Si pas connecté → écran auth
    if (!Accounts.isLoggedIn()) {
      showScreen('auth');
      bindAuthEvents();
    } else {
      enterGame();
    }

    // Konami code → admin
    const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let ki = 0;
    document.addEventListener('keydown', e => {
      if (e.key === KONAMI[ki]) { ki++; if (ki === KONAMI.length) { ki=0; showScreen('admin-login'); } }
      else ki = 0;
    });

    window.addEventListener('resize', () => Game.resize?.());
  }

  function enterGame() {
    updateMenuCoins();
    updateMenuProfile();
    drawSkinPreview(document.getElementById('skin-preview-canvas'), Accounts.getEquippedSkin());
    const skinName = (SKINS_DATA.find(s => s.id === Accounts.getEquippedSkin()) || SKINS_DATA[0]).name;
    document.getElementById('skin-preview-name').textContent = skinName;
    startBgAnimation();
    bindGameEvents();
    renderLeaderboard('classic');
    showScreen('menu');
  }

  function updateMenuProfile() {
    const user = Accounts.currentUser();
    if (!user) return;
    const title = Accounts.getTitle(user.stats);
    const el = document.getElementById('menu-profile-block');
    if (el) {
      el.innerHTML = `
        <span class="profile-avatar">${user.avatar}</span>
        <div class="profile-info">
          <span class="profile-name">${user.username}</span>
          <span class="profile-title">${title.label}</span>
        </div>
        <span class="profile-coins">◈ ${user.stats.coins || 0}</span>
      `;
    }
  }

  // ---- Auth Events ----
  function bindAuthEvents() {
    const tabBtns = document.querySelectorAll('.auth-tab-btn');
    const loginForm = document.getElementById('auth-login-form');
    const registerForm = document.getElementById('auth-register-form');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        loginForm.classList.toggle('hidden', tab !== 'login');
        registerForm.classList.toggle('hidden', tab !== 'register');
        document.getElementById('auth-error').textContent = '';
      });
    });

    // Avatar picker
    const avatarPicker = document.getElementById('avatar-picker');
    let selectedAvatar = 0;
    if (avatarPicker) {
      Accounts.AVATARS.forEach((av, i) => {
        const btn = document.createElement('button');
        btn.className = 'avatar-pick-btn' + (i === 0 ? ' selected' : '');
        btn.textContent = av;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.avatar-pick-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          selectedAvatar = i;
        });
        avatarPicker.appendChild(btn);
      });
    }

    // LOGIN
    document.getElementById('btn-do-login')?.addEventListener('click', () => {
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      const err = document.getElementById('auth-error');
      if (!username || !password) { err.textContent = 'Remplis tous les champs'; return; }
      const result = Accounts.login(username, password);
      if (result.ok) {
        err.textContent = '';
        enterGame();
      } else {
        err.textContent = result.error;
        document.getElementById('login-password').value = '';
      }
    });
    document.getElementById('login-password')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-do-login').click();
    });

    // REGISTER
    document.getElementById('btn-do-register')?.addEventListener('click', () => {
      const username = document.getElementById('reg-username').value.trim();
      const password = document.getElementById('reg-password').value;
      const confirm  = document.getElementById('reg-confirm').value;
      const err = document.getElementById('auth-error');
      if (!username || !password || !confirm) { err.textContent = 'Remplis tous les champs'; return; }
      if (password !== confirm) { err.textContent = 'Les mots de passe ne correspondent pas'; return; }
      const result = Accounts.register(username, password, selectedAvatar);
      if (result.ok) {
        err.textContent = '';
        showToast(`Bienvenue ${result.account.username} ! 🐍`, 'success');
        enterGame();
      } else {
        err.textContent = result.error;
      }
    });
    document.getElementById('reg-confirm')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-do-register').click();
    });

    // Play as guest
    document.getElementById('btn-guest')?.addEventListener('click', () => {
      // Register a guest account silently
      const guestName = 'Joueur' + Math.floor(Math.random() * 9000 + 1000);
      const result = Accounts.register(guestName, 'guest' + Date.now(), Math.floor(Math.random() * 20));
      if (result.ok) {
        showToast(`Mode invité — pseudo : ${guestName}`, 'info');
        enterGame();
      } else {
        // Already exists, try another
        const gn2 = 'Guest' + Date.now().toString(36);
        Accounts.register(gn2, 'g' + Date.now());
        enterGame();
      }
    });
  }

  // ---- Game Events ----
  function bindGameEvents() {
    document.getElementById('btn-play-menu')?.addEventListener('click', () => launchCountdown(currentMode));
    document.getElementById('btn-modes-menu')?.addEventListener('click', () => showScreen('modes'));
    document.getElementById('btn-modes-close')?.addEventListener('click', () => showScreen('menu'));
    document.getElementById('btn-shop-menu')?.addEventListener('click', () => { Shop.render(); showScreen('shop'); });
    document.getElementById('btn-shop-close')?.addEventListener('click', () => showScreen('menu'));
    document.getElementById('btn-leaderboard-menu')?.addEventListener('click', () => { renderGlobalLeaderboard('classic'); showScreen('leaderboard'); });
    document.getElementById('btn-lb-close')?.addEventListener('click', () => showScreen('menu'));
    document.getElementById('btn-profile-menu')?.addEventListener('click', () => { renderProfile(); showScreen('profile'); });
    document.getElementById('btn-profile-close')?.addEventListener('click', () => showScreen('menu'));

    // Logout button
    document.getElementById('btn-logout-menu')?.addEventListener('click', () => {
      if (confirm('Se déconnecter ?')) { Accounts.logout(); showScreen('auth'); bindAuthEvents(); }
    });

    // Mode cards
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        currentMode = card.dataset.mode;
      });
    });
    document.getElementById('btn-start-mode')?.addEventListener('click', () => {
      showScreen('menu'); setTimeout(() => launchCountdown(currentMode), 200);
    });

    // Leaderboard tabs (local + global)
    document.querySelectorAll('.lb-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const isGlobal = document.getElementById('lb-global-toggle')?.classList.contains('on');
        if (isGlobal) renderGlobalLeaderboard(tab.dataset.mode);
        else renderLeaderboard(tab.dataset.mode);
      });
    });

    // Toggle local/global leaderboard
    document.getElementById('lb-global-toggle')?.addEventListener('click', (e) => {
      e.target.classList.toggle('on');
      const mode = document.querySelector('.lb-tab.active')?.dataset.mode || 'classic';
      const isGlobal = e.target.classList.contains('on');
      e.target.textContent = isGlobal ? '🌍 Global' : '👤 Local';
      if (isGlobal) renderGlobalLeaderboard(mode);
      else renderLeaderboard(mode);
    });

    // HUD
    document.getElementById('hud-back')?.addEventListener('click', () => { Game.stop(); showScreen('menu'); });
    document.getElementById('hud-pause')?.addEventListener('click', () => Game.togglePause());
    document.getElementById('btn-resume')?.addEventListener('click', () => Game.togglePause());
    document.getElementById('btn-quit-pause')?.addEventListener('click', () => {
      Game.stop();
      document.getElementById('pause-overlay').classList.add('hidden');
      showScreen('menu');
    });

    // Game Over
    document.getElementById('btn-go-retry')?.addEventListener('click', () => launchCountdown(currentMode));
    document.getElementById('btn-go-menu')?.addEventListener('click', () => showScreen('menu'));
    document.getElementById('btn-go-shop')?.addEventListener('click', () => { Shop.render(); showScreen('shop'); });

    // Profile tabs
    document.querySelectorAll('.profile-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderProfileTab(tab.dataset.tab);
      });
    });

    // Admin login
    document.getElementById('btn-admin-login')?.addEventListener('click', async () => {
      const pwd = document.getElementById('admin-pwd').value;
      const ok = await Admin.tryLogin(pwd);
      if (ok) {
        showScreen('admin'); Admin.renderTab('dashboard');
        document.getElementById('admin-pwd').value = '';
        document.getElementById('login-error').classList.add('hidden');
      } else {
        document.getElementById('login-error').classList.remove('hidden');
        document.getElementById('admin-pwd').value = '';
      }
    });
    document.getElementById('admin-pwd')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-admin-login').click();
    });
    document.getElementById('btn-admin-cancel')?.addEventListener('click', () => showScreen('menu'));
    document.getElementById('admin-logout')?.addEventListener('click', () => { Admin.logout(); showScreen('menu'); });
    document.querySelectorAll('.admin-tab').forEach(tab => tab.addEventListener('click', () => Admin.renderTab(tab.dataset.tab)));
  }

  // ---- Countdown ----
  function launchCountdown(mode) {
    showScreen('game');
    const overlay = document.getElementById('countdown-overlay');
    const numEl = document.getElementById('countdown-num');
    overlay.classList.remove('hidden');
    let count = 3;
    numEl.textContent = count;
    numEl.style.animation = 'none'; numEl.offsetHeight;
    numEl.style.animation = 'countdown-pop .6s ease-out';
    const interval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        overlay.classList.add('hidden');
        Game.init(mode);
      } else {
        numEl.textContent = count;
        numEl.style.animation = 'none'; numEl.offsetHeight;
        numEl.style.animation = 'countdown-pop .6s ease-out';
      }
    }, 800);
  }

  // ---- Local Leaderboard (this player) ----
  function renderLeaderboard(mode) {
    const scores = Accounts.getTopScores(mode, 10);
    const list = document.getElementById('lb-list');
    const subtitle = document.getElementById('lb-subtitle');
    if (subtitle) subtitle.textContent = 'Vos meilleurs scores';
    if (!scores.length) { list.innerHTML = '<div class="lb-empty">Aucun score pour ce mode</div>'; return; }
    const medals = ['🥇','🥈','🥉'];
    list.innerHTML = scores.map((s, i) => `
      <div class="lb-entry">
        <span class="lb-rank ${i<3?'top'+(i+1):''}">${medals[i]||'#'+(i+1)}</span>
        <span class="lb-name">${Accounts.currentUser()?.avatar || '🐍'} ${Accounts.currentUser()?.username || 'Vous'}</span>
        <span class="lb-score">${s.score}</span>
        <span style="font-size:.7rem;color:var(--text-dim);margin-left:8px">niv.${s.level}</span>
        <span style="font-size:.65rem;color:var(--text-muted);margin-left:auto">${s.date||''}</span>
      </div>`).join('');
  }

  // ---- Global Leaderboard ----
  function renderGlobalLeaderboard(mode) {
    const entries = Accounts.getGlobalLeaderboard(mode, 20);
    const list = document.getElementById('lb-list');
    const subtitle = document.getElementById('lb-subtitle');
    if (subtitle) subtitle.textContent = '🌍 Classement global';
    if (!entries.length) { list.innerHTML = '<div class="lb-empty">Aucun score enregistré</div>'; return; }
    const medals = ['🥇','🥈','🥉'];
    const currentName = Accounts.currentUser()?.username;
    list.innerHTML = entries.map((e, i) => `
      <div class="lb-entry ${e.username === currentName ? 'lb-me' : ''}">
        <span class="lb-rank ${i<3?'top'+(i+1):''}">${medals[i]||'#'+(i+1)}</span>
        <span class="lb-name">${e.avatar||'🐍'} ${e.username}</span>
        <span class="lb-score">${e.score}</span>
        <span style="font-size:.7rem;color:var(--text-dim);margin-left:8px">niv.${e.level}</span>
        <span style="font-size:.65rem;color:var(--text-muted);margin-left:auto">${e.date||''}</span>
      </div>`).join('');
  }

  // ---- Profile ----
  function renderProfile() {
    const user = Accounts.currentUser();
    if (!user) return;
    const stats = user.stats;
    const title = Accounts.getTitle(stats);
    const rank = Accounts.getRankAmong('all');

    // Header
    document.getElementById('profile-avatar-big').textContent = user.avatar;
    document.getElementById('profile-username').textContent = user.username;
    document.getElementById('profile-title-badge').textContent = title.label;
    document.getElementById('profile-join-date').textContent = `Membre depuis le ${stats.joinDate || '—'}`;
    document.getElementById('profile-rank').textContent = rank ? `#${rank} mondial` : 'Non classé';

    // Default tab
    renderProfileTab('stats');
  }

  function renderProfileTab(tab) {
    document.querySelectorAll('.profile-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    const body = document.getElementById('profile-tab-body');
    const user = Accounts.currentUser();
    if (!user) return;
    const stats = user.stats;

    switch(tab) {
      case 'stats': body.innerHTML = buildProfileStats(stats); break;
      case 'badges': body.innerHTML = buildProfileBadges(stats); break;
      case 'scores': body.innerHTML = buildProfileScores(stats); break;
      case 'settings': body.innerHTML = buildProfileSettings(user); bindProfileSettings(); break;
    }
  }

  function buildProfileStats(stats) {
    const modes = ['classic','smooth','portal','blitz','maze','zen'];
    const totalPlayMin = Math.round((stats.totalPlayTime||0)/60);
    return `
      <div class="profile-stats-grid">
        <div class="pstat"><div class="pstat-val">${stats.gamesPlayed||0}</div><div class="pstat-label">Parties</div></div>
        <div class="pstat"><div class="pstat-val accent">${stats.bestScore||0}</div><div class="pstat-label">Meilleur score</div></div>
        <div class="pstat"><div class="pstat-val success">${stats.totalApples||0}</div><div class="pstat-label">Pommes</div></div>
        <div class="pstat"><div class="pstat-val gold">◈ ${stats.coins||0}</div><div class="pstat-label">Coins</div></div>
        <div class="pstat"><div class="pstat-val">${stats.totalCoinsEarned||0}</div><div class="pstat-label">Coins gagnés</div></div>
        <div class="pstat"><div class="pstat-val">${totalPlayMin}min</div><div class="pstat-label">Temps de jeu</div></div>
        <div class="pstat"><div class="pstat-val">${(stats.ownedSkins||[]).length}</div><div class="pstat-label">Skins possédés</div></div>
        <div class="pstat"><div class="pstat-val accent">${stats.favoriteMode || '—'}</div><div class="pstat-label">Mode favori</div></div>
      </div>
      <div class="profile-section-title">Records par mode</div>
      <div class="profile-mode-records">
        ${modes.map(m => `<div class="pmr-row">
          <span class="pmr-mode">${m.toUpperCase()}</span>
          <span class="pmr-score">${stats.bestScores?.[m]||0}</span>
          <span class="pmr-count">${(stats.allTimeScores?.[m]||[]).length} parties</span>
        </div>`).join('')}
      </div>`;
  }

  function buildProfileBadges(stats) {
    const earned = stats.badges || [];
    const allBadges = Accounts.BADGES;
    return `
      <div class="profile-section-title">Badges débloqués (${earned.length}/${allBadges.length})</div>
      <div class="badges-grid">
        ${allBadges.map(b => {
          const has = earned.includes(b.id);
          return `<div class="badge-card ${has ? 'earned' : 'locked'}">
            <div class="badge-icon">${has ? b.icon : '🔒'}</div>
            <div class="badge-name">${b.label}</div>
            <div class="badge-desc">${b.desc}</div>
          </div>`;
        }).join('')}
      </div>`;
  }

  function buildProfileScores(stats) {
    const modes = ['classic','smooth','portal','blitz','maze','zen'];
    return `
      <div class="profile-section-title">Historique des scores</div>
      ${modes.map(m => {
        const scores = (stats.allTimeScores?.[m]||[]).slice(0,5);
        if (!scores.length) return '';
        return `<div class="score-history-mode">
          <div class="shm-title">${m.toUpperCase()}</div>
          ${scores.map((s,i) => `<div class="shm-row">
            <span style="color:var(--text-dim)">#${i+1}</span>
            <span style="color:var(--accent);font-family:var(--font-hd)">${s.score}</span>
            <span style="color:var(--text-dim);font-size:.7rem">niv.${s.level}</span>
            <span style="color:var(--text-muted);font-size:.65rem;margin-left:auto">${s.date||''}</span>
          </div>`).join('')}
        </div>`;
      }).join('')}`;
  }

  function buildProfileSettings(user) {
    return `
      <div class="profile-section-title">Changer d'avatar</div>
      <div id="profile-avatar-picker" class="avatar-picker-row"></div>
      <div class="profile-section-title" style="margin-top:20px">Changer de mot de passe</div>
      <div class="settings-form">
        <input type="password" id="s-old-pwd" placeholder="Ancien mot de passe" class="admin-input"/>
        <input type="password" id="s-new-pwd" placeholder="Nouveau mot de passe" class="admin-input"/>
        <input type="password" id="s-new-pwd2" placeholder="Confirmer" class="admin-input"/>
        <button class="btn-primary" id="s-save-pwd">Changer le mot de passe</button>
        <p id="s-pwd-msg" style="font-size:.8rem;margin-top:8px;color:var(--success)"></p>
      </div>
      <div style="margin-top:20px">
        <button class="btn-secondary" id="s-logout">🚪 Se déconnecter</button>
      </div>`;
  }

  function bindProfileSettings() {
    // Avatar picker
    const picker = document.getElementById('profile-avatar-picker');
    const user = Accounts.currentUser();
    let selIdx = Accounts.AVATARS.indexOf(user?.avatar || '🐍');
    if (selIdx < 0) selIdx = 0;
    Accounts.AVATARS.forEach((av, i) => {
      const btn = document.createElement('button');
      btn.className = 'avatar-pick-btn' + (i === selIdx ? ' selected' : '');
      btn.textContent = av;
      btn.addEventListener('click', () => {
        document.querySelectorAll('#profile-avatar-picker .avatar-pick-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        Accounts.changeAvatar(i);
        document.getElementById('profile-avatar-big').textContent = av;
        updateMenuProfile();
        showToast('Avatar mis à jour !', 'success');
      });
      picker.appendChild(btn);
    });

    // Password
    document.getElementById('s-save-pwd')?.addEventListener('click', () => {
      const old = document.getElementById('s-old-pwd').value;
      const n1 = document.getElementById('s-new-pwd').value;
      const n2 = document.getElementById('s-new-pwd2').value;
      const msg = document.getElementById('s-pwd-msg');
      if (n1 !== n2) { msg.style.color='var(--danger)'; msg.textContent = 'Les mots de passe ne correspondent pas'; return; }
      const res = Accounts.changePassword(old, n1);
      if (res.ok) { msg.style.color='var(--success)'; msg.textContent = '✓ Mot de passe changé !'; ['s-old-pwd','s-new-pwd','s-new-pwd2'].forEach(id => document.getElementById(id).value=''); }
      else { msg.style.color='var(--danger)'; msg.textContent = res.error; }
    });

    document.getElementById('s-logout')?.addEventListener('click', () => {
      if (confirm('Se déconnecter ?')) { Accounts.logout(); showScreen('auth'); }
    });
  }

  // ---- Badge toast ----
  function showBadgeToast(badges) {
    badges.forEach((badge, i) => {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'badge-toast';
        el.innerHTML = `<div class="badge-toast-icon">${badge.icon}</div><div><div class="badge-toast-title">Badge débloqué !</div><div class="badge-toast-name">${badge.label}</div></div>`;
        document.body.appendChild(el);
        setTimeout(() => el.classList.add('show'), 10);
        setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3500);
      }, i * 800);
    });
  }

  // ---- General toast ----
  function showToast(msg, type = 'success') {
    const colors = { success: 'var(--success)', danger: 'var(--danger)', info: 'var(--accent)' };
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;top:24px;right:24px;padding:12px 24px;background:rgba(0,0,0,.9);border:1px solid ${colors[type]||colors.info};border-radius:8px;color:${colors[type]||colors.info};font-size:.85rem;z-index:99999;animation:toastIn .3s ease;`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ---- BG animation ----
  function startBgAnimation() {
    const bgCanvas = document.getElementById('bg-canvas');
    if (!bgCanvas) return;
    const bgCtx = bgCanvas.getContext('2d');
    let dots = [];

    function resizeBg() {
      bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight;
      dots = Array.from({length:60}, () => ({
        x: Math.random()*bgCanvas.width, y: Math.random()*bgCanvas.height,
        r: .5+Math.random()*2, vx:(Math.random()-.5)*.3, vy:(Math.random()-.5)*.3,
        alpha:.2+Math.random()*.5,
      }));
    }
    resizeBg();
    window.addEventListener('resize', resizeBg);

    let bgSnake = Array.from({length:30}, (_,i) => ({x: window.innerWidth*.5-i*12, y: window.innerHeight*.5}));
    let bgAngle = 0, bgTick = 0;

    function animBg() {
      const W2=bgCanvas.width, H2=bgCanvas.height;
      bgCtx.clearRect(0,0,W2,H2);
      dots.forEach(d => {
        d.x+=d.vx; d.y+=d.vy;
        if(d.x<0)d.x=W2; if(d.x>W2)d.x=0; if(d.y<0)d.y=H2; if(d.y>H2)d.y=0;
        bgCtx.globalAlpha=d.alpha; bgCtx.fillStyle='#00f5ff';
        bgCtx.beginPath(); bgCtx.arc(d.x,d.y,d.r,0,Math.PI*2); bgCtx.fill();
      });
      bgTick++;
      if(bgTick%2===0) {
        bgAngle+=0.04;
        bgSnake.unshift({x:W2/2+Math.cos(bgAngle)*W2*.25, y:H2/2+Math.sin(bgAngle*.7)*H2*.22});
        bgSnake.pop();
      }
      bgSnake.forEach((seg,i) => {
        const t=i/bgSnake.length;
        const skin = SKINS_DATA.find(s => s.id===Accounts.getEquippedSkin()) || SKINS_DATA[0];
        bgCtx.globalAlpha=(1-t)*0.12; bgCtx.fillStyle=skin.head;
        bgCtx.beginPath(); bgCtx.arc(seg.x,seg.y,8*(1-t*.5),0,Math.PI*2); bgCtx.fill();
      });
      bgCtx.globalAlpha=1;
      requestAnimationFrame(animBg);
    }
    animBg();
  }

  return { showScreen, init, showBadgeToast, showToast, renderLeaderboard, renderGlobalLeaderboard, updateMenuProfile };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
