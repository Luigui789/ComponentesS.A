// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  adapter: vercel(),
  security: {
    checkOrigin: false, // El formulario de contacto es nuestro propio dominio
  },
  vite: {
    plugins: [tailwindcss()]
  }
});