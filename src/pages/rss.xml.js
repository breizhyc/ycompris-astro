import rss, { pagesGlobToRssItems } from '@astrojs/rss';

export async function GET(context) {
  return rss({
    title: 'Ycompris',  // Ou SITE_TITLE de consts.ts si tu l'as
    description: 'Flux RSS des actualités et articles de Ycompris',
    site: context.site,  // ← Clé : utilise context.site (injecté par Astro depuis astro.config.mjs)
    items: await pagesGlobToRssItems(
      import.meta.glob('./blog/*.{md,mdx}')  // Adapte si tes posts sont ailleurs (ex. ./blog/**/*.mdx)
    ),
    // Optionnel : customData: `<language>fr-FR</language>`,
  });
}