// frontend/src/app/home/layout.js
"use client";

import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
import styles from './HomeLayout.module.css';

export default function HomeLayout({ children }) {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSidebarClose = () => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  if (!user) {
    return <div className={styles.fullScreenLoader}>Cargando...</div>;
  }

  return (
    <div className={styles.layoutContainer}>
      <div className={`${styles.sidebarWrapper} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
        <Sidebar onLinkClick={handleSidebarClose} />
      </div>

      <div className={styles.mainContent}>
        {/* Le pasamos la función para que el Topbar pueda abrir/cerrar el menú */}
        <Topbar onMenuButtonClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        
        <main className={styles.pageContent}>
          {children}
        </main>
      </div>
    </div>
  );
}