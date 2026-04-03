/* =============================================
   app.js — Contrôleur principal
============================================= */

// ---- Utilitaire coins ----
function updateMenuCoins() {
  const c = Storage.get('coins');
  const el1 = document.getElementById('menu-coins-val');
  const el2 = document.getElementById('shop-coins-val');
  const el3 = document.getElementById('hud-coins');
  if (el1) el1.textContent = c;
  if (el2) el2.textContent = c;
  if (el3) el3.textContent = c;
}

// ---- App ----
const App = (() => {
  let currentMode = 'classic';

  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + name);
    if (el) el.classList.add('active');
  }

  function init() {
    updateMenuCoins();
    drawSkinPreview(document.getElementById('skin-preview-canvas'), Storage.get('equippedSkin'));
    document.getElementById('skin-preview-name').textContent = getSkin(Storage.get('equippedSkin')).name;
    startBgAnimation();
    bindEvents();
    initLeaderboard();
  }

  // ---- Background canvas animation ----
  function startBgAnimation() {
    const bgCanvas = document.getElementById('bg-canvas');
    const bgCtx = bgCanvas.getContext('2d');
    let dots = [];

    function resizeBg() {
      bgCanvas.width  = window.innerWidth;
      bgCanvas.height = window.innerHeight;
      // Régénérer les particules
      dots = Array.from({length: 60}, () => ({
        x: Math.random() * bgCanvas.width,
        y: Math.random() * bgCanvas.height,
        r: .5 + Math.random() * 2,
        vx: (Math.random() - .5) * .3,
        vy: (Math.random() - .5) * .3,
        alpha: .2 + Math.random() * .5,
      }));
    }
    resizeBg();
    window.addEventListener('resize', resizeBg);

    // Snake déco en arrière-plan
    let bgSnake = Array.from({length: 30}, (_, i) => ({
      x: window.innerWidth * .5 - i * 12,
      y: window.innerHeight * .5,
    }));
    let bgAngle = 0;
    let bgTick  = 0;

    function animBg() {
      const W2 = bgCanvas.width, H2 = bgCanvas.height;
      bgCtx.clearRect(0, 0, W2, H2);

      // Points flottants
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = W2; if (d.x > W2) d.x = 0;
        if (d.y < 0) d.y = H2; if (d.y > H2) d.y = 0;
        bgCtx.globalAlpha = d.alpha;
        bgCtx.fillStyle = '#00f5ff';
        bgCtx.beginPath(); bgCtx.arc(d.x, d.y, d.r, 0, Math.PI*2); bgCtx.fill();
      });

      // Snake déco
      bgTick++;
      if (bgTick % 2 === 0) {
        bgAngle += 0.04;
        const targetX = W2/2 + Math.cos(bgAngle) * W2 * .25;
        const targetY = H2/2 + Math.sin(bgAngle * .7) * H2 * .22;
        bgSnake.unshift({ x: targetX, y: targetY });
        bgSnake.pop();
      }

      bgSnake.forEach((seg, i) => {
        const t = i / bgSnake.length;
        const skin = getSkin(Storage.get('equippedSkin'));
        bgCtx.globalAlpha = (1-t) * 0.12;
        bgCtx.fillStyle = skin.head;
        bgCtx.beginPath();
        bgCtx.arc(seg.x, seg.y, 8 * (1-t*.5), 0, Math.PI*2);
        bgCtx.fill();
      });

      bgCtx.globalAlpha = 1;
      requestAnimationFrame(animBg);
    }
    animBg();
  }

  // ---- Events ----
  function bindEvents() {
    // MENU
    document.getElementById('btn-play-menu').addEventListener('click', () => {
      launchCountdown(currentMode);
    });

    document.getElementById('btn-modes-menu').addEventListener('click', () => showScreen('modes'));
    document.getElementById('btn-modes-close').addEventListener('click', () => showScreen('menu'));

    document.getElementById('btn-shop-menu').addEventListener('click', () => {
      Shop.render();
      showScreen('shop');
    });
    document.getElementById('btn-shop-close').addEventListener('click', () => showScreen('menu'));

    document.getElementById('btn-leaderboard-menu').addEventListener('click', () => {
      renderLeaderboard('classic');
      showScreen('leaderboard');
    });
    document.getElementById('btn-lb-close').addEventListener('click', () => showScreen('menu'));

    // MODE SELECT
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        currentMode = card.dataset.mode;
      });
    });
    document.getElementById('btn-start-mode').addEventListener('click', () => {
      showScreen('menu');
      setTimeout(() => launchCountdown(currentMode), 200);
    });

    // LEADERBOARD TABS
    document.querySelectorAll('.lb-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderLeaderboard(tab.dataset.mode);
      });
    });

    // HUD
    document.getElementById('hud-back').addEventListener('click', () => {
      Game.stop();
      showScreen('menu');
    });
    document.getElementById('hud-pause').addEventListener('click', () => Game.togglePause());
    document.getElementById('btn-resume').addEventListener('click', () => Game.togglePause());
    document.getElementById('btn-quit-pause').addEventListener('click', () => {
      Game.stop();
      document.getElementById('pause-overlay').classList.add('hidden');
      showScreen('menu');
    });

    // GAME OVER
    document.getElementById('btn-go-retry').addEventListener('click', () => launchCountdown(currentMode));
    document.getElementById('btn-go-menu').addEventListener('click', () => showScreen('menu'));
    document.getElementById('btn-go-shop').addEventListener('click', () => {
      Shop.render();
      showScreen('shop');
    });

    // ADMIN LOGIN
    document.getElementById('btn-admin-login').addEventListener('click', async () => {
      const pwd = document.getElementById('admin-pwd').value;
      const ok  = await Admin.tryLogin(pwd);
      if (ok) {
        showScreen('admin');
        Admin.renderTab('dashboard');
        document.getElementById('admin-pwd').value = '';
        document.getElementById('login-error').classList.add('hidden');
      } else {
        document.getElementById('login-error').classList.remove('hidden');
        document.getElementById('admin-pwd').value = '';
      }
    });
    document.getElementById('admin-pwd').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-admin-login').click();
    });
    document.getElementById('btn-admin-cancel').addEventListener('click', () => showScreen('menu'));

    document.getElementById('admin-logout').addEventListener('click', () => {
      Admin.logout();
      showScreen('menu');
    });

    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.addEventListener('click', () => Admin.renderTab(tab.dataset.tab));
    });

    // KONAMI CODE → admin login
    const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let konamiIdx = 0;
    document.addEventListener('keydown', e => {
      if (e.key === KONAMI[konamiIdx]) {
        konamiIdx++;
        if (konamiIdx === KONAMI.length) {
          konamiIdx = 0;
          showScreen('admin-login');
        }
      } else {
        konamiIdx = 0;
      }
    });

    // Resize
    window.addEventListener('resize', () => Game.resize?.());
  }

  // ---- Countdown ----
  function launchCountdown(mode) {
    showScreen('game');
    const overlay = document.getElementById('countdown-overlay');
    const numEl   = document.getElementById('countdown-num');
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

  // ---- Leaderboard ----
  function initLeaderboard() {
    document.querySelectorAll('.lb-tab').forEach(tab => {
      tab.addEventListener('click', () => renderLeaderboard(tab.dataset.mode));
    });
  }

  function renderLeaderboard(mode) {
    const scores = Storage.getTopScores(mode, 10);
    const list   = document.getElementById('lb-list');
    if (!scores.length) {
      list.innerHTML = '<div class="lb-empty">Aucun score pour ce mode</div>';
      return;
    }
    const medals = ['🥇','🥈','🥉'];
    list.innerHTML = scores.map((s, i) => `
      <div class="lb-entry">
        <span class="lb-rank ${i < 3 ? 'top'+(i+1) : ''}">${medals[i] || '#'+(i+1)}</span>
        <span class="lb-name">Score ${i+1}</span>
        <span class="lb-score">${s.score}</span>
        <span style="font-size:.7rem;color:var(--text-dim);margin-left:8px">niv.${s.level}</span>
        <span style="font-size:.65rem;color:var(--text-muted);margin-left:auto">${s.date||''}</span>
      </div>
    `).join('');
  }

  return { showScreen, init };
})();

// ---- Start ----
document.addEventListener('DOMContentLoaded', () => App.init());
