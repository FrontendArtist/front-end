# Feature Context: ProductGrid Client Component (Initial Version)

## 1. Goal
To create the initial version of the `ProductGrid` client component. This component will receive an initial list of products from its parent server component and display them in a responsive grid.

## 2. Component Files
Create the necessary folder structure and files:
- `src/modules/products/ProductGrid/ProductGrid.jsx`
- `src/modules/products/ProductGrid/ProductGrid.module.scss`

## 3. JSX Structure (`ProductGrid.jsx`)
This must be a client component that uses `useState` to manage the list of products.

```jsx
'use client';

import { useState } from 'react';
import ProductCard from '@/components/cards/ProductCard/ProductCard';
import styles from './ProductGrid.module.scss';

/**
 * A client component that displays a grid of products.
 * @param {{
 * initialProducts: any[];
 * }} props
 */
const ProductGrid = ({ initialProducts }) => {
  const [products, setProducts] = useState(initialProducts || []);
  // We will add more states for sorting, loading, pagination etc. in the next steps.

  return (
    <div className={styles.productGridWrapper}>
      {/* Sorting controls will be added here later */}
      
      {products.length > 0 ? (
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p>هیچ محصولی یافت نشد.</p>
      )}

      {/* "Load More" button will be added here later */}
    </div>
  );
};

export default ProductGrid;
4. SCSS (ProductGrid.module.scss)
Create a responsive grid layout for the products.

SCSS

.grid {
  display: grid;
  // Create a responsive grid that shows 4 columns on large screens, 3 on medium, and 2 on small.
  grid-template-columns: repeat(4, 1fr);
  gap: 2rem; // Use a variable for this if available

  // Example of responsive adjustments using mixins
  // @include respond(lg) { grid-template-columns: repeat(3, 1fr); }
  // @include respond(md) { grid-template-columns: repeat(2, 1fr); }
}