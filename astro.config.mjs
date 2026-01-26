// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
// import cookieconsent from '@jop-software/astro-cookieconsent';   ← commente ou supprime

export default defineConfig({
  site: 'https://ycompris.com',

  integrations: [
    mdx(),
    sitemap({
      // Options facultatives, tu peux laisser par défaut ou personnaliser
      // changefreq: 'weekly',
      // priority: 0.7,
      // lastmod: new Date(),
      // filter: (page) => !page.includes('/merci'), // exemple pour exclure certaines pages
    }),
  ],

  // Si tu veux d'autres configs plus tard (ex. trailingSlash, build, etc.)
  // trailingSlash: 'never',   // ou 'always' ou 'ignore'
});