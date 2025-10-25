import Image from 'next/image';
import { notFound } from 'next/navigation';
import ProductGallery from '@/components/products/ProductGallery/ProductGallery';
import { formatStrapiProducts } from '@/lib/strapiUtils';
import { getProductBySlug as fetchProductBySlug, getProducts } from '@/lib/api'; // Import from centralized API layer
import styles from './page.module.scss';

/**
 * Fetches a single product by slug from centralized API layer
 * 
 * Refactored to use src/lib/api.js per ARCHITECTURE_RULES.md Rule 2.2
 * - No direct fetch() calls in components
 * - All API logic centralized in api.js
 * - Returns { data, error } format from API layer
 * 
 * @param {string} slug - Product slug identifier
 * @returns {Promise<Object|null>} Formatted product object or null if not found
 */
async function getProductBySlug(slug) {
  try {
    /**
     * Call centralized API function
     * - Handles URL construction and query parameters
     * - Implements ISR revalidation strategy
     * - Returns standardized { data, error } format
     */
    const { data, error } = await fetchProductBySlug(slug);

    // Check for API errors
    if (error) {
      console.error("API Error fetching product:", error);
      return null;
    }

    // Validate data exists
    if (!data || !data.data || data.data.length === 0) {
      console.warn(`No product found with slug: ${slug}`);
      return null;
    }
    
    /**
     * Format the Strapi response
     * - data.data is the array of products (Strapi always returns array for filters)
     * - formatStrapiProducts transforms into clean product objects
     * - Take first item since slug should be unique
     */
    const formatted = formatStrapiProducts(data);
    return formatted[0];

  } catch (error) {
    console.error("Failed to fetch product by slug:", error);
    return null;
  }
}

/**
 * Generate static params for all products at build time
 * 
 * Refactored to use centralized API layer
 * - Fetches all products to extract slugs
 * - Used for Static Site Generation (SSG)
 * 
 * @returns {Promise<Array>} Array of { slug } objects for static generation
 */
export async function generateStaticParams() {
  try {
    /**
     * Fetch all products from API layer
     * - No pagination needed (all slugs at once)
     * - Returns { data, error } format
     */
    const { data, error } = await getProducts({ pageSize: 1000 }); // Large pageSize to get all

    if (error || !data || !data.data) {
      console.error("Failed to generate static params:", error);
      return [];
    }

    /**
     * Extract slugs from product data
     * - Strapi v5 has flat structure (no .attributes)
     * - Map directly to slug property
     * - Filter out any products without slugs
     */
    return data.data
      .filter(product => product && product.slug)
      .map((product) => ({
        slug: product.slug,
      }));
      
  } catch (error) {
    console.error("Failed to generate static params:", error);
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return { title: 'محصول یافت نشد' };
  }
  return {
    title: `${product.title} | فروشگاه آنلاین`,
    description: product.shortDescription,
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <main className={styles.productPage}>
      <div className="container">
        <div className={styles.layoutGrid}>
          <div className={styles.gallery}>
            <ProductGallery images={product.images} />
          </div>

          <div className={styles.details}>
            <h1 className={styles.title}>{product.title}</h1>
            <div className={styles.price}>{product.price.toman.toLocaleString()} تومان</div>
            <p className={styles.description}>{product.shortDescription}</p>
            <button className="card-button">افزودن به سبد خرید</button>
          </div>
        </div>
      </div>
    </main>
  );
}

