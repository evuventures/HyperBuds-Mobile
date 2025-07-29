// src/firebase.ts

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your Firebase web app configuration
const firebaseConfig = {
  apiKey: 'AIzaSyAeZ3F5GCJgPkhzzlQeETf2CegRwsDb1A8',
  authDomain: 'hyperbuds-69863.firebaseapp.com',
  projectId: 'hyperbuds-69863',
  storageBucket: 'hyperbuds-69863.appspot.com',
  messagingSenderId: '255137667618',
  appId: '1:255137667618:web:6fd81d33e184845caf887b',
  measurementId: 'G-83LMS4J8EK',
};

// 1) Initialize the core Firebase app
const app = initializeApp(firebaseConfig);

// 2) Initialize Auth with default (in‑memory) persistence
//    This means the user will be logged out on app restart,
//    but avoids the missing‑export error you’re seeing.
export const auth = getAuth(app);

// 3) Optionally initialize Analytics if supported
export let analytics: ReturnType<typeof getAnalytics> | null = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});
