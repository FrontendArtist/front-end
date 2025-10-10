'use client';

import { useState, useEffect, useRef } from 'react';
import ArticleCard from '@/components/cards/ArticleCard/ArticleCard';
import { formatStrapiArticles } from '@/lib/strapiUtils';
import SortControls from '@/components/ui/SortControls/SortControls'; // 1. ایمپورت کامپوننت جدید
import styles from './ArticleGrid.module.scss';

const PAGE_SIZE = 6;
// 2. تعریف گزینه‌های مرتب‌سازی
const SORT_OPTIONS = [
  { value: 'latest', label: 'جدیدترین' },
  { value: 'oldest', label: 'قدیمی‌ترین' },
];

const ArticleGrid = ({ initialArticles }) => {
  const [articles, setArticles] = useState(initialArticles || []);
  const [sortBy, setSortBy] = useState('latest');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialArticles.length === PAGE_SIZE);
  const isInitialMount = useRef(true); // 3. استفاده از useRef برای حل باگ

  const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';

  useEffect(() => {
    // 4. اصلاح منطق useEffect برای جلوگیری از اجرای اضافی و حل باگ
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const sortArticles = async () => {
      setIsLoading(true);
      try {
        const itemsToFetch = Math.max(articles.length, PAGE_SIZE);
        const sortQuery = sortBy === 'latest' ? 'publishedAt:desc' : 'publishedAt:asc';
        const response = await fetch(
          `${STRAPI_API_URL}/api/articles?populate=cover&sort=${sortQuery}&pagination[page]=1&pagination[pageSize]=${itemsToFetch}`
        );
        const result = await response.json();
        const newArticles = formatStrapiArticles(result, STRAPI_API_URL);
        
        setArticles(newArticles);
        setPage(1);
        setHasMore(result.meta.pagination.page < result.meta.pagination.pageCount);
      } catch (error) { console.error("Failed to sort articles:", error); } 
      finally { setIsLoading(false); }
    };

    sortArticles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  const handleLoadMore = async () => {
    // ... این تابع بدون تغییر باقی می‌ماند ...
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const sortQuery = sortBy === 'latest' ? 'publishedAt:desc' : 'publishedAt:asc';
      const response = await fetch(
        `${STRAPI_API_URL}/api/articles?populate=cover&sort=${sortQuery}&pagination[page]=${nextPage}&pagination[pageSize]=${PAGE_SIZE}`
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
      {/* 5. جایگزینی دکمه‌های قدیمی با کامپوننت جدید */}
      <SortControls 
        options={SORT_OPTIONS}
        currentSort={sortBy}
        onSortChange={setSortBy}
      />
      
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