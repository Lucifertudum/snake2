# 🐍 Snake Reloaded

Un remake du Snake Game en JavaScript vanilla avec un design dark/neon.

## 📁 Structure du projet

```
snake-game/
├── index.html     ← Structure HTML + liens vers CSS/JS
├── style.css      ← Tout le CSS (thème, animations, responsive)
├── game.js        ← Logique du jeu (canvas, boucle, controls)
└── README.md
```

## 🚀 Lancer le projet

### Option 1 — Extension Live Server (recommandé)
1. Ouvre le dossier dans **VS Code**
2. Installe l'extension **Live Server** (ritwickdey.LiveServer)
3. Clic droit sur `index.html` → **Open with Live Server**

### Option 2 — Directement
Double-clique sur `index.html` dans l'explorateur de fichiers.

> ⚠️ Si tu ouvres directement le fichier HTML (protocole `file://`),  
> certains navigateurs bloquent les polices Google Fonts — utilise Live Server.

---

## 🎮 Contrôles

| Action     | Clavier              | Mobile       |
|------------|----------------------|--------------|
| Haut       | ↑ ou Z               | Swipe / Bouton |
| Bas        | ↓ ou S               | Swipe / Bouton |
| Gauche     | ← ou Q               | Swipe / Bouton |
| Droite     | → ou D               | Swipe / Bouton |
| Pause      | Espace / Échap       | Bouton ⏸     |

---

## ✨ Fonctionnalités

- 4 skins : Classic, Neon, Fire, Ice
- 4 niveaux de difficulté
- Score + meilleur score (sauvegardé en localStorage)
- Montée de niveau automatique tous les 5 pommes
- Particules d'explosion à chaque pomme mangée
- Yeux animés sur la tête du serpent
- Grille, halo pulsant, effets glow
- Contrôles swipe sur mobile
- Pause en jeu

---

## 🎨 Personnalisation facile

Dans **`style.css`**, modifie les variables CSS au début du fichier :

```css
:root {
  --bg:      #0a0a0f;   /* Couleur de fond principale */
  --accent:  #00ff88;   /* Couleur principale verte */
  --accent2: #00ccff;   /* Couleur secondaire bleue */
  --danger:  #ff4466;   /* Couleur rouge (Game Over) */
}
```

Dans **`game.js`**, modifie les skins :

```js
const SKINS = {
  classic: { head: '#00ff88', body: '#00cc66', food: '#ff4466', glow: 'rgba(0,255,136,' },
  // Ajoute tes propres skins ici !
};
```
