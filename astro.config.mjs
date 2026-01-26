// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
// import cookieconsent from '@jop-software/astro-cookieconsent';   ← commente ou supprime

export default defineConfig({
  trailingSlash: 'always',
  site: 'https://ycompris.com',  // ← ton domaine FINAL (même si c'est pour preview, mets le vrai)
  // ou pour tester : site: 'https://neon-raindrop-439912.netlify.app',  // l'URL preview Netlify (change après si besoin)
  // ... tes autres configs (integrations, etc.)
});