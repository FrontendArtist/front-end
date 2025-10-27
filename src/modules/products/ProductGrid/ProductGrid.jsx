'use client';

import { useState, useEffect } from 'react';
import ProductCard from '@/components/cards/ProductCard/ProductCard';
import SortControls from '@/components/ui/SortControls/SortControls';
import styles from './ProductGrid.module.scss';

const PAGE_SIZE = 3;

// تعریف گزینه‌های مرتب‌سازی
const SORT_OPTIONS = [
  { value: 'latest', label: 'جدیدترین' },
  { value: 'price:asc', label: 'ارزان‌ترین' },
  { value: 'price:desc', label: 'گران‌ترین' },
];

/**
 * ProductGrid - نمایش شبکه‌ای محصولات با قابلیت مرتب‌سازی و بارگذاری بیشتر
 * 
 * جریان داده (Data Flow):
 * این کامپوننت → fetch('/api/products') → Next.js Route Handler → Domain API → Strapi
 * 
 * مزایای استفاده از Route Handler داخلی:
 * - حذف وابستگی مستقیم به Strapi URL
 * - امنیت بیشتر (API keys فاش نمی‌شوند)
 * - تست‌پذیری بالاتر
 * - امکان افزودن middleware (auth, caching) در آینده
 * 
 * @param {Array} initialProducts - محصولات اولیه از SSR
 */
const ProductGrid = ({ initialProducts }) => {
  const [products, setProducts] = useState(initialProducts || []);
  const [sortBy, setSortBy] = useState('latest');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialProducts.length === PAGE_SIZE);

  // Effect: مرتب‌سازی محصولات
  // هنگامی که کاربر ترتیب مرتب‌سازی را تغییر می‌دهد، محصولات را از ابتدا واکشی می‌کنیم
  useEffect(() => {
    const sortProducts = async () => {
      // جلوگیری از اجرا در بارگذاری اولیه با sort پیش‌فرض
      if (page === 1 && sortBy === 'latest') {
        setProducts(initialProducts);
        return;
      }

      setIsLoading(true);
      try {
        // محاسبه تعداد آیتم‌های فعلی برای حفظ تعداد نمایش
        const itemsToFetch = Math.max(products.length, PAGE_SIZE);
        const sortQuery = sortBy === 'latest' ? 'createdAt:desc' : sortBy;
        
        // ✅ استفاده از Route Handler داخلی Next.js به‌جای Strapi مستقیم
        // Client → /api/products → Next.js Route Handler → Domain API → Strapi
        const response = await fetch(
          `/api/products?page=1&pageSize=${itemsToFetch}&sort=${sortQuery}`
        );
        const result = await response.json();
        
        // داده‌ها از Route Handler قبلاً فرمت شده برمی‌گردند
        setProducts(result.data);
        setPage(Math.ceil(itemsToFetch / PAGE_SIZE));
        setHasMore(result.meta.pagination.page < result.meta.pagination.pageCount);
      } catch (error) {
        console.error("خطا در مرتب‌سازی محصولات:", error);
      } finally {
        setIsLoading(false);
      }
    };

    sortProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  // Handler: بارگذاری صفحه بعدی محصولات
  // هنگام کلیک روی دکمه "بارگذاری بیشتر"
  const handleLoadMore = async () => {
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const sortQuery = sortBy === 'latest' ? 'createdAt:desc' : sortBy;
      
      // ✅ استفاده از Route Handler داخلی Next.js به‌جای Strapi مستقیم
      // Client → /api/products → Next.js Route Handler → Domain API → Strapi
      const response = await fetch(
        `/api/products?page=${nextPage}&pageSize=${PAGE_SIZE}&sort=${sortQuery}`
      );
      const result = await response.json();

      // داده‌ها از Route Handler قبلاً فرمت شده برمی‌گردند
      setProducts(prevProducts => [...prevProducts, ...result.data]);
      setPage(nextPage);
      setHasMore(result.meta.pagination.page < result.meta.pagination.pageCount);
    } catch (error) {
      console.error("خطا در بارگذاری محصولات بیشتر:", error);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className={styles.productGridWrapper}>
      {/* 3. جایگزینی دکمه‌های قدیمی با کامپوننت جدید */}
      <SortControls
        options={SORT_OPTIONS}
        currentSort={sortBy}
        onSortChange={setSortBy}
      />
      
      <div className={styles.grid}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {isLoading && <p className={styles.loadingText}>در حال بارگذاری...</p>}

      {hasMore && !isLoading && (
        <div className={styles.loadMoreContainer}>
          <button onClick={handleLoadMore} className={styles.loadMoreButton}>
            بارگذاری بیشتر
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;