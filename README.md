# 🐍 SERPENTIS — Ultimate Snake

Un Snake Game next-level avec mouvement libre, boutique, modes de jeu variés et panel admin.

## 🌐 Live Demo
> `https://TON_USERNAME.github.io/snake/`

---

## 📁 Structure

```
snake-ultimate/
├── index.html
├── css/
│   └── main.css
├── js/
│   ├── storage.js   — Persistance localStorage
│   ├── skins.js     — Définition des skins
│   ├── shop.js      — Boutique
│   ├── game.js      — Moteur de jeu (tous modes)
│   ├── admin.js     — Panel admin
│   └── app.js       — Contrôleur principal
└── README.md
```

---

## 🎮 Modes de jeu

| Mode | Description |
|------|-------------|
| 🟩 Classique | Grille bloc par bloc, le grand classique |
| 🌊 Smooth | Mouvement fluide libre sur le canvas |
| 🌀 Portails | Traversez les murs, réapparaissez de l'autre côté |
| ⚡ Blitz | 60 secondes chrono, score max |
| 🧱 Labyrinthe | Obstacles générés aléatoirement |
| ☯ Zen | Pas de game over, score infini |

---

## 🛒 Boutique

9 skins (Common → Legendary) déblocables avec des coins gagnés en jouant.

---

## 🔐 Panel Admin

**Accès :** Code Konami `↑↑↓↓←→←→BA` ou via le hint discret en bas à droite.  
**Mot de passe :** `SERPENTIS2024`

Fonctionnalités :
- Dashboard avec statistiques complètes
- Historique des scores
- Gestion des skins et coins
- Configuration du jeu (vitesse, coins, événements)
- Cheats (coins illimités, déblocage, etc.)

---

## 🎯 Contrôles

| Action | Clavier | Mobile |
|--------|---------|--------|
| Diriger | ↑↓←→ ou ZQSD | D-pad / Swipe |
| Pause | Espace / Échap | Bouton ⏸ |

---

## 🚀 Mise en ligne sur GitHub Pages

```bash
git init
git add .
git commit -m "🐍 SERPENTIS ultimate snake"
git branch -M main
git remote add origin https://github.com/USERNAME/snake.git
git push -u origin main
```

Puis **Settings → Pages → Deploy from main branch**.
