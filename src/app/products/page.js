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

import { getProductsPaginated } from '@/lib/productsApi';
import { getCategoryTree } from '@/lib/categoriesApi';
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
export default async function ProductsPage({ searchParams }) {
  const categorySlug = searchParams?.category || '';
  const subCategorySlug = searchParams?.sub || '';
  const sort = searchParams?.sort || 'createdAt:desc';
  const page = Number(searchParams?.page || 1);

  let subSlugs = [];
  if (categorySlug && !subCategorySlug) {
    const tree = await getCategoryTree();
    const cat = tree.find(c => c.slug === categorySlug);
    if (cat?.subCategories?.length) {
      subSlugs = cat.subCategories.map(s => s.slug);
    }
  }

  const { data, meta } = await getProductsPaginated(page, 6, sort, {
    categorySlug: categorySlug || undefined,
    subCategorySlug: subCategorySlug || undefined,
    subSlugs
  });

  const categories = await getCategoryTree();

  return (
    <main className={styles.main}>
      <div className="container">
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
