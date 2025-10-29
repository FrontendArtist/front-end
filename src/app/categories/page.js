/**
 * Categories Page
 * نمایش تمام دسته‌بندی‌های اصلی با ISR
 */

import CategoryGrid from '@/components/grids/CategoryGrid/CategoryGrid';
import { getAllCategories } from '@/lib/categoriesApi';
import styles from './page.module.scss';

export const revalidate = 60; // ISR with 60 second revalidation

export default async function CategoriesPage() {
  const categories = await getAllCategories();

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>دسته‌بندی‌ها</h1>
      <CategoryGrid items={categories} />
    </main>
  );
}