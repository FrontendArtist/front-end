/**
 * =============================================================================
 * STRAPI UTILITIES - Core API Communication & Data Formatting
 * =============================================================================
 * 
 * Purpose:
 * This is the single source of truth for all Strapi v5 API communication.
 * It handles URL construction, fetch operations, error handling, and data formatting.
 * 
 * Architecture:
 * - Mandated by ARCHITECTURE_RULES.md as the only place to use fetch() for Strapi
 * - All API calls must go through fetchStrapiAPI()
 * - All data formatting happens through the format* functions
 * 
 * Environment Variables:
 * - NEXT_PUBLIC_STRAPI_API_URL: Base URL for the Strapi backend (e.g., http://localhost:1337)
 */

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';

/**
 * =============================================================================
 * CORE API FUNCTIONS
 * =============================================================================
 */

/**
 * Get the full Strapi URL by combining the base URL with a path
 * 
 * Purpose:
 * - Constructs absolute URLs for Strapi API endpoints
 * - Ensures consistent URL formatting across the application
 * - Centralizes the base URL configuration
 * 
 * @param {string} path - The path to append to the base URL (e.g., "/api/services")
 * @returns {string} The complete URL (e.g., "http://localhost:1337/api/services")
 * 
 * Examples:
 * - getStrapiURL() -> "http://localhost:1337"
 * - getStrapiURL("/api/services") -> "http://localhost:1337/api/services"
 * - getStrapiURL("/uploads/image.jpg") -> "http://localhost:1337/uploads/image.jpg"
 */
export function getStrapiURL(path = "") {
  // Remove leading slash from path if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Combine base URL with path, handling empty path case
  return path ? `${STRAPI_API_URL}${cleanPath}` : STRAPI_API_URL;
}

/**
 * Fetch data from the Strapi API with proper error handling
 * 
 * Purpose:
 * - Primary function for all Strapi API communication
 * - Handles query parameter serialization
 * - Provides consistent error handling and response format
 * - Returns data in the standardized { data, error } format
 * 
 * Architecture:
 * This is the ONLY function that should directly call fetch() for Strapi.
 * All other API calls should use this function or higher-level wrappers.
 * 
 * @param {Object} config - Configuration object for the API call
 * @param {string} config.endpoint - API endpoint path (e.g., "/api/services")
 * @param {Object} config.params - Query parameters as key-value pairs (e.g., { populate: '*' })
 * @param {Object} config.options - Additional fetch options (e.g., { method: 'POST', body: {...} })
 * @returns {Promise<{data: Object|null, error: Object|null}>} Response in { data, error } format
 * 
 * Response Format:
 * - Success: { data: {...}, error: null }
 * - Failure: { data: null, error: { status: number, message: string } }
 * 
 * Examples:
 * ```js
 * // Fetch all services with full population
 * await fetchStrapiAPI({
 *   endpoint: '/api/services',
 *   params: { populate: '*' }
 * });
 * 
 * // Fetch a single service by slug
 * await fetchStrapiAPI({
 *   endpoint: '/api/services',
 *   params: {
 *     'filters[slug][$eq]': 'my-service',
 *     populate: '*'
 *   }
 * });
 * ```
 */
export async function fetchStrapiAPI({ endpoint, params = {}, options = {} }) {
  try {
    /**
     * STEP 1: Construct the base URL
     * Combine the Strapi base URL with the provided endpoint
     */
    const baseUrl = getStrapiURL(endpoint);
    
    /**
     * STEP 2: Build query string from params object
     * Convert params object to URLSearchParams for proper encoding
     * Example: { populate: '*', 'filters[slug][$eq]': 'test' }
     * Becomes: ?populate=*&filters[slug][$eq]=test
     */
    const queryString = new URLSearchParams(params).toString();
    
    /**
     * STEP 3: Combine base URL with query string
     * Only append '?' if there are query parameters
     */
    const fullUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    
    /**
     * STEP 4: Set default headers
     * Merge user-provided headers with defaults
     * Content-Type is standard for JSON APIs
     */
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };
    
    const fetchOptions = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    };
    
    /**
     * STEP 5: Perform the fetch request
     * This is the only place where we directly call fetch() for Strapi
     */
    const response = await fetch(fullUrl, fetchOptions);
    
    /**
     * STEP 6: Handle HTTP errors
     * Check if the response status indicates an error (4xx, 5xx)
     */
    if (!response.ok) {
      // Log the error for debugging purposes
      console.error(`Strapi API Error: ${response.status} ${response.statusText}`);
      console.error(`URL: ${fullUrl}`);
      
      // Return standardized error format
      return {
        data: null,
        error: {
          status: response.status,
          message: response.statusText || 'An error occurred while fetching data',
        },
      };
    }
    
    /**
     * STEP 7: Parse and return successful response
     * Parse the JSON response and return in standardized format
     */
    const jsonResponse = await response.json();
    
    return {
      data: jsonResponse,
      error: null,
    };
    
  } catch (error) {
    /**
     * STEP 8: Handle network errors or parsing errors
     * Catch any errors that occur during fetch or JSON parsing
     * (e.g., network failures, malformed JSON)
     */
    console.error('Strapi API Fetch Error:', error);
    
    return {
      data: null,
      error: {
        status: 500,
        message: error.message || 'Network error or failed to parse response',
      },
    };
  }
}

