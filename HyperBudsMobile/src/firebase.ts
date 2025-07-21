// src/firebase.ts

import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyAeZ3F5GCJgPkhzzlQeETf2CegRwsDb1A8',
  authDomain: 'hyperbuds-69863.firebaseapp.com',
  projectId: 'hyperbuds-69863',
  storageBucket: 'hyperbuds-69863.appspot.com',
  messagingSenderId: '255137667618',
  appId: '1:255137667618:web:6fd81d33e184845caf887b',
  measurementId: 'G-83LMS4J8EK',
};

// Initialize core
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Optional: only init analytics if supported (no RN warnings)
export let analytics: ReturnType<typeof getAnalytics> | null = null;
isSupported().then(supported => {
  if (supported) analytics = getAnalytics(app);
});
