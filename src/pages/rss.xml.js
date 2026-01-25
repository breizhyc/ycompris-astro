import rss, { pagesGlobToRssItems } from '@astrojs/rss';

export async function GET(context) {
  return rss({
    // Title et description du flux (adapte si tu veux)
    title: 'Ycompris - Actualités et ressources',
    description: 'Les dernières publications de Ycompris sur l\'ESG, la méthode, les ressources...',

    // Le fix clé : site depuis context (Astro le remplit depuis astro.config.mjs)
    site: context.site,

    // Items du blog : utilise glob pour auto-détecter tes posts MD/MDX
    // Adapte le chemin si tes posts ne sont pas dans src/content/blog/
    items: await pagesGlobToRssItems(
      import.meta.glob('./blog/*.{md,mdx}')  // ou '../content/blog/*.{md,mdx}' si dans content/
    ),

    // Optionnel : langue, custom XML data
    customData: `<language>fr-FR</language>`,
  });
}