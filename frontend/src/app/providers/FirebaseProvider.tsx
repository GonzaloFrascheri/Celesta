// frontend/app/providers/FirebaseProvider.tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:              process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:          process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:           process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:       process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId:   process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:               process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

function getOrInitApp(): FirebaseApp {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

export function FirebaseProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    _app = getOrInitApp();
    _auth = getAuth(_app);
  }, []);

  // Puedes también exponer el auth con un hook o contexto si lo necesitas:
  // <AuthContext.Provider value={_auth}>{children}</AuthContext.Provider>
  return <>{children}</>;
}

// exporta una función para que en cualquier cliente puedas hacer getFirebaseAuth()
export function getFirebaseAuth(): Auth {
  if (!_app) {
    _app = getOrInitApp();
  }
  if (!_auth) {
    _auth = getAuth(_app);
  }
  return _auth;
}
