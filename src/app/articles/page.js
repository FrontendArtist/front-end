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
import { getArticlesPaginated, getArticleCategories } from '@/lib/articlesApi';
import { ARTICLES_PAGE_SIZE } from '@/lib/constants';
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
 * - PAGE_SIZE از lib/constants.js وارد می‌شود (Single Source of Truth)
 * - Follows Repository Pattern for clean separation of concerns
 * - SSR renders complete HTML with initial article data
 */
export default async function ArticlesPage({ searchParams: spPromise }) {
  // واکشی صفحه اول مقالات با pagination
  // تعداد مقالات از ARTICLES_PAGE_SIZE در lib/constants.js
  const searchParams = await spPromise;
  const normalizedSearchParams =
    searchParams && typeof searchParams.entries === 'function'
      ? Object.fromEntries(searchParams.entries())
      : searchParams || {};


  // خواندن دسته‌بندی و ترتیب مرتب‌سازی از پارامترهای URL
  const activeCategory = normalizedSearchParams.category || '';
  const sort = normalizedSearchParams.sort || 'publishedAt:desc';
  const hasFilters = Object.keys(normalizedSearchParams).length > 0;

  // واکشی مقالات و دسته‌بندی‌ها به‌صورت موازی
  const [result, categories] = await Promise.all([
    getArticlesPaginated(1, ARTICLES_PAGE_SIZE, sort, activeCategory || null),
    getArticleCategories()
  ]);


  // این خط را موقتاً اضافه کردیم و ترمینال VSCode را چک کنید
  console.log('Categories fetched from API:', JSON.stringify(categories, null, 2));

  const initialArticles = result.data;
  const initialMeta = result.meta;

  return (
    <main className={styles.main}>
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>مقالات</h1>
        </header>
        <ArticleGrid
          initialArticles={initialArticles}
          initialMeta={initialMeta}
          categories={categories}
          activeSlug={activeCategory}
        />
      </div>
    </main>
  );
}
