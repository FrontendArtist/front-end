import ProductGrid from '@/modules/products/ProductGrid/ProductGrid';
import { formatStrapiProducts } from '@/lib/strapiUtils';
import { getProducts } from '@/lib/api'; // Import from centralized API layer
import styles from './products.module.scss';

// SEO Metadata for the page
export const metadata = {
  title: 'محصولات | فروشگاه آنلاین',
  description: 'لیست کامل محصولات فروشگاه ما را مشاهده کنید.',
};

const PAGE_SIZE = 3; // Same as ProductGrid

/**
 * Fetches the initial products from the centralized API layer
 * 
 * Refactored to use src/lib/api.js per ARCHITECTURE_RULES.md Rule 2.2
 * - No direct fetch() calls in components
 * - All API logic centralized in api.js
 * - Returns { data, error } format from API layer
 * - Handles data formatting with strapiUtils
 * 
 * @returns {Promise<Array>} Formatted array of product objects
 */
async function getInitialProducts() {
  try {
    /**
     * Call centralized API function instead of direct fetch
     * - getProducts handles URL construction
     * - getProducts handles query parameters
     * - getProducts handles error scenarios
     * - Returns standardized { data, error } format
     */
    const { data, error } = await getProducts({
      sort: 'createdAt:desc',
      page: 1,
      pageSize: PAGE_SIZE
    });

    // Check for API errors
    if (error) {
      console.error("API Error fetching initial products:", error);
      return [];
    }

    // Validate data structure
    if (!data) {
      console.warn("No data returned from products API");
      return [];
    }

    /**
     * Format the raw Strapi response
     * - data contains the raw Strapi response: { data: [...], meta: {...} }
     * - formatStrapiProducts transforms it into clean product objects
     */
    const formattedProducts = formatStrapiProducts(data);
    
    return formattedProducts;
    
  } catch (error) {
    // Catch any unexpected errors
    console.error("Initial Products Fetch Error:", error);
    return [];
  }
}

// This is an async Server Component
async function ProductsPage() {
  const initialProducts = await getInitialProducts();

  return (
    <main className={styles.main}>
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>محصولات</h1>
        </header>
        
        {/* Pass the REAL server-fetched data to the client component */}
        <ProductGrid initialProducts={initialProducts} />
      </div>
    </main>
  );
}

export default ProductsPage;
