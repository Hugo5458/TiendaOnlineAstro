// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // ⚠️  Change this to your real production domain before deploying
  site: 'https://yoowww00g84ok88ww4os08o0.victoriafp.online',
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  security: {
    checkOrigin: false
  },
  integrations: [
    react(),
    tailwind(),
    sitemap({
      // Pages to exclude from the sitemap
      filter: (page) =>
        !page.includes('/admin') &&
        !page.includes('/api/') &&
        !page.includes('/auth/') &&
        !page.includes('/completar-perfil'),
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
  ],
  server: {
    port: 4321,
    host: true
  }
});
