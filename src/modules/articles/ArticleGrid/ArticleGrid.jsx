'use client';

import { useState, useEffect, useRef } from 'react';
import ArticleCard from '@/components/cards/ArticleCard/ArticleCard';
import SortControls from '@/components/ui/SortControls/SortControls';
import styles from './ArticleGrid.module.scss';

const PAGE_SIZE = 6;

// تعریف گزینه‌های مرتب‌سازی
const SORT_OPTIONS = [
  { value: 'latest', label: 'جدیدترین' },
  { value: 'oldest', label: 'قدیمی‌ترین' },
];

/**
 * ArticleGrid - نمایش شبکه‌ای مقالات با قابلیت مرتب‌سازی و بارگذاری بیشتر
 * 
 * جریان داده (Data Flow):
 * این کامپوننت → fetch('/api/articles') → Next.js Route Handler → Domain API → Strapi
 * 
 * مزایای استفاده از Route Handler داخلی:
 * - حذف وابستگی مستقیم به Strapi URL
 * - امنیت بیشتر (API keys فاش نمی‌شوند)
 * - تست‌پذیری بالاتر
 * - امکان افزودن middleware (auth, caching) در آینده
 * 
 * @param {Array} initialArticles - مقالات اولیه از SSR
 */
const ArticleGrid = ({ initialArticles }) => {
  const [articles, setArticles] = useState(initialArticles || []);
  const [sortBy, setSortBy] = useState('latest');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialArticles.length === PAGE_SIZE);
  const isInitialMount = useRef(true); // استفاده از useRef برای جلوگیری از اجرای اضافی در mount اول

  // Effect: مرتب‌سازی مقالات
  // هنگامی که کاربر ترتیب مرتب‌سازی را تغییر می‌دهد، مقالات را از ابتدا واکشی می‌کنیم
  useEffect(() => {
    // جلوگیری از اجرا در بارگذاری اولیه (mount)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const sortArticles = async () => {
      setIsLoading(true);
      try {
        // محاسبه تعداد آیتم‌های فعلی برای حفظ تعداد نمایش
        const itemsToFetch = Math.max(articles.length, PAGE_SIZE);
        const sortQuery = sortBy === 'latest' ? 'publishedAt:desc' : 'publishedAt:asc';
        
        // ✅ استفاده از Route Handler داخلی Next.js به‌جای Strapi مستقیم
        // Client → /api/articles → Next.js Route Handler → Domain API → Strapi
        const response = await fetch(
          `/api/articles?page=1&pageSize=${itemsToFetch}&sort=${sortQuery}`
        );
        const result = await response.json();
        
        // داده‌ها از Route Handler قبلاً فرمت شده برمی‌گردند
        setArticles(result.data);
        setPage(1);
        setHasMore(result.meta.pagination.page < result.meta.pagination.pageCount);
      } catch (error) { 
        console.error("خطا در مرتب‌سازی مقالات:", error); 
      } finally { 
        setIsLoading(false); 
      }
    };

    sortArticles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  // Handler: بارگذاری صفحه بعدی مقالات
  // هنگام کلیک روی دکمه "بارگذاری بیشتر"
  const handleLoadMore = async () => {
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const sortQuery = sortBy === 'latest' ? 'publishedAt:desc' : 'publishedAt:asc';
      
      // ✅ استفاده از Route Handler داخلی Next.js به‌جای Strapi مستقیم
      // Client → /api/articles → Next.js Route Handler → Domain API → Strapi
      const response = await fetch(
        `/api/articles?page=${nextPage}&pageSize=${PAGE_SIZE}&sort=${sortQuery}`
      );
      const result = await response.json();
      
      // داده‌ها از Route Handler قبلاً فرمت شده برمی‌گردند
      setArticles(prev => [...prev, ...result.data]);
      setPage(nextPage);
      setHasMore(result.meta.pagination.page < result.meta.pagination.pageCount);
    } catch (error) { 
      console.error("خطا در بارگذاری مقالات بیشتر:", error); 
    } finally { 
      setIsLoading(false); 
    }
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