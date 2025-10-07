/**
 * Formats a single image object from the user's specific Strapi response.
 * @param {Array} imagesArray - The 'images' array from the API.
 * @returns {{url: string, alt: string}} - A formatted image object.
 */
function formatUserImage(imagesArray) {
  const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
  
  // Check if the array exists and has at least one image
  if (!imagesArray || imagesArray.length === 0) {
    return { 
      url: 'https://picsum.photos/seed/placeholder/400/300', 
      alt: 'Placeholder Image' 
    };
  }

  // Use the first image from the array
  const firstImage = imagesArray[0];
  const imageUrl = firstImage.url.startsWith('http') ? firstImage.url : `${STRAPI_API_URL}${firstImage.url}`;

  return {
    url: imageUrl,
    alt: firstImage.alternativeText || '',
  };
}

/**
 * Formats the user's specific Strapi API response into a clean array of product objects.
 * @param {object} apiResponse - The raw response from the user's Strapi endpoint.
 * @returns {Array<object>} - A clean array of product objects.
 */
export function formatStrapiProducts(apiResponse) {
  if (!apiResponse || !apiResponse.data) return [];

  return apiResponse.data
    // Filter out any items that might be null
    .filter(item => item) 
    // Map over the valid items to create our clean product objects
    .map(item => {
      // The price from the API is a number, but our component expects an object.
      const priceObject = { toman: item.price || 0 };

      // The description from the API is a rich text array. We'll take the first paragraph.
      const shortDescription = (item.description && item.description[0]?.children[0]?.text) || '';

      return {
        id: item.id,
        title: item.title,
        slug: item.slug,
        price: priceObject, // Format the price
        shortDescription: shortDescription, // Extract the description text
        image: formatUserImage(item.images), // Use the new helper for the image
      };
    });
}