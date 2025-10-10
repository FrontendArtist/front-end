# Feature Context: ArticleGrid Client Component

## 1. Goal
To create an interactive grid for articles with sorting and "load more" functionality, similar to the `ProductGrid`.

## 2. Files
- Folder: `src/modules/articles/ArticleGrid`
- File: `src/modules/articles/ArticleGrid/ArticleGrid.jsx`
- File: `src/modules/articles/ArticleGrid/ArticleGrid.module.scss`

## 3. JSX (`ArticleGrid.jsx`)
```jsx
'use client';

import { useState, useEffect } from 'react';
import ArticleCard from '@/components/cards/ArticleCard/ArticleCard';
import { formatStrapiArticles } from '@/lib/strapiUtils';
import styles from './ArticleGrid.module.scss'; // A new scss module

const PAGE_SIZE = 6;

const ArticleGrid = ({ initialArticles }) => {
  const [articles, setArticles] = useState(initialArticles || []);
  const [sortBy, setSortBy] = useState('latest'); // 'latest' or 'oldest'
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialArticles.length === PAGE_SIZE);

  const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';

  useEffect(() => {
    const sortArticles = async () => {
      if (page === 1 && sortBy === 'latest') return;
      setIsLoading(true);
      try {
        const sortQuery = sortBy === 'latest' ? 'publishedAt:desc' : 'publishedAt:asc';
        const response = await fetch(
          `${STRAPI_API_URL}/api/articles?populate=*&sort=${sortQuery}&pagination[page]=1&pagination[pageSize]=${articles.length || PAGE_SIZE}`
        );
        const result = await response.json();
        const newArticles = formatStrapiArticles(result, STRAPI_API_URL);
        setArticles(newArticles);
        setPage(1);
        setHasMore(result.meta.pagination.page < result.meta.pagination.pageCount);
      } catch (error) { console.error(error); } 
      finally { setIsLoading(false); }
    };
    sortArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  const handleLoadMore = async () => {
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const sortQuery = sortBy === 'latest' ? 'publishedAt:desc' : 'publishedAt:asc';
      const response = await fetch(
        `${STRAPI_API_URL}/api/articles?populate=*&sort=${sortQuery}&pagination[page]=${nextPage}&pagination[pageSize]=${PAGE_SIZE}`
      );
      const result = await response.json();
      const newArticles = formatStrapiArticles(result, STRAPI_API_URL);
      setArticles(prev => [...prev, ...newArticles]);
      setPage(nextPage);
      setHasMore(result.meta.pagination.page < result.meta.pagination.pageCount);
    } catch (error) { console.error(error); }
    finally { setIsLoading(false); }
  };

  return (
    <div>
      <div className={styles.sortControls}>
        <button onClick={() => setSortBy('latest')} disabled={sortBy === 'latest'}>جدیدترین</button>
        <button onClick={() => setSortBy('oldest')} disabled={sortBy === 'oldest'}>قدیمی‌ترین</button>
      </div>
      <div className={styles.grid}>
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
      {isLoading && <p>در حال بارگذاری...</p>}
      {hasMore && !isLoading && (
        <div className={styles.loadMoreContainer}>
          <button onClick={handleLoadMore} className={styles.loadMoreButton}>بارگذاری بیشتر</button>
        </div>
      )}
    </div>
  );
};
export default ArticleGrid;