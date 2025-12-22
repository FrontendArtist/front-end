'use client';

import { useState } from 'react';
import ServiceCard from '@/components/cards/ServiceCard/ServiceCard';
import ListGuard from '@/components/layout/ListGuard';
import { SERVICES_PAGE_SIZE } from '@/lib/constants';
import styles from './ServiceGrid.module.scss';

/**
 * ServiceGrid - نمایش شبکه‌ای خدمات با قابلیت بارگذاری بیشتر
 * 
 * جریان داده (Data Flow):
 * این کامپوننت → fetch('/api/services') → Next.js Route Handler → Domain API → Strapi
 * 
 * مزایای استفاده از Route Handler داخلی:
 * - حذف وابستگی مستقیم به Strapi URL
 * - امنیت بیشتر (API keys فاش نمی‌شوند)
 * - تست‌پذیری بالاتر
 * - امکان افزودن middleware (auth, caching) در آینده
 * 
 * Grid Layout:
 * - Desktop (>960px): 4 columns
 * - Tablet (768px-960px): 3 columns
 * - Mobile (<768px): 2 columns
 * 
 * @param {Array} initialServices - خدمات اولیه از SSR
 */
const ServiceGrid = ({ initialServices }) => {
  // State: لیست خدمات، صفحه فعلی، وضعیت بارگذاری، و وجود صفحات بیشتر
  const [services, setServices] = useState(initialServices || []);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialServices.length === SERVICES_PAGE_SIZE);

  /**
   * Handler: بارگذاری صفحه بعدی خدمات
   * هنگام کلیک روی دکمه "بارگذاری بیشتر"
   * 
   * جریان:
   * 1. تنظیم loading به true
   * 2. درخواست به /api/services با page جدید
   * 3. دریافت و افزودن خدمات جدید به لیست
   * 4. به‌روزرسانی state های page و hasMore
   */
  const handleLoadMore = async () => {
    setIsLoading(true);
    try {
      const nextPage = page + 1;

      // ✅ استفاده از Route Handler داخلی Next.js به‌جای Strapi مستقیم
      // Client → /api/services → Next.js Route Handler → Domain API → Strapi
      const response = await fetch(
        `/api/services?page=${nextPage}&pageSize=${SERVICES_PAGE_SIZE}`
      );
      const result = await response.json();

      // داده‌ها از Route Handler قبلاً فرمت شده برمی‌گردند
      setServices(prevServices => [...prevServices, ...result.data]);
      setPage(nextPage);
      setHasMore(result.meta.pagination.page < result.meta.pagination.pageCount);
    } catch (error) {
      console.error("خطا در بارگذاری خدمات بیشتر:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Main Grid Rendering with ListGuard
   * ListGuard handles empty state automatically
   * نمایش شبکه کارت‌های خدمات با دکمه بارگذاری بیشتر
   */
  return (
    <ListGuard data={services} entityName="خدمت" resetLink="/services">
      <div className={styles.serviceGrid}>
        {/* شبکه واکنش‌گرا با تنظیم خودکار ستون‌ها */}
        <div className={styles.serviceGrid__container}>
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
            />
          ))}
        </div>

        {/* دکمه بارگذاری بیشتر - فقط هنگامی که صفحات بیشتری وجود دارد */}
        {hasMore && (
          <div className={styles.loadMoreContainer}>
            <button
              onClick={handleLoadMore}
              className={styles.loadMoreButton}
              disabled={isLoading}
            >
              {isLoading ? 'در حال بارگذاری...' : 'بارگذاری بیشتر'}
            </button>
          </div>
        )}

        {/* نمایش Loading State */}
        {isLoading && !hasMore && (
          <p className={styles.loadingText}>در حال بارگذاری...</p>
        )}
      </div>
    </ListGuard>
  );
};

export default ServiceGrid;
