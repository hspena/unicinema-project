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
  apiKey: "AIzaSyAU_UGvHvIQhwgTFLRkT1N9imvT3Zi4Ux0",
  authDomain: "unicinema-8666b.firebaseapp.com",
  databaseURL: "https://unicinema-8666b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "unicinema-8666b",
  //storageBucket: "unicinema-8666b.firebasestorage.app",
  messagingSenderId: "463399137672",
  appId: "1:463399137672:web:1007333c00d3f649d4ca3d",
  measurementId: "G-0P1W2YH0N9"
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