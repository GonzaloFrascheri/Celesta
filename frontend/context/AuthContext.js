"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import {
   onAuthStateChanged,
   GoogleAuthProvider,
   signInWithPopup,
   signOut, 
   setPersistence, 
   browserSessionPersistence
 } from 'firebase/auth';
import { getFirebaseAuth } from '../lib/firebase';
import { useRouter } from 'next/navigation';

const AuthContext = createContext({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const router                = useRouter();

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    // 🟢 Opcional: forzar persistencia SOLO en la sesión actual (se pierde al cerrar pestaña)
    setPersistence(auth, browserSessionPersistence)
      .catch(err => console.error("Error al establecer persistencia:", err));

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;

    // 🔴 Configuramos el provider para que SIEMPRE muestre el chooser
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await signInWithPopup(auth, provider);
      // Después de login, puedes hacer router.push('/home') si quieres
    } catch (error) {
      console.error("Error durante el login con Google:", error);
    }
  };

  const logout = async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error durante el logout:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
