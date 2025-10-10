# Feature Context: Articles Listing Page (Server Component)

## 1. Goal
To create the main page for the articles listing at `/articles`. It will fetch initial articles from Strapi.

## 2. Files
- Folder: `src/app/articles`
- File: `src/app/articles/page.js`
- File: `src/app/articles/articles.module.scss` (can reuse styles from products)

## 3. JSX (`page.js`)
```jsx
import { formatStrapiArticles } from '@/lib/strapiUtils';
import ArticleGrid from '@/modules/articles/ArticleGrid/ArticleGrid';
import styles from './articles.module.scss';

export const metadata = {
  title: 'مقالات | وب‌سایت ما',
  description: 'آخرین مقالات و نوشته‌ها را مطالعه کنید.',
};

const PAGE_SIZE = 6; // Show more articles per page

async function getInitialArticles() {
  const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
  try {
    const response = await fetch(
      `${STRAPI_API_URL}/api/articles?populate=*&sort=publishedAt:desc&pagination[page]=1&pagination[pageSize]=${PAGE_SIZE}`
    );
    if (!response.ok) throw new Error('Failed to fetch initial articles');
    const result = await response.json();
    return formatStrapiArticles(result, STRAPI_API_URL);
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