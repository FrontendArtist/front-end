import ProductGrid from '@/modules/products/ProductGrid/ProductGrid';
import { formatStrapiProducts } from '@/lib/strapiUtils';
import styles from './products.module.scss';

// SEO Metadata for the page
export const metadata = {
  title: 'محصولات | فروشگاه آنلاین',
  description: 'لیست کامل محصولات فروشگاه ما را مشاهده کنید.',
};

/**
 * Fetches the initial products from the Strapi API.
 * This is a separate function for clarity and reusability.
 */
async function getInitialProducts() {
  const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
  try {
    const response = await fetch(`${STRAPI_API_URL}/api/products?populate=*&sort=createdAt:desc`);
    if (!response.ok) throw new Error('Failed to fetch initial products');
    const result = await response.json();
    console.log(result);
    
    return formatStrapiProducts(result); // Use the helper to format data
  } catch (error) {
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
