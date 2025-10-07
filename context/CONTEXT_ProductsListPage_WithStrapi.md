
# Feature Context: Refactor Products Listing Page to use Strapi

## 1. Goal
To refactor the main product listing page (`/app/products/page.js`) to fetch its initial data directly from the Strapi API instead of the mock file.

## 2. File to be Updated
- `src/app/products/page.js`

## 3. Final Code for `page.js`
The component will become an `async` function that fetches data from Strapi and passes the real, formatted data to the `ProductGrid` client component.

```jsx
import ProductGrid from '@/modules/products/ProductGrid/ProductGrid';
import styles from './products.module.scss';

// SEO Metadata for the page
export const metadata = {
  title: 'محصولات | فروشگاه آنلاین',
  description: 'لیست کامل محصولات فروشگاه ما را مشاهده کنید.',
};

/**
 * Fetches the initial products from the Strapi API.
 * This is a separate function for clarity and reusability.
 */
async function getInitialProducts() {
  const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
  
  try {
    // Fetch the first page of products, sorted by creation date
    const response = await fetch(`${STRAPI_API_URL}/api/products?populate=*&sort=createdAt:desc`);
    
    // It's good practice to check if the response was successful
    if (!response.ok) {
      throw new Error('Failed to fetch initial products');
    }

    const result = await response.json();
    
    // Format the data to match the component's expected structure
    const formattedProducts = result.data.map(item => ({ 
      id: item.id, 
      ...item.attributes 
    }));

    return formattedProducts;
  } catch (error) {
    console.error("Initial Products Fetch Error:", error);
    return []; // Return an empty array in case of an error
  }
}

// This is an async Server Component
async function ProductsPage() {
  const initialProducts = await getInitialProducts();

  return (
    <main className={styles.main}>
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>محصولات</h1>
        </header>
        
        {/* Pass the REAL server-fetched data to the client component */}
        <ProductGrid initialProducts={initialProducts} />
      </div>
    </main>
  );
}

export default ProductsPage;
