// frontend/lib/api.js

import axios from 'axios';
import { getFirebaseAuth  } from './firebase'; // Importamos la función que crea la instancia de auth

const baseURL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';

// Creamos una instancia de Axios con configuración base
const apiClient = axios.create({
  // Usamos la URL base ya normalizada (sin slash final)
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- La Magia de los Interceptores ---
// Un interceptor es una función que se ejecuta ANTES de que cada petición sea enviada.
// Lo usaremos para añadir el token de autenticación a cada llamada.
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Obtenemos la instancia de auth en tiempo de ejecución (evita problemas en SSR)
      const auth = getFirebaseAuth();
      const user = auth?.currentUser;

      if (user) {
        // Si hay un usuario logueado, obtenemos su ID Token
        const token = await user.getIdToken();
        // Añadimos el token al encabezado de la petición
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // No rompemos la petición por errores al leer el token
      console.warn('No se pudo anexar token al request:', e.message || e);
    }

    return config;
  },
  (error) => {
    // Manejo de errores
    return Promise.reject(error);
  }
);

export default apiClient;
