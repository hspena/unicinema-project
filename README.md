# 🎬 UniCinema

A web-based **cinema management and booking system** built with **React +
TypeScript** and **Firebase**. It supports four user roles — Admin, Cinema Room
(Manager), Staff, and Moviegoer — each with a tailored dashboard, plus QR-code
ticketing and an AI movie-recommendation chatbot (CineBot) powered by Google
Gemini.

> 📖 For a full code walkthrough, architecture, APIs, ERD, and logic flows, see
> **[DOCUMENTATION.md](DOCUMENTATION.md)**.

---

## ✨ Features

- **Role-based dashboards** — Admin, Manager, Staff, and Moviegoer each see a
  different interface and navigation.
- **Real-time data** — powered by Firebase Realtime Database; changes appear
  instantly across all clients.
- **User management** — admins create users; moviegoers can self-register.
- **Movie & genre catalogue** — with content ratings, synopsis, cast, and poster styling.
- **Custom room layouts** — a visual builder for seat layouts (sections + seats).
- **Showtime scheduling** — manual scheduling with clash detection, plus an
  **automated schedule generator**.
- **Seat-level booking** — pick seats on a live seat map; taken seats are greyed out.
- **QR-code tickets** — every booking gets a scannable QR code; staff check guests
  in with the camera.
- **CineBot** — an AI assistant that recommends movies from the live catalogue.
- **In-app notifications** — booking confirmations, cancellations, reminders, and promos.
- **Light / dark theme**.

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18, TypeScript |
| Build | Create React App (`react-scripts`) |
| Database | Firebase Realtime Database |
| Auth | Firebase Authentication |
| AI | Google Gemini API (`gemini-2.5-flash`) |
| Icons | `lucide-react` |
| QR codes | `qrcode`, `html5-qrcode` |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS recommended) and npm
- A Firebase project (Authentication + Realtime Database enabled)
- A Google Gemini API key (for the CineBot chatbot)

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd unicinema-project

# 2. Install dependencies
npm install

# 3. Create your .env from the template and fill in your keys
cp .env.example .env

# 4. Start the dev server  →  http://localhost:3000
npm start
```

### Environment variables (`.env`)

Copy [`.env.example`](.env.example) to `.env` and fill in the values. Both the
Gemini key and the full Firebase config are read from these variables — see
[`src/app/config/firebase.ts`](src/app/config/firebase.ts).

```env
# Google Gemini (CineBot)
REACT_APP_GEMINI_API_KEY=your_gemini_key_here

# Firebase
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebasedatabase.app
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

> ⚠️ `.env` is gitignored — never commit real keys. The `REACT_APP_GEMINI_API_KEY`
> is still bundled into the client JS (a CRA limitation); for production you'd
> proxy Gemini calls through a backend so the key never reaches the browser.

### Creating the first admin
A fresh database has no users. Use the one-time seed helper:

1. Temporarily add to [`src/index.tsx`](src/index.tsx):
   ```ts
   import { runSeedAdmin } from './app/utils/seedAdmin';
   runSeedAdmin();
   ```
2. Run `npm start` once and check the console for the success message.
3. **Remove** the import/call again.
4. Log in with the seeded admin credentials, then create all other users from the
   Admin UI.

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run the development server at `http://localhost:3000`. |
| `npm run build` | Build an optimised production bundle into `build/`. |
| `npm test` | Run the test runner (Create React App / Jest). |

---

## 📁 Project Structure

```
src/app/
├── config/      Firebase initialisation
├── context/     Global state (Auth, Theme)
├── services/    Data layer — all Firebase + Gemini access
├── pages/       Screens grouped by role (Admin, Manager, Staff, Moviegoer)
├── components/  Reusable UI (layout, ui kit, builders, modals)
├── types/       Shared TypeScript interfaces
└── utils/       Navigation config, icons, helpers, seed script
```

**Architecture in one line:** UI (pages/components) → **services** → Firebase.
Pages never talk to Firebase directly. See **[DOCUMENTATION.md](DOCUMENTATION.md)**
for the full breakdown.

---

## 👥 User Roles

| Role | Lands on | Can do |
|------|----------|--------|
| **Admin** | Dashboard | Manage users, rooms, movies, snacks; view analytics. |
| **Cinema Room** (Manager) | Dashboard | Manage schedules, staff, tickets, analytics for a cinema. |
| **Staff** | Schedule & Seats | View the day's shows, scan tickets, walk-up bookings. |
| **Moviegoer** | Now Showing | Browse, view schedules, book tickets, chat with CineBot, view tickets. |

---

## 📄 License

This project was developed as a Final Year Project (FYP) for academic purposes.
