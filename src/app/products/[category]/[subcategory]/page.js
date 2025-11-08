/**
 * Products - Subcategory Listing Page (/products/[category]/[subcategory])
 */

import { getProductsPaginated } from '@/lib/productsApi';
import { getCategoryTree } from '@/lib/categoriesApi';
import ProductsPageClient from '@/modules/products/ProductsPageClient/ProductsPageClient';
import styles from '../../products.module.scss';

export async function generateMetadata({ params }) {
  const { category, subcategory } = await params;
  const base = process.env.NEXT_PUBLIC_SITE_URL || '';
  const url = `${base}/products/${category}/${subcategory}`;
  return {
    title: subcategory || category,
    alternates: { canonical: url },
  };
}

export default async function ProductsSubcategoryPage({ params, searchParams }) {
  const { category, subcategory } = await params;
  const sort = searchParams?.sort || 'createdAt:desc';
  const page = Number(searchParams?.page || 1);

  const { data, meta } = await getProductsPaginated(page, 6, sort, {
    categorySlug: category,
    subCategorySlug: subcategory,
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


