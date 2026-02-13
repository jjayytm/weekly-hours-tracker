# 🕐 Houra

A lightweight, installable PWA for tracking weekly working hours across your **Saturday → Friday** pay period. Log shifts as you go, then verify your total when your paycheck arrives.

**Live app:** [weekly-hours-tracker.vercel.app](https://weekly-hours-tracker.vercel.app)

---

## Features

- **Sat → Fri pay period** — matches a biweekly paycheck cycle
- **Shift types** — Morning, Evening, Full Day, or Other
- **Two tracking modes** — 24h weekly limit with alerts, or unlimited
- **Daily bar chart** — visual breakdown of hours per day
- **Archive system** — verify your week, archive it, start fresh
- **Week history** — browse all past weeks and their totals
- **Auto-save** — data persists in your browser between visits
- **Installable PWA** — add to iPhone or Android home screen, works offline

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18 or higher
- npm (comes with Node.js)

### Install & Run Locally

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/houra.git
cd houra

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

Output goes to the `dist/` folder.

---

## Deploy to Vercel

### Option A — Vercel CLI

```bash
npm install -g vercel
vercel
```

### Option B — Vercel Dashboard

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repository
4. Vercel auto-detects Vite — click **Deploy**

Every `git push` to `main` will automatically redeploy.

---

## Install as a PWA (Add to Home Screen)

### iPhone / iPad
1. Open the app in **Safari**
2. Tap the **Share** button → **Add to Home Screen**
3. Name it **Houra** → tap **Add**

### Android
1. Open in **Chrome**
2. Tap the three-dot menu → **Add to Home Screen**
3. Or tap the install banner that appears automatically

### Desktop (Chrome / Edge)
Click the **install icon** in the address bar.

---

## Project Structure

```
houra/
├── public/
│   ├── icon.png              # App icon (1024×1024, flat square — no pre-rounded corners)
│   ├── apple-touch-icon.png  # iOS home screen icon (180×180)
│   ├── manifest.json         # PWA manifest
│   └── sw.js                 # Service worker for offline support
├── src/
│   ├── App.jsx               # Main app component (WeeklyHoursTracker)
│   └── main.jsx              # Entry point + service worker registration
├── index.html                # HTML shell with PWA meta tags
└── vite.config.js            # Vite config
```

---

## App Icon Notes

For iOS to display the icon correctly with **no visible border or padding**:

- The icon must be a **flat square PNG** — no rounded corners baked into the image
- The background color must reach **all four corners** of the canvas
- Set `background_color` in `manifest.json` to match the icon background
- iOS applies its own rounded mask — never pre-round the image yourself

---

## Tech Stack

- [React](https://react.dev) — UI
- [Vite](https://vitejs.dev) — build tool
- [Vercel](https://vercel.com) — hosting
- `localStorage` — data persistence (per device/browser)
- CSS-in-JS inline styles — no external style dependencies

---

## License

MIT — free to use, modify, and distribute.
