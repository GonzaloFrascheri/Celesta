'use client';

import { useEffect } from 'react';
import { useAuth }   from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.push(user ? '/home' : '/login');
    }
  }, [user, loading, router]);

  return (
    <div
      style={{
        display:        'flex',
        justifyContent: 'center',
        alignItems:     'center',
        height:         '100vh',
      }}
    >
      <h1>Cargando...</h1>
    </div>
  );
}
