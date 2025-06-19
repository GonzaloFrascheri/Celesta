// frontend/api/firebase.js
'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:              process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:          process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:           process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:       process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:   process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:               process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Sólo en cliente crea o recupera la app de Firebase
 */
export function getFirebaseAuth() {
  if (typeof window === 'undefined') {
    return null;  // No hay auth en server
  }
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getAuth(app);
}
