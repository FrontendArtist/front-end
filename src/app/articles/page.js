/**
 * Articles Page - Main Listing Page
 * 
 * Data fetched via API Layer abstraction (articlesApi.js)
 * Implements Server-Side Rendering (SSR) for optimal SEO and performance
 */

import ArticleGrid from '@/modules/articles/ArticleGrid/ArticleGrid';
import { getAllArticles } from '@/lib/articlesApi';
import styles from './articles.module.scss';

export const metadata = {
  title: 'مقالات | وب‌سایت ما',
  description: 'آخرین مقالات و نوشته‌ها را مطالعه کنید.',
};

/**
 * Articles Page Component (Server Component)
 * 
 * Architecture:
 * - Uses getAllArticles() from articlesApi.js (no direct fetch)
 * - Follows Repository Pattern for clean separation of concerns
 * - SSR renders complete HTML with article data
 */
export default async function ArticlesPage() {
  // Data fetched via API Layer abstraction
  const initialArticles = await getAllArticles();
  
  return (
    <main className={styles.main}>
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>مقالات</h1>
        </header>
        <ArticleGrid initialArticles={initialArticles} />
      </div>
    </main>
  );
}

