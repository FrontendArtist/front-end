# Feature Context: Add "Load More" Pagination to ProductGrid

## 1. Goal
To complete the `ProductGrid` component by adding "Load More" functionality. The component will keep track of the current page and fetch the next page of results from the Strapi API when a button is clicked, appending the new products to the existing list.

## 2. Component File to be Updated
- `src/modules/products/ProductGrid/ProductGrid.jsx`

## 3. Stylesheet to be Updated
- `src/modules/products/ProductGrid/ProductGrid.module.scss`

## 4. Final Code for `ProductGrid.jsx`
The component will be updated to manage `page` and `hasMore` states. The fetch logic will be modified to handle pagination.

```jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import ProductCard from '@/components/cards/ProductCard/ProductCard';
import { formatStrapiProducts } from '@/lib/strapiUtils';
import styles from './ProductGrid.module.scss';

const PAGE_SIZE = 20; // As per the spec file

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
        setPage(1); // Reset page on sort
      }

      // Check if there are more pages to load from meta data
      setHasMore(result.meta.pagination.page < result.meta.pagination.pageCount);

    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, sortBy, STRAPI_API_URL]);

  useEffect(() => {
    // This effect now only runs when the sort option changes, not on initial load
    // The initial data comes from the server
    fetchProducts();
  }, [sortBy]); // We remove fetchProducts from here to avoid re-fetching on page change

  const handleLoadMore = () => {
    fetchProducts(true); // Call fetch with loadMore flag
  };

  return (
    <div className={styles.productGridWrapper}>
      <div className={styles.sortControls}>{/* ... sorting buttons ... */}</div>
      
      <div className={styles.grid}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {isLoading && <p>در حال بارگذاری...</p>}

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

5. SCSS code to add to ProductGrid.module.scss
Add styles for the "Load More" button and its container.

SCSS

.loadMoreContainer {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

.loadMoreButton {
  // Use styles similar to the sort buttons, but perhaps larger
  padding: 0.75rem 2rem;
  font-size: 1rem;
  cursor: pointer;
  border: 1px solid var(--color-text-primary);
  background-color: var(--color-text-primary);
  color: var(--color-bg-primary);
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background-color: var(--color-title-hover);
    border-color: var(--color-title-hover);
  }
}