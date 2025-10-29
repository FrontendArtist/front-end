/**
 * Subcategory Page
 * نمایش محصولات زیردسته با SSR
 */

import CategoryProductsGrid from '@/components/grids/CategoryProductsGrid/CategoryProductsGrid';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import { getSubcategoryBySlug } from '@/lib/categoriesApi';
import styles from './page.module.scss';

export default async function SubcategoryPage({ params }) {
  const { slug, subSlug } = params;
  const subcategory = await getSubcategoryBySlug(slug, subSlug);

  if (!subcategory) {
    return <EmptyState title="زیردسته یافت نشد" />;
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{subcategory.name}</h1>
      <CategoryProductsGrid items={subcategory.products} />
    </main>
  );
}