import { formatSingleImage } from './strapiUtils';

/**
 * Formats your specific Strapi API response for PRODUCTS.
 */
export function formatStrapiProducts(apiResponse) {
  if (!apiResponse || !apiResponse.data) return [];

  const rawList = Array.isArray(apiResponse.data)
    ? apiResponse.data
    : [apiResponse.data];

  return rawList
    .filter(item => item && (item.title || item.attributes?.title))
    .map(item => {
      const attrs = item.attributes || item;
      const priceVal = typeof attrs.price === 'object' ? attrs.price?.toman || 0 : (attrs.price || 0);

      const shortDescription =
        attrs.shortDescription ||
        (attrs.description && attrs.description[0]?.children?.[0]?.text) ||
        attrs.excerpt ||
        '';

      const content = attrs.content || null;
      const specifications = Array.isArray(attrs.specifications) ? attrs.specifications : [];
      const stock = typeof attrs.stock === 'number' ? attrs.stock : 0;
      const isAvailable = attrs.isAvailable !== false; 

      const rawImage = attrs.image || (attrs.images && (attrs.images[0] || attrs.images.data?.[0])) || attrs.cover || null;
      const images = (attrs.images || []).map(img => formatSingleImage(img));
      const mainImage = formatSingleImage(rawImage || (images.length > 0 ? images[0] : null));

      const categories = (attrs.categories || []).map(cat => {
        const categoryData = cat.data ? cat.data : cat;
        const categoryAttrs = categoryData.attributes || categoryData;

        let parentData = null;
        if (categoryAttrs.parent && categoryAttrs.parent.slug) {
          const pAttrs = categoryAttrs.parent.attributes || categoryAttrs.parent;
          parentData = { slug: pAttrs.slug, name: pAttrs.name };
        } else if (categoryAttrs.parent?.data) {
          const parentContent = categoryAttrs.parent.data;
          const parentAttrs = parentContent.attributes || parentContent;
          parentData = { slug: parentAttrs.slug, name: parentAttrs.name };
        }

        return {
          slug: categoryAttrs.slug,
          name: categoryAttrs.name,
          parent: parentData
        };
      });

      let discountPercent = Number(attrs.discountPercent || 0);
      const discountUntil = attrs.discountUntil || null;

      // اگر تاریخ انقضای تخفیف گذشته باشد، تخفیف غیرفعال می‌شود
      if (discountUntil && new Date(discountUntil).getTime() <= Date.now()) {
        discountPercent = 0;
      }

      const originalPrice = priceVal;
      const discountPrice = discountPercent > 0 ? Math.round(originalPrice * (1 - discountPercent / 100)) : null;
      const finalPrice = discountPrice !== null ? discountPrice : originalPrice;
      const priceObject = { toman: finalPrice, original: originalPrice };

      return {
        id: item.id,
        documentId: item.documentId || String(item.id || ''),
        title: attrs.title || '',
        slug: attrs.slug || '',
        price: priceObject,
        originalPrice: originalPrice,
        discountPercent: discountPercent,
        discountPrice: discountPrice,
        discountUntil: discountUntil,
        shortDescription: shortDescription,
        content: content,
        specifications: specifications,
        stock: stock,
        isAvailable: isAvailable,
        images: images,
        image: mainImage,
        categories: categories,
      };
    });
}

/**
 * @private فرمت خلاصه محصول برای embed در داده‌های categories
 */
export function formatStrapiProduct(product) {
  const attr = product.attributes || product || {};
  const img = attr.images?.data?.[0]
    ? formatSingleImage(attr.images.data[0])
    : { url: '/images/placeholder.png' };

  let discountPercent = Number(attr.discountPercent || 0);
  const discountUntil = attr.discountUntil || null;
  if (discountUntil && new Date(discountUntil).getTime() <= Date.now()) {
    discountPercent = 0;
  }
  const originalPrice = typeof attr.price === 'object' ? attr.price?.toman || 0 : (attr.price || 0);
  const discountPrice = discountPercent > 0 ? Math.round(originalPrice * (1 - discountPercent / 100)) : null;
  const finalPrice = discountPrice !== null ? discountPrice : originalPrice;

  return {
    id: product.id,
    title: attr.title,
    slug: attr.slug,
    price: { toman: finalPrice, original: originalPrice },
    originalPrice,
    discountPercent,
    discountPrice,
    discountUntil,
    image: img.url,
  };
}
