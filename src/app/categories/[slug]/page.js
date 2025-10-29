/**
 * Category Page
 * نمایش اطلاعات دسته‌بندی، زیردسته‌ها و محصولات با SSR
 */

import CategoryProductsGrid from '@/components/grids/CategoryProductsGrid/CategoryProductsGrid';
import SubcategoryList from '@/components/lists/SubcategoryList/SubcategoryList';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import { getCategoryBySlug } from '@/lib/categoriesApi';
import styles from './page.module.scss';

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return <EmptyState title="دسته‌بندی یافت نشد" />;
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{category.name}</h1>
      
      <SubcategoryList 
        items={category.subcategories} 
        parentSlug={category.slug} 
      />
      
      <CategoryProductsGrid items={category.products} />
    </main>
  );
}