'use client';

import { useState, useEffect, useCallback } from 'react';
import ProductCard from '@/components/cards/ProductCard/ProductCard';
import { formatStrapiProducts } from '@/lib/strapiUtils';
import styles from './ProductGrid.module.scss';

const PAGE_SIZE = 1;

const ProductGrid = ({ initialProducts }) => {
  const [products, setProducts] = useState(initialProducts || []);
  const [sortBy, setSortBy] = useState('latest');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialProducts.length === PAGE_SIZE);

  const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';

  const fetchProducts = useCallback(async (isLoadMore = false) => {
    setIsLoading(true);
    try {
      const currentPage = isLoadMore ? page + 1 : 1;
      const sortQuery = sortBy === 'latest' ? 'createdAt:desc' : sortBy;
      
      const response = await fetch(
        `${STRAPI_API_URL}/api/products?populate=*&sort=${sortQuery}&pagination[page]=${currentPage}&pagination[pageSize]=${PAGE_SIZE}`
      );
      const result = await response.json();
      
      const newProducts = formatStrapiProducts(result);

      if (isLoadMore) {
        setProducts(prevProducts => [...prevProducts, ...newProducts]);
        setPage(currentPage);
      } else {
        setProducts(newProducts);
        setPage(1);
      }

      setHasMore(result.meta.pagination.page < result.meta.pagination.pageCount);

    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, sortBy, STRAPI_API_URL]);

  useEffect(() => {
    fetchProducts();
  }, [sortBy]);

  const handleLoadMore = () => {
    fetchProducts(true);
  };

  return (
    <div className={styles.productGridWrapper}>
      <div className={styles.sortControls}>
        <button onClick={() => setSortBy('latest')} disabled={sortBy === 'latest'}>جدیدترین</button>
        <button onClick={() => setSortBy('price:asc')} disabled={sortBy === 'price:asc'}>ارزان‌ترین</button>
        <button onClick={() => setSortBy('price:desc')} disabled={sortBy === 'price:desc'}>گران‌ترین</button>
      </div>
      
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
