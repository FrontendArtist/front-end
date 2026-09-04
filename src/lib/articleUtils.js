import { formatSingleImage } from './strapiUtils';
import { strapiBlocksToHtml } from './htmlUtils';

/**
 * Formats your specific Strapi API response for ARTICLES.
 */
export function formatStrapiArticles(apiResponse) {
  if (!apiResponse || !apiResponse.data) return [];

  return apiResponse.data
    .filter(item => item && item.title)
    .map(item => {
      let rawContent = item.content;
      if (Array.isArray(rawContent) || (rawContent && typeof rawContent === 'object')) {
        rawContent = strapiBlocksToHtml(rawContent);
      }

      const rawCats =
        item.articles_categories?.data || item.articles_categories ||
        item.attributes?.articles_categories?.data || item.attributes?.articles_categories ||
        item.categories?.data || item.categories ||
        item.attributes?.categories?.data || item.attributes?.categories ||
        item.category?.data || item.category || [];

      const catList = (Array.isArray(rawCats) ? rawCats : [rawCats]).filter(Boolean);
      const categories = catList.map(c => {
        const cAttrs = c.attributes || c;
        return {
          id: c.id,
          documentId: c.documentId || String(c.id || ''),
          name: cAttrs.name || cAttrs.title || '',
          slug: cAttrs.slug || '',
        };
      }).filter(c => c.name || c.slug);

      let rawTags =
        item.tags?.data || item.tags ||
        item.attributes?.tags?.data || item.attributes?.tags || [];
      if (typeof rawTags === 'string') {
        rawTags = rawTags.split(',').map(s => s.trim()).filter(Boolean);
      }
      const tagList = (Array.isArray(rawTags) ? rawTags : [rawTags]).filter(Boolean);
      const tags = tagList.map(t => {
        if (typeof t === 'string') {
          return { name: t, slug: t };
        }
        const tAttrs = t.attributes || t;
        return {
          id: t.id,
          name: tAttrs.name || tAttrs.title || tAttrs.slug || '',
          slug: tAttrs.slug || tAttrs.name || tAttrs.title || '',
        };
      }).filter(t => t.name || t.slug);

      const publishedAt = item.publishedAt || item.attributes?.publishedAt || null;
      const createdAt = item.createdAt || item.attributes?.createdAt || null;
      const updatedAt = item.updatedAt || item.attributes?.updatedAt || null;

      return {
        id: item.id,
        documentId: item.documentId,
        slug: item.slug,
        title: item.title,
        excerpt: item.excerpt,
        content: rawContent || '', 
        date: publishedAt || createdAt || updatedAt,
        createdAt: createdAt || publishedAt,
        updatedAt: updatedAt || createdAt,
        publishedAt: publishedAt || createdAt,
        actualPublishedAt: publishedAt,
        category: categories[0] || null,
        categories,
        tags,
        enable_cta: item.enable_cta !== undefined ? Boolean(item.enable_cta) : (item.attributes?.enable_cta !== undefined ? Boolean(item.attributes.enable_cta) : true),
        featured_course: item.featured_course?.data ? (item.featured_course.data.attributes || item.featured_course.data) : (item.featured_course || null),
        featured_product: item.featured_product?.data ? (item.featured_product.data.attributes || item.featured_product.data) : (item.featured_product || null),
        cover: formatSingleImage(item.cover),
      };
    });
}
