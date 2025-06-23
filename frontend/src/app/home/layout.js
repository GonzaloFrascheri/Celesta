// frontend/src/app/home/layout.js
"use client";

import { useState } from 'react';
import Sidebar from '../../../components/Sidebar';
import styles from './HomeLayout.module.css';
import { FaBars, FaTimes } from 'react-icons/fa';

export default function HomeLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ==========================================================
  // ¡NUEVA FUNCIÓN! Esta función se encargará de cerrar el menú.
  // ==========================================================
  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className={styles.layoutContainer}>
      <div className={`${styles.sidebarWrapper} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
        {/* ==========================================================
          ¡CAMBIO CLAVE! Le pasamos la función al Sidebar como prop.
          ==========================================================
        */}
        <Sidebar onLinkClick={handleSidebarClose} />
      </div>

      <div className={styles.mainContent}>
        <header className={styles.mobileHeader}>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className={styles.menuButton}
            aria-label="Toggle menu"
          >
            {isSidebarOpen ? <FaTimes /> : <FaBars />}
          </button>
          <div className={styles.mobileLogo}>Celesta</div>
        </header>
        
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}