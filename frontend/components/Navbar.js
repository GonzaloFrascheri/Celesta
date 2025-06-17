// frontend/components/Navbar.js
"use client";

import { useAuth } from '../context/AuthContext';
import Image from 'next/image';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#fff', color: '#333', borderBottom: '1px solid #eaeaea', zIndex: 1000 }}>
      <span></span>
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>{user.displayName}</span>
          
          {/* --- INICIA LA CORRECCIÓN AQUÍ --- */}
          {/* Comprobamos que user.photoURL no sea nulo antes de renderizar */}
          {user.photoURL && (
            <Image 
              src={user.photoURL} 
              alt="Foto de perfil del usuario" 
              width={32}  // <-- Propiedad 'width' REQUERIDA (como número)
              height={32} // <-- Propiedad 'height' REQUERIDA (como número)
              style={{ borderRadius: '50%' }} 
            />
          )}
          {/* --- TERMINA LA CORRECCIÓN AQUÍ --- */}
          
          <button onClick={logout}>Cerrar Sesión</button>
        </div>
      )}
    </nav>
  );
}