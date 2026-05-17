# 💪 Goz-Transfo

**Your personal 120-day body transformation app.**

Built with React + Vite. Apple iOS design language. Works as a PWA (installable on iPhone/Android home screen).

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Install & Run
```bash
# Install dependencies
npm install

# Start development server
npm run dev
# → Opens at http://localhost:5173
```

### Build for Production
```bash
npm run build
# → Output in /dist folder
```

### Preview Production Build
```bash
npm run preview
```

---

## 📱 Deploy Options

### Option 1: Vercel (Recommended — Free)
```bash
npm install -g vercel
vercel
# Follow prompts → gets a live URL instantly
```

### Option 2: Netlify (Free)
1. Run `npm run build`
2. Drag the `/dist` folder to [netlify.com/drop](https://app.netlify.com/drop)
3. Done — live URL in 30 seconds

### Option 3: GitHub Pages
```bash
npm install -g gh-pages
# Add to package.json scripts: "deploy": "gh-pages -d dist"
npm run build && npm run deploy
```

---

## 📲 Install as iPhone App (PWA)

1. Open your deployed URL in Safari on iPhone
2. Tap the **Share** button (box with arrow)
3. Tap **"Add to Home Screen"**
4. Tap **"Add"**
5. The app icon appears on your home screen — opens full screen like a native app

---

## 🏗️ Project Structure

```
GozTransfo/
├── index.html          ← Entry HTML
├── vite.config.js      ← Vite configuration
├── package.json        ← Dependencies
├── public/
│   └── manifest.json   ← PWA manifest (for home screen install)
└── src/
    ├── main.jsx        ← React entry point
    └── App.jsx         ← Full app (all views + logic)
```

---

## ✨ Features

| Tab | Feature |
|-----|---------|
| 🏠 Home | Daily hero card, streak counters, weight tracking, check-in |
| 📋 Today | Day-specific workout, journal, quick mood |
| 🎯 Rings | Apple Fitness-style activity rings, 7-day history, workout music |
| 🍽️ Diet | Food log, meal suggestions, water tracker, calorie stats |
| 🧠 Mood | Mood & energy logging, history chart, pattern insights |
| 📈 Stats | Progress stats, weight chart, day grid |
| 📅 Plan | 120-day schedule, grocery list, non-negotiables |

---

## 🗄️ Data Storage

All data is saved in **localStorage** on the user's device. Nothing is sent to any server. Data persists across sessions automatically.

To reset: open browser DevTools → Application → Local Storage → clear `goz_transfo_v3`

---

## 🔧 Customization

Open `src/App.jsx` and look for:

- **`PHASES`** — change phase names, colors, day ranges
- **`MEAL_DB`** — add/edit meal suggestions per phase
- **`PLAYLISTS`** — swap workout playlist links
- **`getMeals()`** — change daily meal plans per phase
- **`getWorkout()`** — adjust workout protocols

---

## 📦 Tech Stack

- **React 18** — UI framework
- **Vite 5** — Build tool & dev server
- **localStorage** — Persistent data (no backend needed)
- **Google Fonts** — DM Sans + DM Serif Display
- **Pure CSS animations** — Spring physics, ring fills, fade-ups
- **SVG** — Activity rings drawn in pure SVG

---

Built for **Gozbert Bruno Joachim** — 120 days. Let's get it. 💪
