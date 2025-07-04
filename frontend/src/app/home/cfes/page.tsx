'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CFEsPage() {
  const [cfes, setCfes]       = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/cfes?limit=10`)
      .then(res => res.json())
      .then(json => setCfes(json.data.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Listado de CFEs</h1>
      {loading && <p>Cargando...</p>}
      {cfes.map(cfe => (
        <div key={cfe.id} style={{ border: '1px solid #ccc', margin: 10, padding: 10 }}>
          <p><strong>{cfe.emisor_nombre}</strong> → {cfe.receptor_rut}</p>
          <p>Total: {cfe.monto_total} {cfe.moneda}</p>
          {/* Link al detalle dinámico */}
          <Link href={`/home/cfes/${cfe.id}`}>Ver detalle</Link>
        </div>
      ))}
    </div>
  );
}
