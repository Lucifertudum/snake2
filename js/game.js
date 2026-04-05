/* =============================================
   game.js — Moteur de jeu complet
   Modes: classic, smooth, portal, blitz, maze, zen
============================================= */

const Game = (() => {
  // ---- Canvas & Context ----
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');

  // ---- Config ----
  const GRID   = 20;
  let   CELL   = 24;   // recalculé selon canvas
  let   W = 480, H = 480;

  const DIRS = {
    UP:    { x: 0, y:-1 },
    DOWN:  { x: 0, y: 1 },
    LEFT:  { x:-1, y: 0 },
    RIGHT: { x: 1, y: 0 },
  };

  // ---- State ----
  let mode       = 'classic';
  let running    = false;
  let paused     = false;
  let skin       = null;
  let gameConfig = null;

  // Classic / portal / maze / blitz / zen
  let snake      = [];
  let dir        = DIRS.RIGHT;
  let nextDir    = DIRS.RIGHT;
  let foods      = [];
  let obstacles  = [];
  let score      = 0;
  let level      = 1;
  let applesEaten= 0;
  let gameStartTime = 0;
  let coinsEarned= 0;
  let speed      = 80;
  let lastStep   = 0;
  let blitzTimer = 60;
  let blitzInterval = null;

  // Smooth mode state
  let smoothSnake = [];   // [{x, y}] continual positions
  let smoothDir   = { x: 1, y: 0 };
  let smoothNextDir = { x: 1, y: 0 };
  let smoothSpeed = 2.5;  // pixels per frame
  let smoothFood  = null;
  let smoothSize  = 12;   // radius
  let smoothObstacles = [];

  // Particles
  let particles = [];

  // ---- Resize ----
  function resize() {
    const wrap = document.getElementById('canvas-wrap');
    W = wrap.clientWidth || 480;
    H = wrap.clientHeight || 480;
    canvas.width  = W;
    canvas.height = H;
    CELL = Math.floor(W / GRID);
    smoothSize = CELL * 0.45;
    smoothSpeed = mode === 'smooth' ? (CELL * 0.1) : 2.5;
  }

  // ---- Init ----
  function init(selectedMode) {
    resize();
    mode       = selectedMode;
    running    = true;
    paused     = false;
    score      = 0;
    level      = 1;
    applesEaten= 0;
    coinsEarned= 0;
    particles  = [];
    foods      = [];
    obstacles  = [];
    skin       = getSkin(Accounts.getEquippedSkin());
    gameConfig = Accounts.getConfig();
    speed      = gameConfig.speedBase || 80;

    document.getElementById('hud-mode-badge').textContent = mode.toUpperCase();
    document.getElementById('hud-best').textContent = Accounts.getBest(mode);
    document.getElementById('hud-timer-box').style.display = mode === 'blitz' ? 'flex' : 'none';
    document.getElementById('hud-level-box').style.display = mode === 'blitz' ? 'none' : 'flex';

    if (mode === 'smooth') {
      initSmooth();
    } else {
      initGrid();
    }

    if (mode === 'blitz') startBlitz();

    updateHUD();
    lastStep = performance.now();
    gameStartTime = performance.now();
    requestAnimationFrame(loop);
  }

  // ---- GRID MODES ----
  function initGrid() {
    const cx = Math.floor(GRID / 2);
    snake    = [{ x: cx, y: cx }, { x: cx-1, y: cx }, { x: cx-2, y: cx }];
    dir      = DIRS.RIGHT;
    nextDir  = DIRS.RIGHT;
    foods    = [];

    if (mode === 'maze') generateObstacles();
    spawnFood();
    if (mode === 'blitz') spawnFood(); // double food in blitz
  }

  function generateObstacles() {
    obstacles = [];
    const count = gameConfig.mazeObstacles || 12;
    const snakeSet = new Set(snake.map(s => `${s.x},${s.y}`));
    let tries = 0;
    while (obstacles.length < count && tries < 500) {
      const ox = 1 + Math.floor(Math.random() * (GRID-2));
      const oy = 1 + Math.floor(Math.random() * (GRID-2));
      const key = `${ox},${oy}`;
      if (!snakeSet.has(key) && !obstacles.some(o => o.x===ox && o.y===oy)) {
        obstacles.push({ x: ox, y: oy });
      }
      tries++;
    }
  }

  function spawnFood() {
    const occupied = new Set([
      ...snake.map(s => `${s.x},${s.y}`),
      ...obstacles.map(o => `${o.x},${o.y}`),
      ...foods.map(f => `${f.x},${f.y}`),
    ]);
    let pos, tries = 0;
    do {
      pos = { x: Math.floor(Math.random()*GRID), y: Math.floor(Math.random()*GRID) };
      tries++;
    } while (occupied.has(`${pos.x},${pos.y}`) && tries < 300);
    const isBonus = Math.random() < 0.15; // 15% chance pomme bonus
    foods.push({ ...pos, bonus: isBonus, pulse: 0, spawnTime: Date.now() });
  }

  function stepGrid() {
    dir = nextDir;
    const head = snake[0];
    let nx = head.x + dir.x;
    let ny = head.y + dir.y;

    // Portails
    if (mode === 'portal') {
      if (nx < 0) nx = GRID-1;
      else if (nx >= GRID) nx = 0;
      if (ny < 0) ny = GRID-1;
      else if (ny >= GRID) ny = 0;
    } else {
      // Mur
      if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) {
        if (mode === 'zen') { nx = Math.max(0, Math.min(GRID-1, nx)); ny = Math.max(0, Math.min(GRID-1, ny)); }
        else { triggerDeath(); return; }
      }
    }

    // Collision corps (pas zen)
    if (mode !== 'zen' && snake.some(s => s.x===nx && s.y===ny)) {
      triggerDeath(); return;
    }

    // Obstacles
    if (obstacles.some(o => o.x===nx && o.y===ny)) {
      triggerDeath(); return;
    }

    snake.unshift({ x: nx, y: ny });

    // Mange nourriture
    const fi = foods.findIndex(f => f.x===nx && f.y===ny);
    if (fi !== -1) {
      const food = foods[fi];
      const pts = food.bonus ? 50 * level : 10 * level;
      score += pts;
      applesEaten++;
      const c = gameConfig.coinsPerApple * (gameConfig.doubleCoinEvent ? 2 : 1) * (food.bonus ? 3 : 1);
      coinsEarned += c;
      Accounts.addCoins(c);
      spawnParticles(nx * CELL + CELL/2, ny * CELL + CELL/2, skin.particle, food.bonus ? 20 : 12);
      showScorePopup(pts, nx, ny, food.bonus);
      foods.splice(fi, 1);
      spawnFood();
      if (applesEaten % 5 === 0 && mode !== 'zen') {
        level++;
        speed = Math.max(speed - 7, 30);
        score += gameConfig.coinsPerLevel * 10;
      }
      if (score > Accounts.getBest(mode)) Accounts.getBest(mode, score, level);
      updateHUD();
    } else {
      snake.pop();
    }
  }

  // ---- SMOOTH MODE ----
  function initSmooth() {
    const cx = W / 2, cy = H / 2;
    smoothSnake = [];
    for (let i = 0; i < 60; i++) smoothSnake.push({ x: cx - i * 4, y: cy });
    smoothDir      = { x: 1, y: 0 };
    smoothNextDir  = { x: 1, y: 0 };
    smoothFood     = spawnSmoothFood();
    smoothObstacles = [];
  }

  function spawnSmoothFood() {
    return {
      x: smoothSize + Math.random() * (W - smoothSize * 2),
      y: smoothSize + Math.random() * (H - smoothSize * 2),
      bonus: Math.random() < 0.15,
      pulse: 0,
    };
  }

  function stepSmooth() {
    smoothDir = smoothNextDir;
    const spd = smoothSpeed * (1 + level * 0.05);
    const head = smoothSnake[0];
    const nx = head.x + smoothDir.x * spd;
    const ny = head.y + smoothDir.y * spd;

    // Mur collision
    if (nx < smoothSize || ny < smoothSize || nx > W-smoothSize || ny > H-smoothSize) {
      triggerDeath(); return;
    }

    // Self collision (check against body after a safe offset)
    const bodyStart = Math.floor(smoothSize * 3 / spd);
    for (let i = bodyStart; i < smoothSnake.length - bodyStart; i++) {
      const dx = nx - smoothSnake[i].x;
      const dy = ny - smoothSnake[i].y;
      if (Math.sqrt(dx*dx + dy*dy) < smoothSize * 1.5) {
        triggerDeath(); return;
      }
    }

    smoothSnake.unshift({ x: nx, y: ny });

    // Eat food
    if (smoothFood) {
      const dx = nx - smoothFood.x;
      const dy = ny - smoothFood.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < smoothSize + smoothSize) {
        const pts = smoothFood.bonus ? 50 * level : 10 * level;
        score += pts;
        applesEaten++;
        const c = gameConfig.coinsPerApple * (gameConfig.doubleCoinEvent ? 2 : 1) * (smoothFood.bonus ? 3 : 1);
        coinsEarned += c;
        Accounts.addCoins(c);
        spawnParticles(smoothFood.x, smoothFood.y, skin.particle, 16);
        showScorePopupXY(pts, smoothFood.x, smoothFood.y, smoothFood.bonus);
        smoothFood = spawnSmoothFood();
        // Grow snake by adding tail copies
        const tail = smoothSnake[smoothSnake.length - 1];
        for (let i = 0; i < 20; i++) smoothSnake.push({ ...tail });
        if (applesEaten % 5 === 0) { level++; }
        if (score > Accounts.getBest(mode)) Accounts.getBest(mode, score, level);
        updateHUD();
      } else {
        // Shrink tail (maintain length proportional to apples)
        const targetLen = 60 + applesEaten * 20;
        while (smoothSnake.length > targetLen) smoothSnake.pop();
      }
    }
  }

  // ---- BLITZ ----
  function startBlitz() {
    blitzTimer = 60;
    document.getElementById('hud-timer').textContent = blitzTimer;
    blitzInterval = setInterval(() => {
      if (paused || !running) return;
      blitzTimer--;
      document.getElementById('hud-timer').textContent = blitzTimer;
      if (blitzTimer <= 10) document.getElementById('hud-timer').style.color = 'var(--danger)';
      if (blitzTimer <= 0) { clearInterval(blitzInterval); triggerDeath(); }
    }, 1000);
  }

  // ---- DRAW ----
  function draw(timestamp) {
    ctx.clearRect(0, 0, W, H);

    // Fond grille
    ctx.fillStyle = '#07071a';
    ctx.fillRect(0, 0, W, H);

    if (mode === 'smooth') {
      drawSmooth(timestamp);
    } else {
      drawGrid(timestamp);
    }

    drawParticles();
  }

  function drawGrid(timestamp) {
    // Grille
    ctx.strokeStyle = 'rgba(255,255,255,0.018)';
    ctx.lineWidth = .5;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i*CELL, 0); ctx.lineTo(i*CELL, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i*CELL); ctx.lineTo(W, i*CELL); ctx.stroke();
    }

    // Obstacles
    obstacles.forEach(o => {
      ctx.fillStyle = '#252550';
      ctx.shadowColor = '#4444aa';
      ctx.shadowBlur = 4;
      roundRectFill(ctx, o.x*CELL+1, o.y*CELL+1, CELL-2, CELL-2, 4);
      ctx.shadowBlur = 0;
    });

    // Nourritures
    foods.forEach(f => {
      f.pulse = (f.pulse || 0) + 0.05;
      const pScale = 1 + Math.sin(f.pulse) * 0.12;
      const cx2 = f.x*CELL + CELL/2;
      const cy2 = f.y*CELL + CELL/2;
      const r = (CELL/2 - 3) * pScale;

      // Halo
      const grad = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r * 2.5);
      grad.addColorStop(0, skin.food + (f.bonus ? '' : ''));
      grad.addColorStop(1, 'transparent');
      ctx.globalAlpha = .2 + .1 * Math.sin(f.pulse);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx2, cy2, r * 2.2, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = f.bonus ? '#fbbf24' : skin.food;
      ctx.shadowColor = f.bonus ? '#fbbf24' : skin.food;
      ctx.shadowBlur = f.bonus ? 20 : 12;
      ctx.beginPath();
      ctx.arc(cx2, cy2, r, 0, Math.PI * 2);
      ctx.fill();
      if (f.bonus) {
        ctx.fillStyle = 'rgba(0,0,0,.6)';
        ctx.font = `bold ${CELL * .4}px Orbitron`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        ctx.fillText('✦', cx2, cy2);
      }
      ctx.shadowBlur = 0;
    });

    // Serpent
    snake.forEach((seg, i) => {
      const isHead = i === 0;
      const alpha = Math.max(0.3, 1 - i / (snake.length * 1.2));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = isHead ? skin.head : (skin.body[Math.min(i % skin.body.length, skin.body.length-1)] || skin.head);
      ctx.shadowColor = skin.head;
      ctx.shadowBlur  = isHead ? 20 : 8;

      const pad = isHead ? 1 : 2;
      roundRectFill(ctx, seg.x*CELL+pad, seg.y*CELL+pad, CELL-pad*2, CELL-pad*2, isHead ? 6 : 4);
      ctx.fill();

      if (isHead) {
        // Yeux
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.fillStyle = skin.eyeColor || '#0a0a0f';
        const ex = seg.x*CELL + CELL/2 + dir.x * CELL*0.22;
        const ey = seg.y*CELL + CELL/2 + dir.y * CELL*0.22;
        const px = dir.y !== 0 ? CELL * 0.15 : 0;
        const py = dir.x !== 0 ? CELL * 0.15 : 0;
        ctx.beginPath(); ctx.arc(ex+px, ey+py, CELL*0.1, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex-px, ey-py, CELL*0.1, 0, Math.PI*2); ctx.fill();
        // Reflet yeux
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        ctx.beginPath(); ctx.arc(ex+px+1, ey+py-1, CELL*0.04, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex-px+1, ey-py-1, CELL*0.04, 0, Math.PI*2); ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function drawSmooth(timestamp) {
    if (!smoothFood) return;

    // Nourriture smooth
    smoothFood.pulse = (smoothFood.pulse || 0) + 0.06;
    const pScale = 1 + Math.sin(smoothFood.pulse) * 0.15;
    const fr = smoothSize * pScale;
    const fColor = smoothFood.bonus ? '#fbbf24' : skin.food;

    const grad = ctx.createRadialGradient(smoothFood.x, smoothFood.y, 0, smoothFood.x, smoothFood.y, fr * 2.5);
    grad.addColorStop(0, fColor);
    grad.addColorStop(1, 'transparent');
    ctx.globalAlpha = .2;
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(smoothFood.x, smoothFood.y, fr * 2.2, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = fColor;
    ctx.shadowColor = fColor;
    ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(smoothFood.x, smoothFood.y, fr, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Corps smooth (ribbon style)
    if (smoothSnake.length < 2) return;
    const segCount = smoothSnake.length;

    for (let i = segCount - 1; i >= 0; i--) {
      const t = i / segCount;
      const alpha = Math.max(0.1, (1 - t) * 0.9 + 0.1);
      const r = smoothSize * (1 - t * 0.5);
      const col = i === 0 ? skin.head : (skin.body[Math.min(Math.floor(t * skin.body.length), skin.body.length-1)] || skin.body[skin.body.length-1]);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = col;
      ctx.shadowColor = skin.head;
      ctx.shadowBlur = i < 3 ? 20 : 0;
      ctx.beginPath();
      ctx.arc(smoothSnake[i].x, smoothSnake[i].y, Math.max(r, 3), 0, Math.PI*2);
      ctx.fill();
    }

    // Tête avec yeux
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = skin.eyeColor || '#0a0a0f';
    const hx = smoothSnake[0].x;
    const hy = smoothSnake[0].y;
    const ex = hx + smoothDir.x * smoothSize * 0.35;
    const ey = hy + smoothDir.y * smoothSize * 0.35;
    const px = smoothDir.y !== 0 ? smoothSize * 0.3 : 0;
    const py = smoothDir.x !== 0 ? smoothSize * 0.3 : 0;
    const er = smoothSize * 0.18;
    ctx.beginPath(); ctx.arc(ex+px, ey+py, er, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex-px, ey-py, er, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.arc(ex+px+er*.3, ey+py-er*.3, er*.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex-px+er*.3, ey-py-er*.3, er*.3, 0, Math.PI*2); ctx.fill();
  }

  // ---- PARTICLES ----
  function spawnParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI*2 * i/count) + Math.random() * .5;
      const spd   = 1.5 + Math.random() * 3;
      particles.push({
        x, y,
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life: 1, decay: .03 + Math.random() * .04,
        radius: 2 + Math.random() * 4, color,
      });
    }
  }

  function drawParticles() {
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle   = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill();
      p.x += p.vx; p.y += p.vy;
      p.vx *= .93; p.vy *= .93;
      p.life -= p.decay;
    });
    ctx.globalAlpha = 1;
  }

  // ---- SCORE POPUP ----
  function showScorePopup(pts, gx, gy, bonus) {
    showScorePopupXY(pts, gx * CELL + CELL/2, gy * CELL + CELL/2, bonus);
  }
  function showScorePopupXY(pts, px, py, bonus) {
    const el = document.getElementById('score-popup');
    el.textContent = (bonus ? '★ ' : '+') + pts;
    el.style.left  = px + 'px';
    el.style.top   = py + 'px';
    el.style.color = bonus ? 'var(--gold)' : 'var(--accent)';
    el.style.fontSize = bonus ? '1.3rem' : '1rem';
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = 'scoreFloat .8s ease forwards';
    // inject keyframe once
    if (!document.getElementById('score-kf')) {
      const s = document.createElement('style');
      s.id = 'score-kf';
      s.textContent = `@keyframes scoreFloat{0%{opacity:1;transform:translate(-50%,-50%)}100%{opacity:0;transform:translate(-50%,-200%)}}`;
      document.head.appendChild(s);
    }
  }

  // ---- HUD ----
  function updateHUD() {
    document.getElementById('hud-score').textContent  = score;
    document.getElementById('hud-best').textContent   = Math.max(score, Accounts.getBest(mode));
    document.getElementById('hud-coins').textContent  = Accounts.getCoins();
    document.getElementById('hud-level').textContent  = level;
  }

  // ---- DEATH ----
  function triggerDeath() {
    running = false;
    if (blitzInterval) { clearInterval(blitzInterval); blitzInterval = null; }

    // Flash rouge
    ctx.fillStyle = 'rgba(239,68,68,.3)';
    ctx.fillRect(0, 0, W, H);

    const gameEndTime = performance.now();
    const durationSec = Math.round((gameEndTime - (gameStartTime || gameEndTime)) / 1000);
    const result = Accounts.saveGameResult(mode, score, level, applesEaten, coinsEarned, durationSec);
    const isNew = result.isNewRecord;
    updateMenuCoins();

    setTimeout(() => {
      document.getElementById('go-score').textContent = score;
      document.getElementById('go-best').textContent  = Accounts.getBest(mode);
      document.getElementById('go-level').textContent = level;
      document.getElementById('go-coins-earned').textContent = '+' + coinsEarned;
      document.getElementById('go-coins-total').textContent  = Accounts.getCoins();
      document.getElementById('go-new-record').classList.toggle('hidden', !isNew);
      document.getElementById('go-title').textContent = mode === 'blitz' ? 'TEMPS ÉCOULÉ !' : 'GAME OVER';
      App.showScreen('gameover');
      // Show new badges
      if (result.newBadges && result.newBadges.length > 0) {
        setTimeout(() => App.showBadgeToast(result.newBadges), 800);
      }
    }, 600);
  }

  // ---- LOOP ----
  let rafId = null;
  function loop(timestamp) {
    if (!running) return;
    if (!paused) {
      if (mode === 'smooth') {
        stepSmooth();
      } else {
        if (timestamp - lastStep >= speed) {
          stepGrid();
          lastStep = timestamp;
        }
      }
      draw(timestamp);
    }
    rafId = requestAnimationFrame(loop);
  }

  // ---- CONTROLS ----
  const oppositeDirs = { UP:'DOWN', DOWN:'UP', LEFT:'RIGHT', RIGHT:'LEFT' };

  function setDirGrid(d) {
    const opposite = oppositeDirs[Object.keys(DIRS).find(k => DIRS[k] === dir)];
    const name = Object.keys(DIRS).find(k => DIRS[k] === d);
    if (name !== opposite) nextDir = d;
  }

  function setDirSmooth(dx, dy) {
    // no 180
    if (dx !== 0 && smoothDir.x !== 0) return;
    if (dy !== 0 && smoothDir.y !== 0) return;
    smoothNextDir = { x: dx, y: dy };
  }

  function handleKey(e) {
    if (!running) return;
    if (e.key === ' ' || e.key === 'Escape') { togglePause(); e.preventDefault(); return; }
    if (mode === 'smooth') {
      switch(e.key) {
        case 'ArrowUp':   case 'z': case 'Z': setDirSmooth(0,-1); e.preventDefault(); break;
        case 'ArrowDown': case 's': case 'S': setDirSmooth(0, 1); e.preventDefault(); break;
        case 'ArrowLeft': case 'q': case 'Q': setDirSmooth(-1,0); e.preventDefault(); break;
        case 'ArrowRight':case 'd': case 'D': setDirSmooth( 1,0); e.preventDefault(); break;
      }
    } else {
      switch(e.key) {
        case 'ArrowUp':   case 'z': case 'Z': setDirGrid(DIRS.UP);    e.preventDefault(); break;
        case 'ArrowDown': case 's': case 'S': setDirGrid(DIRS.DOWN);  e.preventDefault(); break;
        case 'ArrowLeft': case 'q': case 'Q': setDirGrid(DIRS.LEFT);  e.preventDefault(); break;
        case 'ArrowRight':case 'd': case 'D': setDirGrid(DIRS.RIGHT); e.preventDefault(); break;
      }
    }
  }

  document.addEventListener('keydown', handleKey);

  // D-pad
  function bindDpad() {
    const map = {
      'ctrl-up':    () => mode==='smooth' ? setDirSmooth(0,-1) : setDirGrid(DIRS.UP),
      'ctrl-down':  () => mode==='smooth' ? setDirSmooth(0, 1) : setDirGrid(DIRS.DOWN),
      'ctrl-left':  () => mode==='smooth' ? setDirSmooth(-1,0) : setDirGrid(DIRS.LEFT),
      'ctrl-right': () => mode==='smooth' ? setDirSmooth( 1,0) : setDirGrid(DIRS.RIGHT),
      'd-up':    () => mode==='smooth' ? setDirSmooth(0,-1) : setDirGrid(DIRS.UP),
      'd-down':  () => mode==='smooth' ? setDirSmooth(0, 1) : setDirGrid(DIRS.DOWN),
      'd-left':  () => mode==='smooth' ? setDirSmooth(-1,0) : setDirGrid(DIRS.LEFT),
      'd-right': () => mode==='smooth' ? setDirSmooth( 1,0) : setDirGrid(DIRS.RIGHT),
    };
    Object.entries(map).forEach(([id, fn]) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    });
  }
  bindDpad();

  // Swipe
  let touchStart = null;
  canvas.addEventListener('touchstart', e => {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  canvas.addEventListener('touchend', e => {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20)  mode==='smooth' ? setDirSmooth( 1, 0) : setDirGrid(DIRS.RIGHT);
      if (dx < -20) mode==='smooth' ? setDirSmooth(-1, 0) : setDirGrid(DIRS.LEFT);
    } else {
      if (dy > 20)  mode==='smooth' ? setDirSmooth(0, 1) : setDirGrid(DIRS.DOWN);
      if (dy < -20) mode==='smooth' ? setDirSmooth(0,-1) : setDirGrid(DIRS.UP);
    }
    touchStart = null;
  }, { passive: true });

  // ---- PAUSE ----
  function togglePause() {
    paused = !paused;
    document.getElementById('hud-pause').textContent = paused ? '▶' : '⏸';
    document.getElementById('pause-overlay').classList.toggle('hidden', !paused);
    if (!paused) { lastStep = performance.now(); requestAnimationFrame(loop); }
  }

  function stop() {
    running = false;
    if (blitzInterval) { clearInterval(blitzInterval); blitzInterval = null; }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  // Helper
  function roundRectFill(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
    ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
    ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
    ctx.closePath();
  }

  return { init, stop, togglePause, resize };
})();
