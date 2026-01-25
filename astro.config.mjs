// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
// import cookieconsent from '@jop-software/astro-cookieconsent';   ← commente ou supprime

export default defineConfig({
  integrations: [
    // cookieconsent({ ... }),   ← commente ou supprime cette ligne
  ]
});