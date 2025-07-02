// src/app/home/proveedores/editar/[id]/page.tsx
"use client";

import React, {
  useState,
  useEffect,
  ChangeEvent,
  FormEvent
} from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import apiClient from "../../../../../../lib/api";
import styles from "../../Proveedor.module.css";

interface Proveedor {
  id: string;
  rut: string;
  razon_social: string;
  giro: string | null;
}

export default function EditarProveedorPage() {
  const router = useRouter();
  const { id } = useParams();

  // 1️⃣ Estado inicial con los campos que usaremos
  const [prov, setProv] = useState<Proveedor>({
    id:           "",
    rut:          "",
    razon_social: "",
    giro:         null,
  });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  // 2️⃣ Traer los datos al montar
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get<{
          success: boolean;
          data: Proveedor;
        }>(`/proveedor/${id}`);
        if (res.data.success) {
          setProv(res.data.data);
        } else {
          setError("Proveedor no encontrado.");
        }
      } catch (e) {
        console.error(e);
        setError("Error al cargar el proveedor.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // 3️⃣ Handler tipado para los inputs
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProv(prev => ({ ...prev, [name]: value }));
  };

  // 4️⃣ Submit tipado del form
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setSaving(true);
      await apiClient.put(`/proveedor/${id}`, {
        rut:          prov.rut,
        razon_social: prov.razon_social,
        giro:         prov.giro,
      });
      toast.success("Proveedor actualizado con éxito.");
      router.push("/home/proveedores");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Error al actualizar.");
    } finally {
      setSaving(false);
    }
  };

  // 5️⃣ Guards de loading / error
  if (loading) return <p className={styles.loader}>Cargando proveedor…</p>;
  if (error)   return <p className={styles.error}>{error}</p>;

  // 6️⃣ Render del formulario con valores precargados desde `prov`
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Editar Proveedor</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="rut" className={styles.label}>RUT</label>
          <input
            id="rut"
            name="rut"
            type="text"
            className={styles.input}
            value={prov.rut}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="razon_social" className={styles.label}>Razón Social</label>
          <input
            id="razon_social"
            name="razon_social"
            type="text"
            className={styles.input}
            value={prov.razon_social}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="giro" className={styles.label}>Giro</label>
          <input
            id="giro"
            name="giro"
            type="text"
            className={styles.input}
            value={prov.giro || ""}
            onChange={handleChange}
          />
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => router.push("/home/proveedores")}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={saving}
          >
            {saving ? "Guardando…" : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
