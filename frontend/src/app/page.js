import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirige al usuario a la página de login cuando acceden a la raíz.
  // Next.js maneja esto en el servidor, por lo que la redirección es
  // casi instantánea y el usuario no llega a ver una página en blanco.
  redirect('/login');

  // No es necesario retornar JSX aquí porque redirect() interrumpe el
  // proceso de renderizado. Retornar null es una buena práctica.
  return null;
}
