/* =============================================
   skins.js — Définition des skins
============================================= */
const SKINS_DATA = [
  {
    id: 'classic',
    name: 'Classic',
    price: 0,
    rarity: 'common',
    head: '#00ff88',
    body: ['#00ff88','#00cc66','#009944'],
    food: '#ff4466',
    particle: '#00ff88',
    eyeColor: '#0a0a0f',
    glow: 'rgba(0,255,136,',
    draw(ctx, x, y, w, h, isHead, idx, dir) {
      const t = idx / 20;
      const g = ctx.createLinearGradient(x, y, x+w, y+h);
      g.addColorStop(0, this.head);
      g.addColorStop(1, this.body[Math.min(idx, 2)]);
      ctx.fillStyle = g;
      ctx.shadowColor = this.head;
      ctx.shadowBlur = isHead ? 18 : 6;
    }
  },
  {
    id: 'neon',
    name: 'Neon Purple',
    price: 150,
    rarity: 'rare',
    head: '#ff00ff',
    body: ['#cc00ff','#9900cc'],
    food: '#ffff00',
    particle: '#ff00ff',
    eyeColor: '#0a0a0f',
    glow: 'rgba(255,0,255,',
  },
  {
    id: 'fire',
    name: 'Inferno',
    price: 200,
    rarity: 'rare',
    head: '#ff8800',
    body: ['#ff5500','#ff2200'],
    food: '#ffee00',
    particle: '#ff6600',
    eyeColor: '#1a0000',
    glow: 'rgba(255,136,0,',
  },
  {
    id: 'ice',
    name: 'Glacial',
    price: 200,
    rarity: 'rare',
    head: '#00eeff',
    body: ['#0088ff','#0044cc'],
    food: '#ffffff',
    particle: '#00ccff',
    eyeColor: '#000a1a',
    glow: 'rgba(0,238,255,',
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    price: 400,
    rarity: 'epic',
    head: '#c084fc',
    body: ['#818cf8','#6366f1'],
    food: '#fde68a',
    particle: '#c084fc',
    eyeColor: '#0d0020',
    glow: 'rgba(192,132,252,',
  },
  {
    id: 'toxic',
    name: 'Toxic',
    price: 350,
    rarity: 'epic',
    head: '#a3e635',
    body: ['#65a30d','#4d7c0f'],
    food: '#fbbf24',
    particle: '#a3e635',
    eyeColor: '#0a1a00',
    glow: 'rgba(163,230,53,',
  },
  {
    id: 'lava',
    name: 'Lava',
    price: 350,
    rarity: 'epic',
    head: '#f97316',
    body: ['#dc2626','#991b1b'],
    food: '#fef08a',
    particle: '#f97316',
    eyeColor: '#1a0000',
    glow: 'rgba(249,115,22,',
  },
  {
    id: 'gold',
    name: '✦ Gold ✦',
    price: 800,
    rarity: 'legendary',
    head: '#fbbf24',
    body: ['#d97706','#b45309'],
    food: '#ffffff',
    particle: '#fbbf24',
    eyeColor: '#1a1000',
    glow: 'rgba(251,191,36,',
  },
  {
    id: 'void',
    name: '✦ Void ✦',
    price: 1000,
    rarity: 'legendary',
    head: '#f0abfc',
    body: ['#a855f7','#7c3aed'],
    food: '#00f5ff',
    particle: '#f0abfc',
    eyeColor: '#0d0020',
    glow: 'rgba(240,171,252,',
  },
];

function getSkin(id) {
  return SKINS_DATA.find(s => s.id === id) || SKINS_DATA[0];
}

// Dessiner la préview d'un skin sur un canvas
function drawSkinPreview(canvas, skinId) {
  const skin = getSkin(skinId);
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  // Fond
  ctx.fillStyle = '#0d0d1e';
  ctx.fillRect(0, 0, w, h);
  // Corps
  const segments = [[3,2],[2,2],[1,2],[1,1]];
  const sz = w / 5;
  segments.forEach(([sx,sy], i) => {
    ctx.fillStyle = i === 0 ? skin.head : (skin.body[Math.min(i,1)] || skin.body[0]);
    ctx.shadowColor = skin.head;
    ctx.shadowBlur = i === 0 ? 10 : 4;
    roundRectCtx(ctx, sx*sz+1, sy*sz+1, sz-2, sz-2, 3);
    ctx.fill();
  });
  ctx.shadowBlur = 0;
  // Nourriture
  ctx.fillStyle = skin.food;
  ctx.shadowColor = skin.food;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(3.5*sz, 0.5*sz, sz/2-2, 0, Math.PI*2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function roundRectCtx(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
  ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
  ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
  ctx.closePath();
}
