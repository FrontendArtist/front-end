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