// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: netlify({
    devFeatures: false,
  }),
  site: process.env.SITE_URL ?? process.env.URL ?? 'http://localhost:4321',
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
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Playfair Display',
      cssVariable: '--font-playfair-display',
      fallbacks: ['Georgia', 'serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Outfit',
      cssVariable: '--font-outfit-sans',
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Instrument Serif',
      cssVariable: '--font-instrument-serif',
      weights: [400],
      styles: ['normal', 'italic'],
      fallbacks: ['Georgia', 'serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains-mono',
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    optimizeDeps: {
      exclude: ['ffmpeg-static', 'shiki', 'jsdom', 'dompurify'],
      include: ['react', 'react-dom', 'lucide-react', 'motion/react'],
    },
    server: {
      watch: {
        usePolling: true,
        ignored: ['**/.netlify/**', '**/.astro/**', '**/dist/**'],
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
