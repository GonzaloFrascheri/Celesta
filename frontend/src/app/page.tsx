'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/home');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: 'sans-serif'
    }}>
      <p style={{ fontSize: '1.25rem', color: '#4b5563' }}>Cargando...</p>
      <p style={{ color: '#6b7280' }}>Serás redirigido a la página de inicio de sesión o al dashboard.</p>
    </div>
  );
}
