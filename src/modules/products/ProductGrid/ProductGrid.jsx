'use client';

import { useState, useEffect } from 'react';
import ProductCard from '@/components/cards/ProductCard/ProductCard';
import { formatStrapiProducts } from '@/lib/strapiUtils';
import styles from './ProductGrid.module.scss';

const PAGE_SIZE = 3; // Or your desired page size

const ProductGrid = ({ initialProducts }) => {
  const [products, setProducts] = useState(initialProducts || []);
  const [sortBy, setSortBy] = useState('latest');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialProducts.length === PAGE_SIZE);

  const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';

  // Effect for handling SORTING with the new logic
  useEffect(() => {
    // This function runs when the sortBy state changes.
    const sortProducts = async () => {
      // Don't do anything if we are on the initial state (avoids extra fetch on first load)
      if (page === 1 && sortBy === 'latest') {
        return;
      }

      setIsLoading(true);
      try {
        // Fetch as many items as are currently shown, but with the new sort order.
        const itemsToFetch = Math.max(products.length, PAGE_SIZE);
        const sortQuery = sortBy === 'latest' ? 'createdAt:desc' : sortBy;
        
        const response = await fetch(
          `${STRAPI_API_URL}/api/products?populate=*&sort=${sortQuery}&pagination[page]=1&pagination[pageSize]=${itemsToFetch}`
        );
        const result = await response.json();
        const newProducts = formatStrapiProducts(result);
        
        setProducts(newProducts);
        // Recalculate the current page based on the number of items fetched
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
  }, [sortBy]); // This effect ONLY runs when sortBy changes

  // Handler for LOADING MORE (this logic remains the same)
  const handleLoadMore = async () => {
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const sortQuery = sortBy === 'latest' ? 'createdAt:desc' : sortBy;
      const response = await fetch(
        `${STRAPI_API_URL}/api/products?populate=*&sort=${sortQuery}&pagination[page]=${nextPage}&pagination[pageSize]=${PAGE_SIZE}`
      );
      const result = await response.json();
      const newProducts = formatStrapiProducts(result);

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