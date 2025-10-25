import { formatStrapiArticles } from '@/lib/strapiUtils';
import { getArticles } from '@/lib/api'; // Import from centralized API layer
import ArticleGrid from '@/modules/articles/ArticleGrid/ArticleGrid';
import styles from './articles.module.scss';

export const metadata = {
  title: 'مقالات | وب‌سایت ما',
  description: 'آخرین مقالات و نوشته‌ها را مطالعه کنید.',
};

const PAGE_SIZE = 6;

/**
 * Fetches initial articles from centralized API layer
 * 
 * Refactored to use src/lib/api.js per ARCHITECTURE_RULES.md Rule 2.2
 * - No direct fetch() calls in components
 * - All API logic centralized in api.js
 * - Returns { data, error } format from API layer
 * - Handles data formatting with strapiUtils
 * 
 * @returns {Promise<Array>} Formatted array of article objects
 */
async function getInitialArticles() {
  try {
    /**
     * Call centralized API function instead of direct fetch
     * - getArticles handles URL construction
     * - getArticles handles query parameters (sort, pagination, populate)
     * - getArticles handles error scenarios
     * - Returns standardized { data, error } format
     */
    const { data, error } = await getArticles({
      sort: 'publishedAt:desc',
      page: 1,
      pageSize: PAGE_SIZE
    });

    // Check for API errors
    if (error) {
      console.error("API Error fetching initial articles:", error);
      return [];
    }

    // Validate data structure
    if (!data) {
      console.warn("No data returned from articles API");
      return [];
    }

    /**
     * Format the raw Strapi response
     * - data contains the raw Strapi response: { data: [...], meta: {...} }
     * - formatStrapiArticles transforms it into clean article objects
     */
    const formattedArticles = formatStrapiArticles(data);
    
    return formattedArticles;
    
  } catch (error) {
    // Catch any unexpected errors
    console.error("Initial Articles Fetch Error:", error);
    return [];
  }
}

export default async function ArticlesPage() {
  const initialArticles = await getInitialArticles();
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

