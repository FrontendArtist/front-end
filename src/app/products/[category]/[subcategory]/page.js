/**
 * Products - Subcategory Listing Page (/products/[category]/[subcategory])
 * SSR + SPA-compatible load more + sorting
 */

import { getProductsPaginated } from '@/lib/productsApi';
import { getCategoryTree } from '@/lib/categoriesApi';
import ProductsPageClient from '@/modules/products/ProductsPageClient/ProductsPageClient';
import styles from '../../products.module.scss';

// ----------------------------
//  SEO Metadata
// ----------------------------
export async function generateMetadata({ params: paramsPromise }) {
  // ⬅️ FIX: Await params (Next.js 15 requirement)
  const params = await paramsPromise;
  const { category, subcategory } = params;

  const base = process.env.NEXT_PUBLIC_SITE_URL || '';
  return {
    title: `${subcategory} | ${category}`,
    alternates: {
      canonical: `${base}/products/${category}/${subcategory}`
    }
  };
}

// ----------------------------
//  Main Page Component (SSR)
// ----------------------------
export default async function ProductsSubcategoryPage({
  params: paramsPromise,
  searchParams: spPromise
}) {
  // ⬅️ FIX: Await both params & searchParams
  const params = await paramsPromise;
  const searchParams = await spPromise;

  const { category, subcategory } = params;

  const sort = searchParams?.sort || 'createdAt:desc';
  const page = Number(searchParams?.page || 1);

  // ----------------------------
  //  Fetch products
  // ----------------------------
  const { data, meta } = await getProductsPaginated(page, 6, sort, {
    categorySlug: category,
    subCategorySlug: subcategory,
    subSlugs: [] // subcategory صفحه خودش محصولات خودش را می‌آورد
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
          initialCategory={category}
          initialSubCategory={subcategory}
        />
      </div>
    </main>
  );
}
