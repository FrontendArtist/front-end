'use client';

import { useState, useEffect, useRef } from 'react';
import ArticleCard from '@/components/cards/ArticleCard/ArticleCard';
import SortControls from '@/components/ui/SortControls/SortControls';
import ArticleCategoryFilter from '@/modules/articles/components/ArticleCategoryFilter';
import { ARTICLES_PAGE_SIZE } from '@/lib/constants';
import styles from './ArticleGrid.module.scss';

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
 * @param {Array} categories - لیست دسته‌بندی‌های مقالات
 * @param {string} activeSlug - slug دسته‌بندی فعال
 */
const ArticleGrid = ({ initialArticles, categories = [], activeSlug = '', initialMeta = {} }) => {
  const [articles, setArticles] = useState(initialArticles || []);
  const [sortBy, setSortBy] = useState('latest');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(initialMeta?.pagination?.page || 1);
  const [hasMore, setHasMore] = useState(
    (initialMeta?.pagination?.page || 1) < (initialMeta?.pagination?.pageCount || 1)
  );
  const isInitialMount = useRef(true);

  // همگام‌سازی state داخلی با داده‌های جدیدی که از Server Component می‌رسد
  useEffect(() => {
    setArticles(initialArticles || []);
    const p = initialMeta?.pagination;
    setPage(p?.page || 1);
    setHasMore((p?.page || 1) < (p?.pageCount || 1));
  }, [initialArticles, activeSlug, initialMeta]);

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
        const itemsToFetch = Math.max(articles.length, ARTICLES_PAGE_SIZE);
        const sortQuery = sortBy === 'latest' ? 'publishedAt:desc' : 'publishedAt:asc';
        
        // ✅ استفاده از Route Handler داخلی Next.js به‌جای Strapi مستقیم
        // Client → /api/articles → Next.js Route Handler → Domain API → Strapi
        const categoryParam = activeSlug ? `&categorySlug=${activeSlug}` : '';
        const response = await fetch(
          `/api/articles?page=1&pageSize=${itemsToFetch}&sort=${sortQuery}${categoryParam}`
        );
        const result = await response.json();
        
        // داده‌ها از Route Handler قبلاً فرمت شده برمی‌گردند
        setArticles(result.data);
        const p = result?.meta?.pagination;
        setPage(p?.page || 1);
        setHasMore((p?.page || 1) < (p?.pageCount || 1));
      } catch (error) { 
        console.error("خطا در مرتب‌سازی مقالات:", error); 
      } finally { 
        setIsLoading(false); 
      }
    };

    sortArticles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, activeSlug]);

  // Handler: بارگذاری صفحه بعدی مقالات
  // هنگام کلیک روی دکمه "بارگذاری بیشتر"
  const handleLoadMore = async () => {
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const sortQuery = sortBy === 'latest' ? 'publishedAt:desc' : 'publishedAt:asc';
      
      // ✅ استفاده از Route Handler داخلی Next.js به‌جای Strapi مستقیم
      // Client → /api/articles → Next.js Route Handler → Domain API → Strapi
      const categoryParam = activeSlug ? `&categorySlug=${activeSlug}` : '';
      const response = await fetch(
        `/api/articles?page=${nextPage}&pageSize=${ARTICLES_PAGE_SIZE}&sort=${sortQuery}${categoryParam}`
      );
      const result = await response.json();
      
      // داده‌ها از Route Handler قبلاً فرمت شده برمی‌گردند
      setArticles(prev => [...prev, ...result.data]);
      const p = result?.meta?.pagination;
      setPage(p?.page || nextPage);
      setHasMore((p?.page || nextPage) < (p?.pageCount || 1));
    } catch (error) { 
      console.error("خطا در بارگذاری مقالات بیشتر:", error); 
    } finally { 
      setIsLoading(false); 
    }
  };

  return (
    <div>
      {/* فیلتر دسته‌بندی مقالات */}
      <ArticleCategoryFilter 
        categories={categories}
        activeSlug={activeSlug}
      />
      
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