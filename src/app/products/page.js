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

import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import { getProductsPaginated } from '@/lib/productsApi';
import { getCategoryTree } from '@/lib/categoriesApi';
import { getProductBreadcrumbs } from '@/lib/breadcrumbs';
import ProductsPageClient from '@/modules/products/ProductsPageClient/ProductsPageClient';
import styles from './products.module.scss';

// SEO Metadata for the page
export const metadata = {
  title: 'محصولات | فروشگاه آنلاین',
  description: 'لیست کامل محصولات فروشگاه ما را مشاهده کنید.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/products`
  }
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
export default async function ProductsPage({ searchParams: spPromise }) {
  // ⬅️ FIX: Await searchParams — ADDED LINE
  const searchParams = await spPromise;
  const categorySlug = searchParams?.category || '';
  const subCategorySlug = searchParams?.sub || '';
  const sort = searchParams?.sort || 'createdAt:desc';
  const page = Number(searchParams?.page || 1);

  // Fetch categories once for both logic and client component
  const categories = await getCategoryTree();
  
  let currentCategory = null;
  let currentSubCategory = null;
  let subSlugs = [];

  // Find current category objects if slugs exist
  if (categorySlug) {
    currentCategory = categories.find(c => c.slug === categorySlug);
    
    if (currentCategory) {
      if (subCategorySlug) {
        currentSubCategory = currentCategory.subCategories?.find(s => s.slug === subCategorySlug);
      } else if (currentCategory.subCategories?.length) {
        // If we are in a main category, we might want to include subcategories in the fetch
        subSlugs = currentCategory.subCategories.map(s => s.slug);
      }
    }
  }

  const { data, meta } = await getProductsPaginated(page, 6, sort, {
    categorySlug: categorySlug || undefined,
    subCategorySlug: subCategorySlug || undefined,
    subSlugs
  });

  const breadcrumbItems = getProductBreadcrumbs({
    category: currentCategory,
    subcategory: currentSubCategory
  });

  return (
    <main className={styles.main}>
      <div className="container">
        <Breadcrumb items={breadcrumbItems} />
        <header className={styles.header}>
          <h1 className={styles.title}>محصولات</h1>
        </header>

        <ProductsPageClient
          initialProducts={data}
          initialMeta={meta}
          categoriesSnapshot={JSON.stringify(categories)}
          initialSort={sort}
          initialCategory={categorySlug}
          initialSubCategory={subCategorySlug}
        />
      </div>
    </main>
  );
}