/**
 * =============================================================================
 * IMAGE FORMATTING UTILITIES
 * =============================================================================
 */

/**
 * Format a single image object from Strapi
 * 
 * Purpose:
 * - Converts raw Strapi image data into a consistent format
 * - Handles both absolute URLs (http/https) and relative paths
 * - Provides fallback placeholder when image is missing
 * - Extracts alternative text for accessibility
 * 
 * Strapi Image Structure:
 * Strapi returns image objects with properties like:
 * { url: '/uploads/image.jpg', alternativeText: 'Description', ... }
 * 
 * @param {Object} imgData - A single image object from Strapi API
 * @param {string} imgData.url - The image URL (relative or absolute)
 * @param {string} imgData.alternativeText - Alt text for accessibility
 * @returns {{url: string, alt: string}} Formatted image object
 * 
 * Examples:
 * - Input: { url: '/uploads/image.jpg', alternativeText: 'Product' }
 * - Output: { url: 'http://localhost:1337/uploads/image.jpg', alt: 'Product' }
 * 
 * - Input: null (missing image)
 * - Output: { url: 'https://picsum.photos/seed/placeholder/400/300', alt: 'Placeholder Image' }
 */
function formatSingleImage(imgData) {
  // Guard clause: Handle missing or invalid image data
  // Return a placeholder image for better UX when image is unavailable
  if (!imgData || !imgData.url) {
    return { 
      url: 'https://picsum.photos/seed/placeholder/400/300', 
      alt: 'Placeholder Image' 
    };
  }
  
  /**
   * Handle both absolute and relative URLs
   * - Absolute URLs (starting with http/https): Use as-is
   * - Relative URLs (starting with /): Prepend Strapi base URL
   */
  const imageUrl = imgData.url.startsWith('http') 
    ? imgData.url 
    : `${STRAPI_API_URL}${imgData.url}`;
  
  return {
    url: imageUrl,
    alt: imgData.alternativeText || '', // Fallback to empty string for accessibility
  };
}

/**
 * =============================================================================
 * DATA FORMATTERS - Domain-Specific Transformations
 * =============================================================================
 * 
 * These functions transform raw Strapi API responses into clean, consistent
 * data structures optimized for frontend consumption.
 * 
 * Common Pattern:
 * 1. Validate apiResponse has data array
 * 2. Filter out invalid items (missing required fields)
 * 3. Map each item to a clean object structure
 * 4. Extract nested data from Strapi's complex structures
 * 5. Format images using formatSingleImage()
 */

/**
 * Format Products data from Strapi API
 * 
 * Purpose:
 * - Transforms raw Strapi product responses into clean, frontend-ready objects
 * - Handles multiple images per product (for product galleries)
 * - Extracts price and description from Strapi's nested structures
 * 
 * Strapi Product Structure:
 * {
 *   id: number,
 *   title: string,
 *   slug: string,
 *   price: number,
 *   description: [{ type: 'paragraph', children: [{ text: '...' }] }],
 *   images: [{ url: '...', alternativeText: '...' }, ...]
 * }
 * 
 * Output Structure:
 * {
 *   id: number,
 *   title: string,
 *   slug: string,
 *   price: { toman: number },
 *   shortDescription: string,
 *   images: [{ url: string, alt: string }, ...],  // Full image array
 *   image: { url: string, alt: string }           // First image for cards
 * }
 * 
 * @param {Object} apiResponse - Raw Strapi API response
 * @param {Array} apiResponse.data - Array of product items
 * @returns {Array} Array of formatted product objects
 */
export function formatStrapiProducts(apiResponse) {
  // Guard clause: Return empty array if response is invalid
  if (!apiResponse || !apiResponse.data) return [];

  return apiResponse.data
    // Filter: Only process items with a title (required field)
    .filter(item => item && item.title)
    .map(item => {
      /**
       * Format price as object for potential multi-currency support
       * Currently only uses 'toman' but structure allows easy expansion
       */
      const priceObject = { toman: item.price || 0 };
      
      /**
       * Extract short description from Strapi's rich text structure
       * Strapi stores text in nested format:
       * description[0].children[0].text
       */
      const shortDescription = (item.description && item.description[0]?.children[0]?.text) || '';

      /**
       * Format all product images
       * Products can have multiple images for gallery/carousel display
       * Each image is processed through formatSingleImage() for consistency
       */
      const images = (item.images || []).map(img => formatSingleImage(img));

      return {
        id: item.id,
        title: item.title,
        slug: item.slug,                    // For routing to /products/[slug]
        price: priceObject,
        shortDescription: shortDescription,
        images: images,                     // Full array for ProductGallery component
        image: images.length > 0            // Single image for ProductCard component
          ? images[0]                       // Use first image if available
          : formatSingleImage(null),        // Use placeholder if no images
      };
    });
}
/**
 * Format Articles data from Strapi API
 * 
 * Purpose:
 * - Transforms raw Strapi article responses into clean, frontend-ready objects
 * - Handles single cover image per article
 * - Includes publication date for sorting and display
 * 
 * Strapi Article Structure:
 * {
 *   id: number,
 *   title: string,
 *   slug: string,
 *   excerpt: string,
 *   publishedAt: string (ISO date),
 *   cover: { url: '...', alternativeText: '...' }
 * }
 * 
 * Output Structure:
 * {
 *   id: number,
 *   slug: string,
 *   title: string,
 *   excerpt: string,
 *   date: string,
 *   cover: { url: string, alt: string }
 * }
 * 
 * @param {Object} apiResponse - Raw Strapi API response
 * @param {Array} apiResponse.data - Array of article items
 * @returns {Array} Array of formatted article objects
 */
