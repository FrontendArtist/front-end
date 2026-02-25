'use client';

import { useState, useEffect } from 'react';
import CourseCard from '@/components/cards/CourseCard/CourseCard';
import SortControls from '@/components/ui/SortControls/SortControls';
import styles from '../../articles/ArticleGrid/ArticleGrid.module.scss'; // استفاده مجدد از استایل‌ها

const PAGE_SIZE = 6;

// تعریف گزینه‌های مرتب‌سازی دوره‌ها
const SORT_OPTIONS = [
    { value: 'latest', label: 'جدیدترین' },
    { value: 'price:asc', label: 'ارزان‌ترین' },
    { value: 'price:desc', label: 'گران‌ترین' },
];

/**
 * CourseGrid - نمایش شبکه‌ای دوره‌ها با قابلیت مرتب‌سازی و بارگذاری بیشتر
 * 
 * جریان داده (Data Flow):
 * این کامپوننت → fetch('/api/courses') → Next.js Route Handler → Domain API → Strapi
 * 
 * مزایای استفاده از Route Handler داخلی:
 * - حذف وابستگی مستقیم به Strapi URL
 * - امنیت بیشتر (API keys فاش نمی‌شوند)
 * - تست‌پذیری بالاتر
 * - امکان افزودن middleware (auth, caching) در آینده
 * 
 * @param {Array} initialCourses - دوره‌های اولیه از SSR
 */
const CourseGrid = ({ initialCourses }) => {
  const [courses, setCourses] = useState(initialCourses || []);
  const [sortBy, setSortBy] = useState('latest');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialCourses.length === PAGE_SIZE);

  // Effect: مرتب‌سازی دوره‌ها
  // هنگامی که کاربر ترتیب مرتب‌سازی را تغییر می‌دهد، دوره‌ها را از ابتدا واکشی می‌کنیم
  useEffect(() => {
    const sortCourses = async () => {
      // جلوگیری از اجرا در بارگذاری اولیه با sort پیش‌فرض
      if (page === 1 && sortBy === 'latest') {
        setCourses(initialCourses);
        return;
      }
      
      setIsLoading(true);
      try {
        // محاسبه تعداد آیتم‌های فعلی برای حفظ تعداد نمایش
        const itemsToFetch = Math.max(courses.length, PAGE_SIZE);
        const sortQuery = sortBy === 'latest' ? 'createdAt:desc' : sortBy;
        
        // ✅ استفاده از Route Handler داخلی Next.js به‌جای Strapi مستقیم
        // Client → /api/courses → Next.js Route Handler → Domain API → Strapi
        const response = await fetch(
          `/api/courses?page=1&pageSize=${itemsToFetch}&sort=${sortQuery}`
        );
        const result = await response.json();
        
        // داده‌ها از Route Handler قبلاً فرمت شده برمی‌گردند
        setCourses(result.data);
        setPage(Math.ceil(itemsToFetch / PAGE_SIZE));
        setHasMore(result.meta.pagination.page < result.meta.pagination.pageCount);
      } catch (error) { 
        console.error("خطا در مرتب‌سازی دوره‌ها:", error); 
      } finally { 
        setIsLoading(false); 
      }
    };
    
    sortCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  // Handler: بارگذاری صفحه بعدی دوره‌ها
  // هنگام کلیک روی دکمه "بارگذاری بیشتر"
  const handleLoadMore = async () => {
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const sortQuery = sortBy === 'latest' ? 'createdAt:desc' : sortBy;
      
      // ✅ استفاده از Route Handler داخلی Next.js به‌جای Strapi مستقیم
      // Client → /api/courses → Next.js Route Handler → Domain API → Strapi
      const response = await fetch(
        `/api/courses?page=${nextPage}&pageSize=${PAGE_SIZE}&sort=${sortQuery}`
      );
      const result = await response.json();
      
      // داده‌ها از Route Handler قبلاً فرمت شده برمی‌گردند
      setCourses(prev => [...prev, ...result.data]);
      setPage(nextPage);
      setHasMore(result.meta.pagination.page < result.meta.pagination.pageCount);
    } catch (error) { 
      console.error("خطا در بارگذاری دوره‌های بیشتر:", error); 
    } finally { 
      setIsLoading(false); 
    }
  };

  return (
    <div>
      <SortControls
        options={SORT_OPTIONS}
        currentSort={sortBy}
        onSortChange={setSortBy}
      />
      <div className={styles.grid}>
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} />
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

export default CourseGrid;