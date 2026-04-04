/* =============================================
   shop.js
============================================= */
const Shop = (() => {
  function render() {
    const grid = document.getElementById('shop-grid');
    const coins = Accounts.getCoins();
    document.getElementById('shop-coins-val').textContent = coins;

    grid.innerHTML = '';
    SKINS_DATA.forEach(skin => {
      const owned    = Accounts.hasSkin(skin.id);
      const equipped = Accounts.getEquippedSkin() === skin.id;
      const canBuy   = coins >= skin.price && !owned;

      const item = document.createElement('div');
      item.className = 'shop-item' + (owned ? ' owned' : '') + (equipped ? ' equipped' : '');

      // Canvas preview
      const previewCanvas = document.createElement('canvas');
      previewCanvas.width = 52; previewCanvas.height = 52;
      previewCanvas.className = 'shop-item-preview';
      drawSkinPreview(previewCanvas, skin.id);

      // Rarity badge
      const badge = document.createElement('span');
      badge.className = `shop-item-rarity rarity-${skin.rarity}`;
      badge.textContent = skin.rarity.toUpperCase();

      // Name
      const name = document.createElement('div');
      name.className = 'shop-item-name';
      name.textContent = skin.name;

      // Price or status
      const price = document.createElement('div');
      price.className = 'shop-item-price';
      if (skin.price === 0) {
        price.textContent = 'GRATUIT';
        price.style.color = 'var(--success)';
      } else if (owned) {
        price.innerHTML = '<span style="color:var(--success)">✓ Possédé</span>';
      } else {
        price.innerHTML = `<span style="color:var(--gold)">◈</span> ${skin.price}`;
        if (!canBuy) price.style.opacity = '.5';
      }

      // Button
      const btn = document.createElement('button');
      btn.className = 'shop-item-btn';
      if (equipped) {
        btn.className += ' equipped';
        btn.textContent = '✓ Équipé';
      } else if (owned) {
        btn.className += ' equip';
        btn.textContent = 'Équiper';
        btn.onclick = () => equipSkin(skin.id);
      } else if (canBuy) {
        btn.className += ' buy';
        btn.textContent = 'Acheter';
        btn.onclick = () => buySkin(skin.id, skin.price);
      } else {
        btn.className += ' locked';
        btn.textContent = skin.price === 0 ? 'Gratuit' : `◈ ${skin.price}`;
      }

      item.append(badge, previewCanvas, name, price, btn);
      grid.appendChild(item);
    });
  }

  function buySkin(id, price) {
    if (!Accounts.removeCoins(price)) {
      flashMessage('Pas assez de coins !', 'danger');
      return;
    }
    Accounts.unlockSkin(id);
    Accounts.equipSkin(id);
    updateMenuCoins();
    render();
    flashMessage('Skin acheté et équipé !', 'success');
  }

  function equipSkin(id) {
    Accounts.equipSkin(id);
    updateMenuCoins();
    render();
    // Mettre à jour la preview menu
    const pc = document.getElementById('skin-preview-canvas');
    if (pc) {
      drawSkinPreview(pc, id);
      document.getElementById('skin-preview-name').textContent = getSkin(id).name;
    }
  }

  function flashMessage(msg, type) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;top:20px;left:50%;transform:translateX(-50%);
      padding:10px 24px;border-radius:8px;font-family:var(--font-hd);
      font-size:.7rem;letter-spacing:2px;z-index:9999;
      animation:fadeInOut 2s ease forwards;pointer-events:none;
      ${type === 'danger'
        ? 'background:rgba(239,68,68,.2);border:1px solid var(--danger);color:var(--danger);'
        : 'background:rgba(34,197,94,.2);border:1px solid var(--success);color:var(--success);'}
    `;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2100);
  }

  // inject keyframe
  const style = document.createElement('style');
  style.textContent = `@keyframes fadeInOut{0%{opacity:0;top:30px}20%{opacity:1;top:20px}80%{opacity:1}100%{opacity:0;top:10px}}`;
  document.head.appendChild(style);

  return { render, equipSkin };
})();
