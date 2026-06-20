# UniCinema

A web-based cinema management and booking system built with **React**,
**TypeScript**, and **Firebase**. The application supports four user roles —
Admin, Cinema Room (Manager), Staff, and Moviegoer — each with a dedicated
dashboard, and includes QR-code ticketing and an AI movie-recommendation chatbot
(CineBot) backed by the Google Gemini API.

For a complete technical reference — architecture, external APIs, data model
(ERD), and system algorithms — see **[DOCUMENTATION.md](DOCUMENTATION.md)**.

---

## Features

- **Role-based dashboards** — the interface and navigation adapt to the authenticated user's role.
- **Real-time data** — Firebase Realtime Database propagates changes to all connected clients.
- **User management** — administrators create users; moviegoers can self-register.
- **Movie and genre catalogue** — with content ratings, synopsis, cast, and poster styling.
- **Configurable room layouts** — a visual builder for seat layouts (sections and seats).
- **Showtime scheduling** — manual scheduling with clash detection, plus an automated schedule generator.
- **Seat-level booking** — interactive seat selection on a live seat map; occupied seats are disabled.
- **Per-movie ticket pricing** — each movie has its own editable seat price, applied at booking.
- **QR-code ticketing** — each booking generates a scannable QR code for staff check-in.
- **CineBot** — an AI assistant that recommends movies from the live catalogue.
- **Performance & review insights** — attendance and rating analytics with trend charts and downloadable PDF reports (Admin and Manager).
- **In-app notifications** — booking confirmations, cancellations, reminders, and promotions.
- **Light and dark themes.**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18, TypeScript |
| Build | Create React App (`react-scripts`) |
| Database | Firebase Realtime Database |
| Authentication | Firebase Authentication |
| AI | Google Gemini API (`gemini-2.5-flash`) |
| Icons | `lucide-react` |
| QR codes | `qrcode`, `html5-qrcode` |
| PDF reports | `jspdf`, `jspdf-autotable` |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS recommended) and npm
- A Firebase project with Authentication and Realtime Database enabled
- A Google Gemini API key (for the CineBot chatbot)

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd unicinema-project

# 2. Install dependencies
npm install

# 3. Create your .env from the template and populate the keys
cp .env.example .env

# 4. Start the development server  →  http://localhost:3000
npm start
```

### Environment variables (`.env`)

Copy [`.env.example`](.env.example) to `.env` and populate the values. Both the
Gemini key and the Firebase configuration are read from these variables; see
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

> **Security note:** `.env` is gitignored and must never contain committed
> credentials. Because Create React App inlines environment variables, the
> `REACT_APP_GEMINI_API_KEY` is bundled into the client JavaScript; a production
> deployment should proxy Gemini calls through a backend so the key is never
> exposed to the browser.

### Initial setup: creating the first admin

A new database contains no users. Use the one-time bootstrap helper:

1. Temporarily add the following to [`src/index.tsx`](src/index.tsx):
   ```ts
   import { runSeedAdmin } from './app/utils/seedAdmin';
   runSeedAdmin();
   ```
2. Run `npm start` once and confirm the success message in the console.
3. Remove the import and call.
4. Log in with the seeded credentials and create all subsequent users through the Admin UI.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run the development server at `http://localhost:3000`. |
| `npm run build` | Produce an optimised production build in `build/`. |
| `npm test` | Run the test runner (Create React App / Jest). |

---

## Project Structure

```
src/app/
├── config/      Firebase initialisation
├── context/     Global state (Auth, Theme)
├── services/    Data-access layer — all Firebase and Gemini access
├── pages/       Screens grouped by role (Admin, Manager, Staff, Moviegoer)
├── components/  Reusable UI (layout, UI kit, builders, modals)
├── types/       Shared TypeScript interfaces
└── utils/       Navigation config, icons, helpers, seed script
```

The architecture follows a unidirectional dependency: UI (pages/components) →
**services** → Firebase. Components do not access Firebase directly. See
**[DOCUMENTATION.md](DOCUMENTATION.md)** for the full breakdown.

---

## User Roles

| Role | Default view | Capabilities |
|------|--------------|--------------|
| **Admin** | Dashboard | Manage users, rooms, movies, and snacks; view analytics and movie performance/review reports. |
| **Cinema Room** (Manager) | Dashboard | Manage schedules, staff, and tickets; view analytics and movie performance/review reports. |
| **Staff** | Schedule & Seats | View the daily schedule, scan tickets, and process walk-up bookings. |
| **Moviegoer** | Now Showing | Browse movies, view schedules, book tickets, use CineBot, and manage tickets. |

---

## License

Developed as a Final Year Project (FYP) for academic purposes.
