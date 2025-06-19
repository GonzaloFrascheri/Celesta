// frontend/src/app/page.tsx

// 1) Si quieres desactivar SSG de esta ruta (y evitar la prerender de /_not-found)
// export const dynamic = 'force-dynamic';

'use client';

import { useEffect } from 'react';
import { FirebaseProvider } from './providers/FirebaseProvider';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

function RootPageContent() {
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

export default function RootPage() {
  return (
    <FirebaseProvider>
      <RootPageContent />
    </FirebaseProvider>
  );
}
