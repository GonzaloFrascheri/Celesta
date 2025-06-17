// frontend/context/AuthContext.js
"use client";

import { useState, useEffect, useContext, createContext } from 'react';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error durante el login con Google:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      router.push('/login'); // Redirige al login después de cerrar sesión
    } catch (error) {
      console.error("Error durante el logout:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const value = { user, loading, loginWithGoogle, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto fácilmente
export const useAuth = () => {
  return useContext(AuthContext);
};