/* ===========================
   SNAKE RELOADED — game.js
=========================== */

// ---- CONFIG ----
const GRID = 20;         // nb de cases
const CELL = 400 / GRID; // pixels par case (canvas 400px)

const SKINS = {
  classic: { head: '#00ff88', body: '#00cc66', food: '#ff4466', glow: 'rgba(0,255,136,' },
  neon:    { head: '#ff00ff', body: '#aa00ff', food: '#ffff00', glow: 'rgba(255,0,255,' },
  fire:    { head: '#ff8800', body: '#ff3300', food: '#ffee00', glow: 'rgba(255,136,0,' },
  ice:     { head: '#00eeff', body: '#0088ff', food: '#ffffff', glow: 'rgba(0,238,255,' },
};

const DIR = { UP:[0,-1], DOWN:[0,1], LEFT:[-1,0], RIGHT:[1,0] };

// ---- STATE ----
let state = {
  snake: [],
  food: null,
  dir: DIR.RIGHT,
  nextDir: DIR.RIGHT,
  score: 0,
  level: 1,
  applesEaten: 0,
  speed: 80,
  skin: 'classic',
  running: false,
  paused: false,
  gameLoop: null,
  lastTime: 0,
  accumulator: 0,
  particles: [],
  flashTimer: 0,
};

let bestScore = parseInt(localStorage.getItem('snake_best') || '0', 10);

// ---- DOM ----
const screens = {
  menu:     document.getElementById('screen-menu'),
  game:     document.getElementById('screen-game'),
  gameover: document.getElementById('screen-gameover'),
};
const canvas  = document.getElementById('game-canvas');
const ctx     = canvas.getContext('2d');

const elScore      = document.getElementById('score-value');
const elBest       = document.getElementById('best-score-value');
const elLevel      = document.getElementById('level-value');
const elBestMenu   = document.getElementById('best-score-menu');
const elFinalScore = document.getElementById('final-score');
const elFinalBest  = document.getElementById('final-best');
const elFinalLevel = document.getElementById('final-level');
const elFinalApples= document.getElementById('final-apples');
const elRecord     = document.getElementById('new-record-badge');
const elPauseOverlay = document.getElementById('pause-overlay');

// ---- SCREEN MANAGER ----
function showScreen(name) {
  Object.entries(screens).forEach(([k, el]) => {
    el.classList.toggle('active', k === name);
  });
}

// ---- HELPERS ----
function rndInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function spawnFood() {
  const occupied = new Set(state.snake.map(s => `${s[0]},${s[1]}`));
  let pos;
  do { pos = [rndInt(0, GRID-1), rndInt(0, GRID-1)]; }
  while (occupied.has(`${pos[0]},${pos[1]}`));
  state.food = pos;
}

function resetGame() {
  const cx = Math.floor(GRID / 2);
  state.snake = [[cx, cx], [cx-1, cx], [cx-2, cx]];
  state.dir      = DIR.RIGHT;
  state.nextDir  = DIR.RIGHT;
  state.score    = 0;
  state.level    = 1;
  state.applesEaten = 0;
  state.running  = true;
  state.paused   = false;
  state.particles = [];
  state.flashTimer = 0;
  spawnFood();
  updateHUD();
}

function updateHUD() {
  elScore.textContent = state.score;
  elBest.textContent  = bestScore;
  elLevel.textContent = state.level;
}

// ---- PARTICLES ----
function spawnParticles(x, y, color) {
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
    const speed = 1.5 + Math.random() * 2.5;
    state.particles.push({
      x: x * CELL + CELL / 2,
      y: y * CELL + CELL / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.04 + Math.random() * 0.04,
      radius: 2 + Math.random() * 3,
      color,
    });
  }
}

function updateParticles() {
  state.particles = state.particles.filter(p => p.life > 0);
  state.particles.forEach(p => {
    p.x    += p.vx;
    p.y    += p.vy;
    p.vx   *= 0.92;
    p.vy   *= 0.92;
    p.life -= p.decay;
  });
}

