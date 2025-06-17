"use client";

import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext'; // La ruta al contexto es correcta
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Cuando termine de cargar la información de autenticación...
    if (!loading) {
      if (user) {
        // Si hay un usuario, lo mandamos a /home
        router.push('/home');
      } else {
        // Si no hay usuario, lo mandamos a /login
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  // Mientras tanto, muestra un mensaje de carga
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <h1>Cargando...</h1>
    </div>
  );
}