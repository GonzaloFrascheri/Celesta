// app/home/clientes/editar/[id]/page.tsx
"use client";

import React, {
  useState,
  useEffect,
  ChangeEvent,
  FormEvent
} from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import apiClient from "../../../../../../lib/api";  // Ajusta la ruta si tu carpeta lib está en otro nivel
import styles from "./Editar.module.css";

interface Cliente {
  nombre: string;
  rut: string;
  email: string;
  telefono: string;
}

export default function EditarClientePage() {
  const router = useRouter();
  const { id } = useParams();

  const [cliente, setCliente] = useState<Cliente>({
    nombre: "",
    rut: "",
    email: "",
    telefono: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string>("");

  // 1️⃣ Carga inicial de datos
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/clientes/${id}`);
        if (res.data.success) {
          setCliente(res.data.data);
        } else {
          setError("Cliente no encontrado.");
        }
      } catch (e) {
        console.error(e);
        setError("Error al cargar datos.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // 2️⃣ Manejador de cambios en inputs
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCliente({
      ...cliente,
      [e.target.name]: e.target.value,
    });
  };

  // 3️⃣ Manejador de envío del formulario
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setLoading(true);
      await apiClient.put(`/clientes/${id}`, cliente);
      toast.success("Cliente actualizado con éxito.");
      router.push("/home/clientes");
    } catch (err) {
      console.error(err);
      toast.error("Error al actualizar el cliente.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className={styles.loader}>Cargando cliente…</div>;
  if (error)   return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Editar Cliente</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="nombre" className={styles.label}>
            Nombre / Razón Social
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            className={styles.input}
            value={cliente.nombre}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="rut" className={styles.label}>
            RUT
          </label>
          <input
            id="rut"
            name="rut"
            type="text"
            className={styles.input}
            value={cliente.rut}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={styles.input}
            value={cliente.email}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="telefono" className={styles.label}>
            Teléfono
          </label>
          <input
            id="telefono"
            name="telefono"
            type="text"
            className={styles.input}
            value={cliente.telefono}
            onChange={handleChange}
          />
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => router.push("/home/clientes")}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? "Guardando…" : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
