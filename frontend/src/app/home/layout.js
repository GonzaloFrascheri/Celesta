// frontend/app/home/layout.js
"use client";
import Sidebar from '../../../components/Sidebar';
import Navbar from '../../../components/Navbar';

export default function HomeLayout({ children }) {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={{ flexGrow: 1, marginLeft: '250px' }}> {/* marginLeft igual al ancho del sidebar */}
        <Navbar />
        <main style={{ marginTop: '70px', padding: '2rem' }}> {/* marginTop igual a la altura del navbar */}
          {children} {/* Aquí se renderizará el contenido de la página actual */}
        </main>
      </div>
    </div>
  );
}