export function formatStrapiArticles(apiResponse) {
  // Guard clause: Return empty array if response is invalid
  if (!apiResponse || !apiResponse.data) return [];

  return apiResponse.data
    // Filter: Only process items with a title (required field)
    .filter(item => item && item.title)
    .map(item => ({
      id: item.id,
      slug: item.slug,                      // For routing to /articles/[slug]
      title: item.title,
      excerpt: item.excerpt,                // Short preview text for ArticleCard
      date: item.publishedAt,               // ISO date string for display/sorting
      cover: formatSingleImage(item.cover), // Single cover image (not an array)
    }));
}

/**
 * Format Courses data from Strapi API
 * 
 * Purpose:
 * - Transforms raw Strapi course responses into clean, frontend-ready objects
 * - Handles media array (takes first image)
 * - Extracts price and description from nested structures
 * 
 * Strapi Course Structure:
 * {
 *   id: number,
 *   title: string,
 *   slug: string,
 *   price: number,
 *   description: [{ type: 'paragraph', children: [{ text: '...' }] }],
 *   media: [{ url: '...', alternativeText: '...' }, ...]
 * }
 * 
 * Output Structure:
 * {
 *   id: number,
 *   slug: string,
 *   title: string,
 *   price: { toman: number },
 *   shortDescription: string,
 *   image: { url: string, alt: string }
 * }
 * 
 * @param {Object} apiResponse - Raw Strapi API response
 * @param {Array} apiResponse.data - Array of course items
 * @returns {Array} Array of formatted course objects
 */
export function formatStrapiCourses(apiResponse) {
  // Guard clause: Return empty array if response is invalid
  if (!apiResponse || !apiResponse.data) return [];

  return apiResponse.data
    // Filter: Only process items with a title (required field)
    .filter(item => item && item.title)
    .map(item => ({
      id: item.id,
      slug: item.slug,                                                        // For routing to /courses/[slug]
      title: item.title,
      price: { toman: item.price || 0 },                                      // Price object for multi-currency support
      shortDescription: (item.description && item.description[0]?.children[0]?.text) || '', // Extract from rich text
      image: formatSingleImage(item.media ? item.media[0] : null),           // Take first media item, or placeholder
    }));
}

/**
 * Format Services data from Strapi API
 * 
 * Purpose:
 * - Transforms raw Strapi service responses into clean, frontend-ready objects
 * - Handles single image per service
 * - Extracts description from rich text structure
 * - Includes optional external link field
 * 
 * Strapi Service Structure:
 * {
 *   id: number,
 *   title: string,
 *   slug: string,
 *   description: [{ type: 'paragraph', children: [{ text: '...' }] }],
 *   image: { url: '...', alternativeText: '...' },
 *   link: string (optional)
 * }
 * 
 * Output Structure:
 * {
 *   id: number,
 *   slug: string,
 *   title: string,
 *   description: string,
 *   image: { url: string, alt: string },
 *   link: string | null
 * }
 * 
 * @param {Object} apiResponse - Raw Strapi API response
 * @param {Array} apiResponse.data - Array of service items
 * @returns {Array} Array of formatted service objects
 */
export function formatStrapiServices(apiResponse) {
  // Guard clause: Return empty array if response is invalid
  // This prevents runtime errors and provides a safe fallback
  if (!apiResponse || !apiResponse.data) return [];

  return apiResponse.data
    // Filter: Only process items with a title (required field)
    .filter(item => item && item.title)
    
    // Map: Transform each raw item into a clean, formatted object
    .map(item => {
      /**
       * Extract description from Strapi's rich text structure
       * Strapi stores text content in a nested array format:
       * description[0].children[0].text
       */
      const description = (item.description && item.description[0]?.children[0]?.text) || '';

      return {
        id: item.id,
        slug: item.slug,                      // For routing to /services/[slug]
        title: item.title,                    // Service title displayed in ServiceCard
        description: description,             // Brief description/summary
        image: formatSingleImage(item.image), // Single service image (not an array)
        link: item.link || null,              // Optional external link (used in detail page)
      };
    });
}