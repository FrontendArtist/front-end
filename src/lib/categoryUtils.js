import { formatSingleImage } from './strapiUtils';
import { formatStrapiProduct } from './productUtils';

/**
 * ✅ Formatter برای داده‌های Strapi Categories
 */
export function formatStrapiCategories(data = []) {
  if (!Array.isArray(data)) return [];

  return data.map((item) => {
    const base = item?.attributes || item; 

    return {
      id: item.id,
      name: base.name || '',
      slug: base.slug || '',
      image: formatSingleImage(base.image),

      subCategories:
        base.subCategories?.data?.map((sub) => {
          const sBase = sub?.attributes || sub;

          return {
            id: sub.id,
            name: sBase.name || '',
            slug: sBase.slug || '',
            image: formatSingleImage(sBase.image),
            products:
              sBase.products?.data?.map(formatStrapiProduct) ||
              sBase.products?.map(formatStrapiProduct) ||
              [],
          };
        }) ||
        base.subCategories?.map((sub) => {
          return {
            id: sub.id,
            name: sub.name || '',
            slug: sub.slug || '',
            image: formatSingleImage(sub.image),
            products: sub.products?.map(formatStrapiProduct) || [],
          };
        }) ||
        [],

      products:
        base.products?.data?.map(formatStrapiProduct) ||
        base.products?.map(formatStrapiProduct) ||
        [],
    };
  });
}
