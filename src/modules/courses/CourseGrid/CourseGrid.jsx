'use client';

import { useState, useEffect } from 'react';
import CourseCard from '@/components/cards/CourseCard/CourseCard';
import { formatStrapiCourses } from '@/lib/strapiUtils';
import SortControls from '@/components/ui/SortControls/SortControls'; // 1. Use the reusable component
import styles from '../../articles/ArticleGrid/ArticleGrid.module.scss'; // Reusing styles

const PAGE_SIZE = 6;
// 2. Define sort options for courses
const SORT_OPTIONS = [
    { value: 'latest', label: 'جدیدترین' },
    { value: 'price:asc', label: 'ارزان‌ترین' },
    { value: 'price:desc', label: 'گران‌ترین' },
];

const CourseGrid = ({ initialCourses }) => {
  const [courses, setCourses] = useState(initialCourses || []);
  const [sortBy, setSortBy] = useState('latest');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialCourses.length === PAGE_SIZE);

  // This logic is now identical to ProductGrid and ArticleGrid, just with different endpoints/params
  const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';

  useEffect(() => {
    const sortCourses = async () => {
      if (page === 1 && sortBy === 'latest') {
        setCourses(initialCourses);
        return;
      }
      setIsLoading(true);
      try {
        const itemsToFetch = Math.max(courses.length, PAGE_SIZE);
        const sortQuery = sortBy === 'latest' ? 'createdAt:desc' : sortBy;
        const response = await fetch(
          `${STRAPI_API_URL}/api/courses?populate=media&sort=${sortQuery}&pagination[page]=1&pagination[pageSize]=${itemsToFetch}`
        );
        const result = await response.json();
        const newCourses = formatStrapiCourses(result, STRAPI_API_URL);
        setCourses(newCourses);
        setPage(Math.ceil(itemsToFetch / PAGE_SIZE));
        setHasMore(result.meta.pagination.page < result.meta.pagination.pageCount);
      } catch (error) { console.error("Failed to sort courses:", error); } 
      finally { setIsLoading(false); }
    };
    sortCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  const handleLoadMore = async () => {
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const sortQuery = sortBy === 'latest' ? 'createdAt:desc' : sortBy;
      const response = await fetch(
        `${STRAPI_API_URL}/api/courses?populate=media&sort=${sortQuery}&pagination[page]=${nextPage}&pagination[pageSize]=${PAGE_SIZE}`
      );
      const result = await response.json();
      const newCourses = formatStrapiCourses(result, STRAPI_API_URL);
      setCourses(prev => [...prev, ...newCourses]);
      setPage(nextPage);
      setHasMore(result.meta.pagination.page < result.meta.pagination.pageCount);
    } catch (error) { console.error("Failed to load more courses:", error); }
    finally { setIsLoading(false); }
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