// src/firebase.ts
import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyAeZ3F5GCJgPkhzzlQeETf2CegRwsDb1A8',
  authDomain: 'hyperbuds-69863.firebaseapp.com',
  projectId: 'hyperbuds-69863',
  storageBucket: 'hyperbuds-69863.appspot.com',
  messagingSenderId: '255137667618',
  appId: '1:255137618:web:6fd81d33e184845caf887b',
  measurementId: 'G-83LMS4J8EK',
};

// Initialize core app
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistent storage (React Native)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Optional analytics (guarded)
export let analytics: ReturnType<typeof getAnalytics> | null = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});
