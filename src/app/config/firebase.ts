// ─── Firebase Configuration ───────────────────────────────────────────────────
// Replace the values below with your actual Firebase project credentials.
// Firebase Console → Project Settings → General → Your apps → Web app config.
//
// NOTE: Never commit real API keys to version control.
// Use a .env file with REACT_APP_ prefix variables instead.

import { initializeApp } from 'firebase/app';
import { getAuth }       from 'firebase/auth';
import { getDatabase }   from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Recommended Firestore collections:
// /users        → UserRole, status, displayName, email
// /rooms        → capacity, sections, status, managerId
// /movies       → title, genre, duration, rating, emoji, year
// /schedules    → roomId, movieId, time, date, totalSeats
// /bookings     → userId, scheduleId, seats[], paid, status
// /snacks       → name, price, emoji, stock

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);


export { app, auth, db };