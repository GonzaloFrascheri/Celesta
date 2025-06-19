'use client';

import { ReactNode, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../../../lib/firebase';

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<any>(null);

  useEffect(() => {
    const firebaseAuth = getFirebaseAuth();
    setAuth(firebaseAuth);
  }, []);

  // Aquí podrías poner un contexto de auth si lo quieres
  return <>{children}</>;
}
