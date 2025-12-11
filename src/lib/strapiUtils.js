// This is the definitive version of the data formatting utility file,
// tailored to your specific flat Strapi API structure.

import { API_BASE_URL } from './api';

/**
 * A generic helper to format a single image object.
 * Handles both flat and nested image structures from Strapi.
 * @param {object} imgData - A single image object from your Strapi API (flat or nested).
 * @returns {{url: string, alt: string}}
 */
export function formatSingleImage(imgData) {
  if (!imgData) {
    return { url: 'https://picsum.photos/seed/placeholder/400/300', alt: 'Placeholder Image' };
  }

  // Handle nested structure: { data: { url: '...', alternativeText: '...' } }
  if (imgData.data && typeof imgData.data === 'object') {
    const dataObj = imgData.data;
    if (!dataObj.url) {
      return { url: 'https://picsum.photos/seed/placeholder/400/300', alt: 'Placeholder Image' };
    }
    const imageUrl = dataObj.url.startsWith('http') ? dataObj.url : `${API_BASE_URL}${dataObj.url}`;
    return {
      url: imageUrl,
      alt: dataObj.alternativeText || '',
    };
  }

  // Handle flat structure: { url: '...', alternativeText: '...' }
  if (!imgData.url) {
    return { url: 'https://picsum.photos/seed/placeholder/400/300', alt: 'Placeholder Image' };
  }
  const imageUrl = imgData.url.startsWith('http') ? imgData.url : `${API_BASE_URL}${imgData.url}`;
  return {
    url: imageUrl,
    alt: imgData.alternativeText || '',
  };
}
/**
 * Formats your specific Strapi API response for PRODUCTS.
 */
export function formatStrapiProducts(apiResponse) {
  if (!apiResponse || !apiResponse.data) return [];

  return apiResponse.data
    .filter(item => item && item.title)
    .map(item => {
      const priceObject = { toman: item.price || 0 };
      const shortDescription = (item.description && item.description[0]?.children[0]?.text) || '';

      // Create a clean array of all images for the product
      const images = (item.images || []).map(img => formatSingleImage(img));

      // ✅ FIX: Robust category parent extraction
      const categories = (item.categories || []).map(cat => {
        // Handle both "attributes" wrapper and direct object
        const categoryData = cat.data ? cat.data : cat;
        const categoryAttrs = categoryData.attributes || categoryData;

        let parentData = null;

        // Case 1: Direct parent object (Your JSON structure)
        if (categoryAttrs.parent && categoryAttrs.parent.slug) {
          const pAttrs = categoryAttrs.parent.attributes || categoryAttrs.parent;
          parentData = {
            slug: pAttrs.slug,
            name: pAttrs.name
          };
        }
        // Case 2: Nested "data" wrapper (Old Strapi/Populate structure)
        else if (categoryAttrs.parent?.data) {
          const parentContent = categoryAttrs.parent.data;
          const parentAttrs = parentContent.attributes || parentContent;
          parentData = {
            slug: parentAttrs.slug,
            name: parentAttrs.name
          };
        }

        return {
          slug: categoryAttrs.slug,
          name: categoryAttrs.name,
          parent: parentData // Now correctly populated
        };
      });

      return {
        id: item.id,
        documentId: item.documentId, // ← اضافه شده برای سیستم کامنت‌ها
        title: item.title,
        slug: item.slug,
        price: priceObject,
        shortDescription: shortDescription,
        // Return both the full array and a single thumbnail
        images: images,
        image: images.length > 0 ? images[0] : formatSingleImage(null),
        categories: categories, // Correctly structured for ProductCard
      };
    });
}
/**
 * Formats your specific Strapi API response for ARTICLES.
 */
export function formatStrapiArticles(apiResponse) {
  if (!apiResponse || !apiResponse.data) return [];

  return apiResponse.data
    .filter(item => item && item.title)
    .map(item => ({
      id: item.id,
      documentId: item.documentId, // ← اضافه شده برای سیستم کامنت‌ها
      slug: item.slug,
      title: item.title,
      excerpt: item.excerpt,
      date: item.publishedAt,
      // Articles have a single 'cover' object.
      cover: formatSingleImage(item.cover),
    }));
}

/**
 * Formats your specific Strapi API response for COURSES.
 */
export function formatStrapiCourses(apiResponse) {
  if (!apiResponse || !apiResponse.data) return [];

  return apiResponse.data
    .filter(item => item && item.title)
    .map(item => ({
      id: item.id,
      documentId: item.documentId, // ← اضافه شده برای سیستم کامنت‌ها
      slug: item.slug,
      title: item.title,
      price: { toman: item.price || 0 },
      shortDescription: (item.description && item.description[0]?.children[0]?.text) || '',
      // Courses have a 'media' array, we take the first one.
      image: formatSingleImage(item.media ? item.media[0] : null),
    }));
}

/**
 * Formats your specific Strapi API response for SERVICES.
 */
export function formatStrapiServices(apiResponse) {
  if (!apiResponse || !apiResponse.data) return [];

  return apiResponse.data
    .filter(item => item && item.title)
    .map(item => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      description: (item.description && item.description[0]?.children[0]?.text) || '',
      // Services have a single 'image' object
      image: formatSingleImage(item.image),
      link: item.link || null,
    }));
}

/**
 * تاریخ را به فرمت فارسی تبدیل می‌کند
 * @param {string} isoDate - تاریخ به فرمت ISO
 * @returns {string} تاریخ فارسی شده
 */
function formatPersianDate(isoDate) {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return new Intl.DateTimeFormat('fa-IR', options).format(date);
}

/**
 * Formats your specific Strapi API response for TESTIMONIALS.
 */
export function formatStrapiTestimonials(apiResponse) {
  if (!apiResponse || !apiResponse.data) return [];

  return apiResponse.data
    .filter(item => item && item.name && item.comment)
    .map(item => ({
      id: item.id,
      documentId: item.documentId,
      name: item.name,
      title: item.title || null,
      comment: item.comment,
      createdAt: item.createdAt || item.publishedAt || null,
      formattedDate: formatPersianDate(item.createdAt || item.publishedAt),
    }));
}

/**
 * Formats your specific Strapi API response for FAQs.
 * Maps Strapi FAQ fields to the format expected by the Accordion component.
 */
export function formatStrapiFaqs(apiResponse) {
  // Handle both formats: direct array or { data: [...] }
  const dataArray = Array.isArray(apiResponse) ? apiResponse : apiResponse?.data;

  if (!dataArray || !Array.isArray(dataArray)) return [];

  return dataArray
    .filter(item => item && item.question && item.answer)
    .map(item => ({
      id: item.id,
      title: item.question,    // Maps to Accordion's 'title' prop
      content: item.answer,    // Maps to Accordion's 'content' prop
    }));
}

/**
 * ✅ Formatter برای محصولات
 */
function formatStrapiProduct(product) {
  const attr = product.attributes || {};
  const img = attr.images?.data?.[0]
    ? formatSingleImage(attr.images.data[0])
    : { url: '/images/placeholder.png' };

  return {
    id: product.id,
    title: attr.title,
    slug: attr.slug,
    price: attr.price,
    image: img.url,
  };
}

/**
 * ✅ Formatter برای داده‌های Strapi Categories
 */
export function formatStrapiCategories(data = []) {
  if (!Array.isArray(data)) return [];

  return data.map((item) => {
    const base = item?.attributes || item; // ← اضافه شد

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
