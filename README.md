# 🧪 Color Tube Master 3D

A premium browser puzzle game built with vanilla JavaScript, Firebase, and real-time multiplayer leaderboard.

**🎮 Play Live:** [color-tube-master.web.app](https://color-tube-master.web.app)

---

## ✨ Features

- 🎮 **100 levels** — Beginner to Expert difficulty
- 🌍 **Real-time global leaderboard** — powered by Firebase Firestore
- 🔐 **Authentication** — Google Sign-In + Email/Password
- ☁️ **Cloud save** — progress syncs across all devices
- 📅 **Daily challenges** with streak rewards
- 🏆 **15 achievements** to unlock
- 🎨 **5 themes** — Lab, Neon, Space, Fantasy, Ocean
- 💡 **Hint system** & AI Auto-Solve
- 📺 **Ad system** — ready for Google AdSense
- 📱 **PWA** — installable on phones as an app
- 🎵 **Procedural audio** — no external sound files needed
- 🔄 **Offline play** via Service Worker

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Auth | Firebase Authentication |
| Database | Cloud Firestore (real-time) |
| Hosting | Firebase Hosting |
| PWA | Web App Manifest + Service Worker |
| Audio | Web Audio API (procedural) |
| Graphics | CSS 3D + Canvas API |

---

## 🚀 Setup

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/color-tube-master.git
cd color-tube-master
```

### 2. Configure Firebase
Edit `js/firebase-config.js` with your Firebase project credentials:
```javascript
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  ...
};
```

### 3. Open locally
Just open `index.html` in your browser — no build step needed!

### 4. Deploy to Firebase
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```

---

## 💰 Monetization

- **Google AdSense** — Ad slots already built in. Set `enabled: true` in `js/ads.js` after approval
- **Buy Me a Coffee** — Donate button on main menu
- **CodeCanyon** — Sell the source code

---

## 📁 Project Structure

```
game/
├── index.html          # Main HTML + screens
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker (offline)
├── firebase.json       # Firebase hosting config
├── css/
│   ├── main.css        # Core styles
│   ├── tubes.css       # 3D tube styles
│   ├── ui.css          # UI components
│   ├── themes.css      # 5 color themes
│   ├── auth.css        # Auth screens
│   └── ads.css         # Ad + support styles
├── js/
│   ├── firebase-config.js  # 🔑 Firebase credentials
│   ├── levels.js           # 100 level definitions
│   ├── game.js             # Core game logic
│   ├── ui.js               # UI & screen management
│   ├── auth.js             # Firebase Auth
│   ├── auth-ui.js          # Login/signup UI
│   ├── leaderboard-service.js  # Real-time leaderboard
│   ├── ads.js              # AdSense manager
│   ├── audio.js            # Procedural audio
│   ├── progression.js      # XP, coins, achievements
│   ├── storage.js          # Local storage
│   ├── solver.js           # AI hint solver
│   ├── renderer.js         # Canvas renderer
│   ├── animations.js       # Animations
│   └── utils.js            # Utilities
└── icons/              # PWA icons (all sizes)
```

---

## 📄 License

MIT License — feel free to use, modify, and sell!

---

Made with ❤️ by [Abhinandan](https://github.com/YOUR_USERNAME)
