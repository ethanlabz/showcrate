// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: netlify(),
  site: process.env.SITE_URL ?? 'http://localhost:4321',
  integrations: [
    react(),
    sitemap({
      filter: (page) => {
        try {
          const path = new URL(page).pathname;
          return (
            !path.startsWith('/dashboard') &&
            !path.startsWith('/editor') &&
            !path.startsWith('/auth') &&
            !path.startsWith('/admin')
          );
        } catch {
          return (
            !page.includes('/dashboard') &&
            !page.includes('/editor') &&
            !page.includes('/auth') &&
            !page.includes('/admin')
          );
        }
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  },
  // Security: never bundle server-only modules into client
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
});
