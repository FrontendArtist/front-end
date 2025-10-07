# Feature Context: Products Listing Page (Server Component)

## 1. Goal
To create the main page file for the product listing page located at the `/products` route. This will be a server component responsible for initial data fetching and SEO metadata.

## 2. File and Folder Structure
Create a new folder `products` inside `src/app/`. Inside this new folder, create the `page.js` file.
- **Path:** `src/app/products/page.js`

## 3. JSX Structure (`page.js`)
The component will be an `async` function. It will import mock data, simulate fetching the first page of results, and pass this data to a `ProductGrid` client component (which we will create in the next step).

```jsx
import { mockProducts } from '@/data/mock';
import ProductGrid from '@/modules/products/ProductGrid/ProductGrid'; // We will create this component next
import styles from './products.module.scss';

// SEO Metadata for the page
export const metadata = {
  title: 'محصولات | فروشگاه آنلاین',
  description: 'لیست کامل محصولات فروشگاه ما را مشاهده کنید.',
};

// This is an async Server Component
async function ProductsPage() {
  // In a real application, this would be an API call.
  // We are simulating fetching the first 20 products.
  const initialProducts = mockProducts.slice(0, 20);

  return (
    <main className={styles.main}>
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>محصولات</h1>
          {/* We will add sorting controls here later */}
        </header>
        
        {/* Pass the server-fetched data to the client component */}
        <ProductGrid initialProducts={initialProducts} />
      </div>
    </main>
  );
}

export default ProductsPage;
4. SCSS (products.module.scss)
For now, we just need a simple stylesheet for the page layout. Create a products.module.scss file next to page.js.

Path: src/app/products/products.module.scss

SCSS

.main {
  padding-top: var(--space-section-top-desktop);
  padding-bottom: var(--space-section-bottom-desktop);
}

.header {
  margin-bottom: var(--space-title-content-desktop);
}

.title {
  font-size: var(--font-xl);
  color: var(--color-title-hover);
}