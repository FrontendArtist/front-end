// This is the definitive version of the data formatting utility file,
// tailored to your specific flat Strapi API structure.

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';

/**
 * A generic helper to format a single image object.
 * @param {object} imgData - A single, flat image object from your Strapi API.
 * @returns {{url: string, alt: string}}
 */
function formatSingleImage(imgData) {
  if (!imgData || !imgData.url) {
    return { url: 'https://picsum.photos/seed/placeholder/400/300', alt: 'Placeholder Image' };
  }
  const imageUrl = imgData.url.startsWith('http') ? imgData.url : `${STRAPI_API_URL}${imgData.url}`;
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

      return {
        id: item.id,
        title: item.title,
        slug: item.slug,
        price: priceObject,
        shortDescription: shortDescription,
        // Return both the full array and a single thumbnail
        images: images, // The full array for the gallery
        image: images.length > 0 ? images[0] : formatSingleImage(null), // The first image for card views
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
 * Formats your specific Strapi API response for TESTIMONIALS.
 */
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
 * Formats your specific Strapi API response for CATEGORIES.
 * Maps Strapi category fields to the format expected by CategoryCard component.
 */
export function formatStrapiCategories(apiResponse) {
  if (!apiResponse || !apiResponse.data) return [];

  return apiResponse.data
    .filter(item => item && item.text && item.slug)
    .map(item => ({
      id: item.id,
      slug: item.slug,
      name: item.text, // Maps Strapi 'text' field to CategoryCard's 'name' prop
      icon: formatSingleImage(item.image).url, // Maps Strapi 'image' to CategoryCard's 'icon' prop (extract URL string)
    }));
}