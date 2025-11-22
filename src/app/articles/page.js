/**
 * Articles Page - Main Listing Page
 * 
 * Data fetched via API Layer abstraction (articlesApi.js)
 * Implements Server-Side Rendering (SSR) for optimal SEO and performance
 * 
 * جریان داده (Data Flow):
 * این صفحه → getArticlesPaginated() → apiClient → Strapi
 * فقط صفحه اول با تعداد محدود آیتم واکشی می‌شود
 * بقیه آیتم‌ها با دکمه "بارگذاری بیشتر" از سمت کلاینت واکشی می‌شوند
 */

import ListGuard from '@/components/layout/ListGuard';
import ArticleGrid from '@/modules/articles/ArticleGrid/ArticleGrid';
import { getArticlesPaginated } from '@/lib/articlesApi';
import styles from './articles.module.scss';

export const metadata = {
  title: 'مقالات | وب‌سایت ما',
  description: 'آخرین مقالات و نوشته‌ها را مطالعه کنید.',
};

/**
 * Articles Page Component (Server Component)
 * 
 * Architecture:
 * - Uses getArticlesPaginated() برای واکشی صفحه اول با pagination
 * - PAGE_SIZE = 6 (فقط 6 مقاله در بارگذاری اولیه)
 * - Follows Repository Pattern for clean separation of concerns
 * - SSR renders complete HTML with initial article data
 */
export default async function ArticlesPage({ searchParams: spPromise }) {
  // واکشی صفحه اول مقالات با pagination
  // فقط 6 مقاله اول مرتب‌شده بر اساس تاریخ انتشار
  const searchParams = await spPromise;
  const normalizedSearchParams =
    searchParams && typeof searchParams.entries === 'function'
      ? Object.fromEntries(searchParams.entries())
      : searchParams || {};
  const hasFilters = Object.keys(normalizedSearchParams).length > 0;
  const result = await getArticlesPaginated(1, 6, 'publishedAt:desc');
  const initialArticles = result.data;
  
  return (
    <main className={styles.main}>
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>مقالات</h1>
        </header>
        <ListGuard
          data={initialArticles}
          hasFilters={hasFilters}
          entityName="مقاله"
          resetLink="/articles"
        >
          <ArticleGrid initialArticles={initialArticles} />
        </ListGuard>
      </div>
    </main>
  );
}

