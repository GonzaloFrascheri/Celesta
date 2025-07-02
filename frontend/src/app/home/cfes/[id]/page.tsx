'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CFEPage() {
  const params = useSearchParams();
  const id     = params.get('id');
  const [cfe, setCfe]       = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/cfes/${id}`)
      .then(res => res.json())
      .then(json => setCfe(json.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p>Cargando CFE…</p>;
  if (!cfe)    return <p>No se encontró el CFE.</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Detalle CFE #{cfe.numero_cfe}</h1>
      <p><strong>Emisor:</strong> {cfe.emisor_nombre} ({cfe.emisor_rut})</p>
      <p><strong>Receptor:</strong> {cfe.receptor_rut}</p>
      <p><strong>Fecha emisión:</strong> {new Date(cfe.fecha_emision).toLocaleString()}</p>
      <p><strong>Monto Total:</strong> {cfe.monto_total} {cfe.moneda}</p>
      <pre style={{ whiteSpace: 'pre-wrap', background: '#f9f9f9', padding: 10 }}>
        {cfe.contenido_xml}
      </pre>
    </div>
  );
}
