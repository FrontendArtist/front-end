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
import { strapiBlocksToHtml } from './htmlUtils';

// --- Re-exports برای backward compatibility ---
export { strapiBlocksToHtml } from './htmlUtils';
export { formatStrapiProducts, formatStrapiProduct } from './productUtils';
export { formatStrapiArticles } from './articleUtils';
export { formatStrapiCourses } from './courseUtils';
export { formatStrapiCategories } from './categoryUtils';

export function formatSingleImage(imgData) {
  if (!imgData) {
    return { url: '/images/forempties2.png', alt: 'Placeholder Image' };
  }

  // Handle direct string input
  if (typeof imgData === 'string') {
    const trimmed = imgData.trim();
    if (!trimmed) return { url: '/images/forempties2.png', alt: 'Placeholder Image' };
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/images/')) {
      return { url: trimmed, alt: '' };
    }
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return { url: `${API_BASE_URL}${cleanPath}`, alt: '' };
  }

  // Unwrap nested Strapi structures ({ data: ... })
  let target = imgData;
  if (target.data) {
    if (Array.isArray(target.data)) {
      target = target.data[0] || {};
    } else if (typeof target.data === 'object' && target.data !== null) {
      target = target.data;
    }
  }

  const attrs = target.attributes || target;
  let rawUrl =
    attrs.url ||
    attrs.formats?.large?.url ||
    attrs.formats?.medium?.url ||
    attrs.formats?.small?.url ||
    attrs.formats?.thumbnail?.url ||
    null;

  if (!rawUrl && typeof attrs === 'string') {
    rawUrl = attrs;
  }

  const alt =
    attrs.alternativeText ||
    attrs.alt ||
    attrs.name ||
    attrs.caption ||
    imgData.alt ||
    imgData.title ||
    '';

  if (!rawUrl) {
    return { url: '/images/forempties2.png', alt: alt || 'Placeholder Image' };
  }

  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('/images/')) {
    return { url: rawUrl, alt };
  }

  const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  return {
    url: `${API_BASE_URL}${cleanPath}`,
    alt,
  };
}

/**
 * Formats your specific Strapi API response for SERVICES.
 */
export function formatStrapiServices(apiResponse) {
  if (!apiResponse || !apiResponse.data) return [];

  return apiResponse.data
    .filter(item => item && item.title)
    .map(item => {
      let rawContent = item.content;
      if (Array.isArray(rawContent) || (rawContent && typeof rawContent === 'object')) {
        rawContent = strapiBlocksToHtml(rawContent);
      }

      let description = '';
      if (typeof item.description === 'string') {
        description = item.description;
      } else if (item.description && item.description[0]?.children[0]?.text) {
        description = item.description[0].children[0].text;
      } else if (item.shortDescription) {
        description = item.shortDescription;
      }

      return {
        id: item.id,
        documentId: item.documentId || String(item.id || ''),
        slug: item.slug,
        title: item.title,
        description,
        content: rawContent || (item.content ? String(item.content) : null),
        // Services have a single 'image' object
        image: formatSingleImage(item.image),
        link: item.link || null,
      };
    });
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
