'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import ProductCard from '@/components/cards/ProductCard/ProductCard';
import CardSkeletonVertical from '@/components/ui/Skeleton/CardSkeletonVertical';
import SortControls from '@/components/ui/SortControls/SortControls';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import { PRODUCTS_PAGE_SIZE } from '@/lib/constants';
import styles from './ProductGrid.module.scss';

const PAGE_SIZE = PRODUCTS_PAGE_SIZE;

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'جدیدترین' }
];

/**
 * ProductGrid - Grid with sorting, pagination, and category/subcategory filtering
 */
const ProductGrid = ({
  initialProducts = [],
  initialMeta = {},
  activeCategory = '',
  activeSubCategory = '',
  sort = 'createdAt:desc',
  onSortChange
}) => {
  const [products, setProducts] = useState(initialProducts || []);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(initialMeta?.pagination?.page || 1);
  const [hasMore, setHasMore] = useState(
    (initialMeta?.pagination?.page || 1) < (initialMeta?.pagination?.pageCount || 1)
  );
  const isInitialMount = useRef(true);

  const queryBase = useMemo(() => {
    const params = new URLSearchParams();
    if (activeCategory) params.set('category', activeCategory);
    if (activeSubCategory) params.set('sub', activeSubCategory);
    return params;
  }, [activeCategory, activeSubCategory]);

  // همگام‌سازی با داده‌های ورودی سرور هنگام تغییر فیلترهای URL
  useEffect(() => {
    setProducts(initialProducts || []);
    const p = initialMeta?.pagination;
    setPage(p?.page || 1);
    setHasMore((p?.page || 1) < (p?.pageCount || 1));
  }, [initialProducts, activeCategory, activeSubCategory, initialMeta]);

  // Refetch on sort/category/sub change → reset to page 1 and replace products
  useEffect(() => {
    // جلوگیری از اجرای تکراری در بارگذاری اولیه (mount)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const refetch = async () => {
      setIsLoading(true);
      setProducts([]); // Clear old products to show skeletons
      try {
        const params = new URLSearchParams(queryBase.toString());
        params.set('page', '1');
        params.set('pageSize', String(PAGE_SIZE));
        params.set('sort', sort);
        const res = await fetch(`/api/products?${params.toString()}`);
        const result = await res.json();
        setProducts(result.data);
        const p = result?.meta?.pagination;
        setPage(p?.page || 1);
        setHasMore((p?.page || 1) < (p?.pageCount || 1));
      } catch (e) {
        console.error('خطا در واکشی محصولات:', e);
      } finally {
        setIsLoading(false);
      }
    };
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, activeCategory, activeSubCategory]);

  const handleLoadMore = async () => {
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const params = new URLSearchParams(queryBase.toString());
      params.set('page', String(nextPage));
      params.set('pageSize', String(PAGE_SIZE));
      params.set('sort', sort);
      const response = await fetch(`/api/products?${params.toString()}`);
      const result = await response.json();
      setProducts(prev => [...prev, ...result.data]);
      const p = result?.meta?.pagination;
      setPage(p?.page || nextPage);
      setHasMore((p?.page || nextPage) < (p?.pageCount || 1));
    } catch (error) {
      console.error('خطا در بارگذاری محصولات بیشتر:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.productGridWrapper}>
      {(!isLoading && products.length === 0) ? (
        <EmptyState title="هیچ محصولی یافت نشد" />
      ) : (
        <>
          <SortControls
            options={SORT_OPTIONS}
            currentSort={sort}
            onSortChange={onSortChange}
          />

          <div className={styles.grid}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
            
            {/* Show skeletons when loading */}
            {isLoading && Array.from({ length: PAGE_SIZE || 6 }).map((_, index) => (
              <CardSkeletonVertical key={`skeleton-${index}`} showDescription={false} />
            ))}
          </div>

          {hasMore && !isLoading && (
            <div className={styles.loadMoreContainer}>
              <button onClick={handleLoadMore} className={styles.loadMoreButton}>
                بارگذاری بیشتر
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProductGrid;