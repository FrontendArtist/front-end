'use client';

import { useState, useEffect } from 'react';
import ProductCard from '@/components/cards/ProductCard/ProductCard';
import { formatStrapiProducts } from '@/lib/strapiUtils';
import SortControls from '@/components/ui/SortControls/SortControls'; // 1. ایمپورت کامپوننت جدید
import styles from './ProductGrid.module.scss';

const PAGE_SIZE = 3;
// 2. تعریف گزینه‌های مرتب‌سازی برای پاس دادن به کامپوننت جدید
const SORT_OPTIONS = [
  { value: 'latest', label: 'جدیدترین' },
  { value: 'price:asc', label: 'ارزان‌ترین' },
  { value: 'price:desc', label: 'گران‌ترین' },
];

const ProductGrid = ({ initialProducts }) => {
  const [products, setProducts] = useState(initialProducts || []);
  const [sortBy, setSortBy] = useState('latest');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialProducts.length === PAGE_SIZE);

  // ... (تمام منطق useEffect و handleLoadMore شما بدون تغییر باقی می‌ماند)

  const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';

  useEffect(() => {
    const sortProducts = async () => {
      // Don't run on initial load if sortBy is the default
      if (page === 1 && sortBy === 'latest') {
        setProducts(initialProducts);
        return;
      }

      setIsLoading(true);
      try {
        const itemsToFetch = Math.max(products.length, PAGE_SIZE);
        const sortQuery = sortBy === 'latest' ? 'createdAt:desc' : sortBy;
        
        const response = await fetch(
          `${STRAPI_API_URL}/api/products?populate=*&sort=${sortQuery}&pagination[page]=1&pagination[pageSize]=${itemsToFetch}`
        );
        const result = await response.json();
        const newProducts = formatStrapiProducts(result, STRAPI_API_URL);
        
        setProducts(newProducts);
        setPage(Math.ceil(itemsToFetch / PAGE_SIZE));
        setHasMore(result.meta.pagination.page < result.meta.pagination.pageCount);
      } catch (error) {
        console.error("Failed to sort products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    sortProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  const handleLoadMore = async () => {
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const sortQuery = sortBy === 'latest' ? 'createdAt:desc' : sortBy;
      const response = await fetch(
        `${STRAPI_API_URL}/api/products?populate=*&sort=${sortQuery}&pagination[page]=${nextPage}&pagination[pageSize]=${PAGE_SIZE}`
      );
      const result = await response.json();
      const newProducts = formatStrapiProducts(result, STRAPI_API_URL);

      setProducts(prevProducts => [...prevProducts, ...newProducts]);
      setPage(nextPage);
      setHasMore(result.meta.pagination.page < result.meta.pagination.pageCount);
    } catch (error) {
      console.error("Failed to load more products:", error);
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