/**
 * @file src/lib/strapiUtils.js
 * @description تبدیلکننده‌های دادهی Strapi به فرمت مورد نیاز فرانت‌اند
 *
 * توجه: منطق تبدیل HTML به فایل جداگانه htmlUtils.js منتقل شده
 * و سایر formatter ها به Utils اختصاصی دامنه خودشان برای رعایت SRP منتقل شده‌اند.
 *
 * این فایل جهت backward compatibility نگه داشته شده است.
 *
 * @module lib/strapiUtils
 */

import { API_BASE_URL } from './api';

// --- Re-exports برای backward compatibility ---
export { strapiBlocksToHtml } from './htmlUtils';
export { formatStrapiProducts, formatStrapiProduct } from './productUtils';
export { formatStrapiArticles } from './articleUtils';
export { formatStrapiCourses } from './courseUtils';
export { formatStrapiCategories } from './categoryUtils';

/**
 * A generic helper to format a single image object.
 * Handles both flat and nested image structures from Strapi.
 * @param {object} imgData - A single image object from your Strapi API (flat or nested).
 * @returns {{url: string, alt: string}}
 */
export function formatSingleImage(imgData) {
  if (!imgData) {
    return { url: '/images/forempties2.png', alt: 'Placeholder Image' };
  }

  // Handle nested structure: { data: { url: '...', alternativeText: '...' } }
  if (imgData.data && typeof imgData.data === 'object') {
    const dataObj = imgData.data;
    if (!dataObj.url) {
      return { url: '/images/forempties2.png', alt: 'Placeholder Image' };
    }
    const imageUrl = dataObj.url.startsWith('http') ? dataObj.url : `${API_BASE_URL}${dataObj.url}`;
    return {
      url: imageUrl,
      alt: dataObj.alternativeText || '',
    };
  }

  // Handle flat structure: { url: '...', alternativeText: '...' }
  if (!imgData.url) {
    return { url: '/images/forempties2.png', alt: 'Placeholder Image' };
  }
  const imageUrl = imgData.url.startsWith('http') ? imgData.url : `${API_BASE_URL}${imgData.url}`;
  return {
    url: imageUrl,
    alt: imgData.alternativeText || '',
  };
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
