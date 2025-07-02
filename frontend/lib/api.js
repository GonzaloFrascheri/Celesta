// frontend/lib/api.js

import axios from 'axios';
import { getFirebaseAuth  } from './firebase'; // Importamos la instancia de auth de Firebase

const auth = getFirebaseAuth();

const baseURL = process.env.NEXT_PUBLIC_API_URL
  ?.replace(/\/$/, '')

// Creamos una instancia de Axios con configuración base
const apiClient = axios.create({
  // Leemos la URL base de nuestro backend desde las variables de entorno
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- La Magia de los Interceptores ---
// Un interceptor es una función que se ejecuta ANTES de que cada petición sea enviada.
// Lo usaremos para añadir el token de autenticación a cada llamada.
apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;

    if (user) {
      // Si hay un usuario logueado, obtenemos su ID Token
      const token = await user.getIdToken();
      // Añadimos el token al encabezado de la petición
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Manejo de errores
    return Promise.reject(error);
  }
);

export default apiClient;