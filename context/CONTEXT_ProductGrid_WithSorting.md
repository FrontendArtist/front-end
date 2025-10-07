# Feature Context: Add Sorting to ProductGrid (using Strapi API)

## 1. Goal
To refactor the initial `ProductGrid` component to add sorting controls and fetch sorted data directly from the Strapi API.

## 2. Component File to be Updated
- `src/modules/products/ProductGrid/ProductGrid.jsx`

## 3. Stylesheet to be Updated
- `src/modules/products/ProductGrid/ProductGrid.module.scss`

## 4. Final Code for `ProductGrid.jsx`
The component will be updated to manage a `sortBy` state and use `useEffect` to fetch data from the live Strapi API when this state changes.

```jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import ProductCard from '@/components/cards/ProductCard/ProductCard';
import styles from './ProductGrid.module.scss';

const ProductGrid = ({ initialProducts }) => {
  const [products, setProducts] = useState(initialProducts || []);
  const [sortBy, setSortBy] = useState('latest'); // 'latest', 'price:asc', 'price:desc'
  const [isLoading, setIsLoading] = useState(false);

  const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';

  const fetchProducts = useCallback(async () => {
    // We don't need to fetch if we are just showing the initial server-rendered products
    if (sortBy === 'latest' && products === initialProducts) {
      return;
    }

    setIsLoading(true);
    try {
      const sortQuery = sortBy === 'latest' ? 'createdAt:desc' : sortBy;
      // We add `populate=*` to ensure all fields, including nested ones like images, are fetched.
      const response = await fetch(`${STRAPI_API_URL}/api/products?populate=*&sort=${sortQuery}`);
      const result = await response.json();
      
      const formattedProducts = result.data.map(item => ({ 
        id: item.id, 
        ...item.attributes 
      }));
      setProducts(formattedProducts);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sortBy, STRAPI_API_URL, initialProducts, products]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className={styles.productGridWrapper}>
      <div className={styles.sortControls}>
        <button onClick={() => setSortBy('latest')} disabled={sortBy === 'latest'}>جدیدترین</button>
        <button onClick={() => setSortBy('price:asc')} disabled={sortBy === 'price:asc'}>ارزان‌ترین</button>
        <button onClick={() => setSortBy('price:desc')} disabled={sortBy === 'price:desc'}>گران‌ترین</button>
      </div>
      
      {isLoading ? (
        <p>در حال بارگذاری...</p> 
      ) : (
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export `default` ProductGrid;
5. SCSS code to add to ProductGrid.module.scss
Add the following styles for the new sorting controls to your existing stylesheet.

SCSS

.sortControls {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;

  button {
    padding: 0.5rem 1rem;
    cursor: pointer;
    border: 1px solid var(--color-text-primary);
    background-color: transparent;
    color: var(--color-text-primary);
    border-radius: 8px;
    transition: all 0.2s ease;
    
    &:hover:not(:disabled) {
      background-color: var(--color-text-primary);
      color: var(--color-bg-primary);
    }

    &:disabled {
      background-color: var(--color-text-primary);
      color: var(--color-bg-primary);
      cursor: not-allowed;
      opacity: 0.7;
    }
  }
}