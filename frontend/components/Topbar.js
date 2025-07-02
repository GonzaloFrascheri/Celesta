// frontend/src/app/components/Topbar.js
"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import styles from "./Topbar.module.css";
import {
  FaBell,
  FaSignOutAlt,
  FaUserCircle,
  FaCog,
  FaBars,
} from "react-icons/fa";

export default function Topbar({ onMenuButtonClick }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ─────────── CÁLCULO DE INICIALES ───────────
  const email = user?.email ?? "";
  const localPart = email.split("@")[0];

  // 1️⃣ Si localPart tiene separadores, parto y uso first/last segmento
  const segs = localPart.split(/[\.\-_]/).filter(Boolean);
  let initials = "";

  if (segs.length > 1) {
    initials = segs[0][0] + segs[segs.length - 1][0];
  }
  // 2️⃣ Si no y tengo displayName con al menos dos palabras, uso esas iniciales
  else if (user?.displayName) {
    const parts = user.displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      initials = parts[0][0] + parts[1][0];
    } else {
      initials = parts[0].slice(0, 2);
    }
  }
  // 3️⃣ Si ni se separa ni tengo displayName, me quedo con las primeras dos letras
  else {
    initials = localPart.slice(0, 2);
  }

  initials = initials.toUpperCase();
  // ────────────────────────────────────────────

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  useEffect(() => {
    function onClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <header className={styles.topbar}>
      <div className={styles.leftActions}>
        <button
          onClick={onMenuButtonClick}
          className={styles.menuButton}
          aria-label="Abrir menú"
        >
          <FaBars />
        </button>
      </div>

      <div className={styles.rightActions}>
        <button className={styles.iconButton} title="Notificaciones">
          <FaBell />
          <span className={styles.notificationBadge}></span>
        </button>
        <div className={styles.separator}></div>

        <div className={styles.userMenu} ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen((o) => !o)}
            className={styles.userMenuButton}
          >
            <div className={styles.userDetails}>
              <span className={styles.userName}>{email || "Usuario"}</span>
              <span className={styles.userRole}>Administrador</span>
            </div>
            <div className={styles.avatar}>{initials}</div>
          </button>

          {isDropdownOpen && (
            <div className={styles.dropdownMenu}>
              <a href="#" className={styles.dropdownItem}>
                <FaUserCircle className={styles.dropdownIcon} /> Mi Perfil
              </a>
              <a href="#" className={styles.dropdownItem}>
                <FaCog className={styles.dropdownIcon} /> Configuración
              </a>
              <div className={styles.dropdownDivider} />
              <button
                onClick={handleLogout}
                className={`${styles.dropdownItem} ${styles.logout}`}
              >
                <FaSignOutAlt className={styles.dropdownIcon} /> Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
