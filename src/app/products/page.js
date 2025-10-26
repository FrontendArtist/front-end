/**
 * Products Page - Main Listing Page
 * 
 * Data fetched via API Layer abstraction (productsApi.js)
 * Implements Server-Side Rendering (SSR) for optimal SEO and performance
 */

import ProductGrid from '@/modules/products/ProductGrid/ProductGrid';
import { getAllProducts } from '@/lib/productsApi';
import styles from './products.module.scss';

// SEO Metadata for the page
export const metadata = {
  title: 'محصولات | فروشگاه آنلاین',
  description: 'لیست کامل محصولات فروشگاه ما را مشاهده کنید.',
};

/**
 * Products Page Component (Server Component)
 * 
 * Architecture:
 * - Uses getAllProducts() from productsApi.js (no direct fetch)
 * - Follows Repository Pattern for clean separation of concerns
 * - SSR renders complete HTML with product data
 */
async function ProductsPage() {
  // Data fetched via API Layer abstraction
  const initialProducts = await getAllProducts();

  return (
    <main className={styles.main}>
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>محصولات</h1>
        </header>
        
        {/* Pass server-fetched data to the client component */}
        <ProductGrid initialProducts={initialProducts} />
      </div>
    </main>
  );
}

export default ProductsPage;
