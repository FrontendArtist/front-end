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

import ListGuard from '@/components/ui/ListGuard/ListGuard';
import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import { getProductsPaginated } from '@/lib/productsApi';
import { getCategoryTree } from '@/lib/categoriesApi';
import { getProductBreadcrumbs } from '@/lib/breadcrumbs';
import ProductsPageClient from '@/modules/products/ProductsPageClient/ProductsPageClient';
import ServerErrorBlock from '@/components/ui/ServerErrorBlock/ServerErrorBlock';
import { unstable_noStore as noStore } from 'next/cache';
import styles from './products.module.scss';

import { SITE_NAME, SITE_URL, PRODUCTS_PAGE_SIZE } from '@/lib/constants';

// SEO Metadata for the page
export const metadata = {
  title: 'محصولات',
  description: `لیست کامل محصولات فروشگاه ${SITE_NAME} را مشاهده کنید.`,
  openGraph: {
    title: `محصولات | ${SITE_NAME}`,
    description: `لیست کامل محصولات فروشگاه ${SITE_NAME} را مشاهده کنید.`,
    url: `${SITE_URL}/products`,
  },
  alternates: {
    canonical: `${SITE_URL}/products`
  }
};

/**
 * Products Page Component (Server Component)
 * 
 * Architecture:
 * - Uses getProductsPaginated() برای واکشی صفحه اول با pagination
 * - PAGE_SIZE از lib/constants.js وارد می‌شود (Single Source of Truth)
 * - Follows Repository Pattern for clean separation of concerns
 * - SSR renders complete HTML with initial product data
 */
export default async function ProductsPage({ searchParams: spPromise }) {
  // ⬅️ FIX: Await searchParams — ADDED LINE
  const searchParams = await spPromise;
  const normalizedSearchParams =
    searchParams && typeof searchParams.entries === 'function'
      ? Object.fromEntries(searchParams.entries())
      : searchParams || {};
  const hasFilters = Object.keys(normalizedSearchParams).length > 0;
  const categorySlug = normalizedSearchParams.category || '';
  const subCategorySlug = normalizedSearchParams.sub || '';
  const sort = normalizedSearchParams.sort || 'createdAt:desc';
  const page = Number(normalizedSearchParams.page || 1);

  // Fetch categories once for both logic and client component
  const categories = await getCategoryTree();

  let currentCategory = null;
  let currentSubCategory = null;
  let subSlugs = [];

  // Find current category objects if slugs exist
  if (categories && !categories.error && categorySlug) {
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

  const productsResult = await getProductsPaginated(page, PRODUCTS_PAGE_SIZE, sort, {
    categorySlug: categorySlug || undefined,
    subCategorySlug: subCategorySlug || undefined,
    subSlugs
  });

  if ((categories && categories.error === 'BACKEND_UNAVAILABLE') || productsResult.error === 'BACKEND_UNAVAILABLE') {
    noStore();
    return (
      <main className={styles.main}>
        <div className="container">
          <Breadcrumb items={[{ label: 'خانه', href: '/' }, { label: 'محصولات' }]} />
          <ServerErrorBlock message="ارتباط با سرور محصولات برقرار نشد" />
        </div>
      </main>
    );
  }

  const data = productsResult.data;
  const meta = productsResult.meta;

  const breadcrumbItems = getProductBreadcrumbs({
    category: currentCategory,
    subcategory: currentSubCategory
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `محصولات | ${SITE_NAME}`,
    "description": `لیست کامل محصولات فروشگاه ${SITE_NAME} را مشاهده کنید.`,
    "url": `${SITE_URL}/products`,
  };

  return (
    <main className={styles.main}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container">
        <Breadcrumb items={breadcrumbItems} />

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