function drawParticles() {
  state.particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ---- DRAW ----
function draw() {
  const skin = SKINS[state.skin];
  const W = canvas.width;
  const H = canvas.height;

  // Fond
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, W, H);

  // Grille subtile
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= GRID; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL); ctx.stroke();
  }

  // Flash sur mort
  if (state.flashTimer > 0) {
    ctx.fillStyle = `rgba(255,68,102,${state.flashTimer * 0.3})`;
    ctx.fillRect(0, 0, W, H);
    state.flashTimer -= 0.05;
  }

  // Nourriture
  if (state.food) {
    const [fx, fy] = state.food;
    const cx2 = fx * CELL + CELL / 2;
    const cy2 = fy * CELL + CELL / 2;
    const r   = CELL / 2 - 3;
    // Halo pulsant
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
    const grad = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r * 2.5);
    grad.addColorStop(0, skin.food);
    grad.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.25 * pulse;
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx2, cy2, r * 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Corps
    ctx.fillStyle = skin.food;
    ctx.shadowColor = skin.food;
    ctx.shadowBlur  = 12;
    ctx.beginPath(); ctx.arc(cx2, cy2, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Serpent
  state.snake.forEach(([sx, sy], i) => {
    const isHead = i === 0;
    const ratio  = 1 - i / state.snake.length * 0.4;
    const color  = isHead ? skin.head : skin.body;
    const pad    = isHead ? 1 : 2;
    const cr     = isHead ? 5 : 4; // corner radius

    ctx.fillStyle   = color;
    ctx.shadowColor = color;
    ctx.shadowBlur  = isHead ? 16 : 6;
    ctx.globalAlpha = ratio;
    roundRect(ctx, sx * CELL + pad, sy * CELL + pad, CELL - pad*2, CELL - pad*2, cr);
    ctx.fill();

    // Yeux sur la tête
    if (isHead) {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0a0a0f';
      const [dx, dy] = state.dir;
      const ex = sx * CELL + CELL/2 + dx * 5;
      const ey = sy * CELL + CELL/2 + dy * 5;
      // 2 yeux perpendiculaires
      const px = dy !== 0 ? 4 : 0;
      const py = dx !== 0 ? 4 : 0;
      ctx.beginPath(); ctx.arc(ex + py, ey + px, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex - py, ey - px, 2.5, 0, Math.PI*2); ctx.fill();
    }
  });

  ctx.globalAlpha = 1;
  ctx.shadowBlur  = 0;

  // Particules
  drawParticles();
}

// Utilitaire roundRect (compatible tous navigateurs)
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ---- GAME LOGIC ----
function step() {
  if (!state.running || state.paused) return;

  state.dir = state.nextDir;
  const [hx, hy] = state.snake[0];
  const [dx, dy] = state.dir;
  const nx = hx + dx;
  const ny = hy + dy;

  // Collision mur
  if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) { triggerGameOver(); return; }
  // Collision corps
  if (state.snake.some(([sx, sy]) => sx === nx && sy === ny)) { triggerGameOver(); return; }

  state.snake.unshift([nx, ny]);

  // Mange la nourriture
  if (state.food && nx === state.food[0] && ny === state.food[1]) {
    state.score      += 10 * state.level;
    state.applesEaten++;

    spawnParticles(nx, ny, SKINS[state.skin].food);
    spawnFood();

    // Montée de niveau tous les 5 pommes
    if (state.applesEaten % 5 === 0) {
      state.level++;
      state.speed = Math.max(state.speed - 6, 50);
    }

    if (state.score > bestScore) {
      bestScore = state.score;
      localStorage.setItem('snake_best', bestScore);
    }
    updateHUD();
  } else {
    state.snake.pop();
  }
}

let lastStepTime = 0;
function gameLoop(timestamp) {
  if (!state.running) return;

  const delta = timestamp - lastStepTime;
  if (delta >= state.speed) {
    step();
    lastStepTime = timestamp;
  }

  if (state.running) {
    updateParticles();
    draw();
    requestAnimationFrame(gameLoop);
  }
}

