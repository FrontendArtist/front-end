/**
 * Products - Category Listing Page (/products/[category])
 * SSR first page with SPA-compatible sorting and load more
 */

import { getProductsPaginated } from '@/lib/productsApi';
import { getCategoryTree } from '@/lib/categoriesApi';
import ProductsPageClient from '@/modules/products/ProductsPageClient/ProductsPageClient';
import styles from '../products.module.scss';

export async function generateMetadata({ params: paramsPromise }) {
  // ⬅️ FIX: Await params
  const params = await paramsPromise;
  const { category } = params;

  const base = process.env.NEXT_PUBLIC_SITE_URL || '';
  const url = `${base}/products/${category}`;

  return {
    title: category,
    alternates: { canonical: url },
  };
}

export default async function ProductsCategoryPage({ params: paramsPromise, searchParams: spPromise }) {
  // ⬅️ FIX: Await both params & searchParams
  const params = await paramsPromise;
  const searchParams = await spPromise;

  const { category } = params;

  const sort = searchParams?.sort || 'createdAt:desc';
  const page = Number(searchParams?.page || 1);

  // If only category is selected, include all child subcategories in SSR query
  let subSlugs = [];
  const tree = await getCategoryTree();

  const cat = tree.find(
    c =>
      (c.slug || c?.nameSlug) === category ||
      c?.name === category
  );

  if (cat?.subCategories?.length) {
    subSlugs = cat.subCategories.map(s => s.slug);
  }

  const { data, meta } = await getProductsPaginated(page, 6, sort, {
    categorySlug: category,
    subCategorySlug: undefined,
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
          initialCategory={category}
          initialSubCategory=""
        />
      </div>
    </main>
  );
}
