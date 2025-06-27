// frontend/src/app/components/Topbar.js
"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import styles from './Topbar.module.css';
import { FaBell, FaSignOutAlt, FaUserCircle, FaCog, FaBars } from 'react-icons/fa';

// AÑADIMOS la prop 'onMenuButtonClick'
export default function Topbar({ onMenuButtonClick }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      alert("Hubo un problema al cerrar la sesión.");
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <header className={styles.topbar}>
      {/* Lado Izquierdo: Ahora contiene el botón de menú para móviles */}
      <div className={styles.leftActions}>
        <button onClick={onMenuButtonClick} className={styles.menuButton} aria-label="Abrir menú">
            <FaBars />
        </button>
        {/* Aquí podría ir un futuro buscador */}
      </div>

      {/* Lado Derecho: Acciones de Usuario */}
      <div className={styles.rightActions}>
        <button className={styles.iconButton} title="Notificaciones">
          <FaBell />
          <span className={styles.notificationBadge}></span>
        </button>

        <div className={styles.separator}></div>

        <div className={styles.userMenu} ref={dropdownRef}>
          <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className={styles.userMenuButton}>
            <div className={styles.userDetails}>
              <span className={styles.userName}>{user?.email || 'Usuario'}</span>
              <span className={styles.userRole}>Administrador</span>
            </div>
            <div className={styles.avatar}>GF</div>
          </button>

          {isDropdownOpen && (
            <div className={styles.dropdownMenu}>
              <a href="#" className={styles.dropdownItem}><FaUserCircle className={styles.dropdownIcon} /> Mi Perfil</a>
              <a href="#" className={styles.dropdownItem}><FaCog className={styles.dropdownIcon} /> Configuración</a>
              <div className={styles.dropdownDivider}></div>
              <a href="#" onClick={handleLogout} className={`${styles.dropdownItem} ${styles.logout}`}>
                <FaSignOutAlt className={styles.dropdownIcon} /> Cerrar Sesión
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}