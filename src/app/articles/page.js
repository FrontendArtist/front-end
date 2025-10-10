import { formatStrapiArticles } from '@/lib/strapiUtils';
import ArticleGrid from '@/modules/articles/ArticleGrid/ArticleGrid';
import styles from './articles.module.scss';

export const metadata = {
  title: 'مقالات | وب‌سایت ما',
  description: 'آخرین مقالات و نوشته‌ها را مطالعه کنید.',
};

const PAGE_SIZE = 6;

async function getInitialArticles() {
  const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
  try {
    console.log('Fetching initial articles from:', STRAPI_API_URL);

    const response = await fetch(
        `${STRAPI_API_URL}/api/articles?sort=publishedAt:desc&pagination[page]=1&pagination[pageSize]=${PAGE_SIZE}&populate=cover`
      );
    if (!response.ok) {
      console.error('Failed to fetch articles:', response.status, response.statusText);
      throw new Error('Failed to fetch initial articles');
    }
    const result = await response.json();
    console.log('Received articles data:', result);
    const formattedArticles = formatStrapiArticles(result, STRAPI_API_URL);
    console.log('Formatted articles:', formattedArticles);
    return formattedArticles;
  } catch (error) {
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

