/**
 * Products Page - Main Listing Page
 * 
 * Data fetched via API Layer abstraction (productsApi.js)
 * Implements Server-Side Rendering (SSR) for optimal SEO and performance
 * 
 * جریان داده (Data Flow):
 * این صفحه → getProductsPaginated() → apiClient → Strapi
 * فقط صفحه اول با تعداد محدود آیتم واکشی می‌شود
 * بقیه آیتم‌ها با دکمه "بارگذاری بیشتر" از سمت کلاینت واکشی می‌شوند
 */

import ProductGrid from '@/modules/products/ProductGrid/ProductGrid';
import { getProductsPaginated } from '@/lib/productsApi';
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
 * - Uses getProductsPaginated() برای واکشی صفحه اول با pagination
 * - PAGE_SIZE = 3 (فقط 3 محصول در بارگذاری اولیه)
 * - Follows Repository Pattern for clean separation of concerns
 * - SSR renders complete HTML with initial product data
 */
async function ProductsPage() {
  // واکشی صفحه اول محصولات با pagination
  // فقط 3 محصول اول برای بارگذاری سریع‌تر صفحه
  const result = await getProductsPaginated(1, 3, 'createdAt:desc');
  const initialProducts = result.data;

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