function startLoop() {
  lastStepTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function triggerGameOver() {
  state.running  = false;
  state.flashTimer = 1;
  draw(); // flash final

  setTimeout(() => {
    elFinalScore.textContent  = state.score;
    elFinalBest.textContent   = bestScore;
    elFinalLevel.textContent  = state.level;
    elFinalApples.textContent = state.applesEaten;
    elBestMenu.textContent    = bestScore;

    elRecord.classList.toggle('hidden', state.score < bestScore || state.score === 0);
    showScreen('gameover');
  }, 500);
}

function pauseGame() {
  state.paused = !state.paused;
  document.getElementById('btn-pause').textContent = state.paused ? '▶' : '⏸';
  elPauseOverlay.classList.toggle('hidden', !state.paused);
  if (!state.paused) {
    lastStepTime = performance.now();
    requestAnimationFrame(gameLoop);
  }
}

// ---- CONTROLS ----
document.addEventListener('keydown', e => {
  if (!state.running) return;
  const [dx, dy] = state.dir;
  switch (e.key) {
    case 'ArrowUp':    case 'z': case 'Z': if (dy !== 1)  state.nextDir = DIR.UP;    e.preventDefault(); break;
    case 'ArrowDown':  case 's': case 'S': if (dy !== -1) state.nextDir = DIR.DOWN;  e.preventDefault(); break;
    case 'ArrowLeft':  case 'q': case 'Q': if (dx !== 1)  state.nextDir = DIR.LEFT;  e.preventDefault(); break;
    case 'ArrowRight': case 'd': case 'D': if (dx !== -1) state.nextDir = DIR.RIGHT; e.preventDefault(); break;
    case ' ': case 'Escape': pauseGame(); e.preventDefault(); break;
  }
});

// Boutons mobile
function addCtrl(id, dir, opposite) {
  document.getElementById(id).addEventListener('click', () => {
    const [dx, dy] = state.dir;
    const [nx, ny] = dir;
    if (dx !== -nx || dy !== -ny) state.nextDir = dir;
  });
}
addCtrl('ctrl-up',    DIR.UP,    DIR.DOWN);
addCtrl('ctrl-down',  DIR.DOWN,  DIR.UP);
addCtrl('ctrl-left',  DIR.LEFT,  DIR.RIGHT);
addCtrl('ctrl-right', DIR.RIGHT, DIR.LEFT);

// Swipe tactile sur le canvas
let touchStart = null;
canvas.addEventListener('touchstart', e => {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
canvas.addEventListener('touchend', e => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 20 && state.dir !== DIR.LEFT)  state.nextDir = DIR.RIGHT;
    if (dx < -20 && state.dir !== DIR.RIGHT) state.nextDir = DIR.LEFT;
  } else {
    if (dy > 20 && state.dir !== DIR.UP)    state.nextDir = DIR.DOWN;
    if (dy < -20 && state.dir !== DIR.DOWN)  state.nextDir = DIR.UP;
  }
  touchStart = null;
}, { passive: true });

// ---- MENU BUTTONS ----
// Skins
document.querySelectorAll('.skin-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.skin-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.skin = btn.dataset.skin;
  });
});

// Difficulté
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.speed = parseInt(btn.dataset.speed);
  });
});

// Jouer
document.getElementById('btn-play').addEventListener('click', () => {
  showScreen('game');
  resetGame();
  startLoop();
});

// Retour menu
document.getElementById('btn-back').addEventListener('click', () => {
  state.running = false;
  elBestMenu.textContent = bestScore;
  showScreen('menu');
});

// Pause
document.getElementById('btn-pause').addEventListener('click', pauseGame);
document.getElementById('btn-resume').addEventListener('click', pauseGame);
document.getElementById('btn-menu-from-pause').addEventListener('click', () => {
  state.running = false;
  elBestMenu.textContent = bestScore;
  elPauseOverlay.classList.add('hidden');
  showScreen('menu');
});

// Game Over
document.getElementById('btn-retry').addEventListener('click', () => {
  showScreen('game');
  resetGame();
  startLoop();
});
document.getElementById('btn-menu-from-go').addEventListener('click', () => {
  elBestMenu.textContent = bestScore;
  showScreen('menu');
});

// ---- INIT ----
elBestMenu.textContent = bestScore;
showScreen('menu');
draw();
