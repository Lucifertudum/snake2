# 🐍 SERPENTIS — Ultimate Snake v3

Jeu Snake complet avec système de comptes multi-joueurs, leaderboard global, profils, badges et panel admin.

## ✨ Nouveautés v3

### Système de comptes
- **Inscription / Connexion** avec pseudo et mot de passe
- **20 avatars** émoji au choix
- **Mode invité** pour jouer sans compte
- **Déconnexion** propre entre joueurs

### Profil joueur
- **Titre évolutif** (Novice → Légendaire) selon les parties jouées et le meilleur score
- **12 badges** à débloquer (Centurion, Marathonien, Roi des Portails, Maître Zen…)
- **Stats complètes** : parties, pommes, coins, temps de jeu, mode favori
- **Historique** des scores par mode (top 10)
- **Changer avatar** et mot de passe depuis le profil

### Leaderboard global
- **Classement local** : tes propres meilleurs scores
- **Classement global** : tous les joueurs de la machine, par mode
- **Badge "lb-me"** pour repérer ta propre entrée dans le classement global
- Rank mondial affiché sur le profil

### Économie & Boutique
- Chaque compte a ses propres **coins** (100 coins offerts à l'inscription)
- Achats de **skins** par compte (11 skins, 4 raretés)
- Les coins sont gagnés en jouant et sauvegardés par compte

### Admin Panel (Konami Code ↑↑↓↓←→←→BA)
- **Dashboard** avec stats globales multi-comptes
- **Gestion joueurs** : voir tous les comptes, donner des coins
- **Gestion boutique** : débloquer skins, gérer coins du compte actif
- **Config** : vitesse, coins/pomme, événement Double Coins
- **Cheats** : mode tortue/éclair, reset leaderboard, export JSON
- Mot de passe : `SERPENTIS2024`

## 🎮 6 Modes de jeu
- **Classique** — Grille bloc par bloc
- **Smooth** — Mouvement libre et fluide
- **Portails** — Traverser les murs
- **Blitz** — 60 secondes chrono
- **Labyrinthe** — Obstacles aléatoires
- **Zen** — Détente sans game over

## 🚀 Déploiement GitHub Pages

1. Push tous les fichiers à la racine du repo
2. Settings → Pages → Source : **GitHub Actions**
3. Workflow `.github/workflows/pages.yml` avec `source: ./`

## 📁 Structure
```
├── index.html
├── css/
│   └── main.css
└── js/
    ├── accounts.js   ← Système de comptes (nouveau)
    ├── skins.js      ← Définition des skins
    ├── shop.js       ← Boutique
    ├── game.js       ← Moteur de jeu (6 modes)
    ├── admin.js      ← Panel admin
    └── app.js        ← Contrôleur principal
```

## 💾 Stockage
Tout est en `localStorage`, pas de serveur requis. Fonctionne sur GitHub Pages.
- `serpentis_accounts_v3` — tous les comptes + leaderboard global
- `serpentis_session_v3` — session active
- `serpentis_config_v3` — configuration du jeu
