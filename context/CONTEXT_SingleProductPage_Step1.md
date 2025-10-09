# Feature Context: Single Product Page (Structure & Data Fetching)

## 1. Goal
To create the basic structure for the dynamic single product page (`/products/[slug]`). This includes setting up the file-based routing, fetching data from Strapi based on the slug, handling SEO metadata, and creating the initial two-column layout.

## 2. File and Folder Structure
Create a new dynamic route folder and the necessary files:
- Folder: `src/app/products/[slug]`
- File: `src/app/products/[slug]/page.js`
- File: `src/app/products/[slug]/page.module.scss`

## 3. Page Logic (`page.js`)
This server component will be responsible for fetching all possible paths (`generateStaticParams`), generating dynamic metadata for SEO, and fetching the specific product's data for rendering.

```jsx
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { formatStrapiProducts } from '@/lib/strapiUtils';
import styles from './page.module.scss';

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';

// Function to fetch a single product by its slug
async function getProductBySlug(slug) {
  try {
    const response = await fetch(
      `${STRAPI_API_URL}/api/products?populate=*&filters[slug][$eq]=${slug}`,
      { next: { revalidate: 60 } } // ISR: Revalidate every 60 seconds
    );
    if (!response.ok) return null;
    const result = await response.json();
    if (!result.data || result.data.length === 0) return null;
    
    // Use our existing formatter, it returns an array, so we take the first item
    const formatted = formatStrapiProducts(result);
    return formatted[0];

  } catch (error) {
    console.error("Failed to fetch product by slug:", error);
    return null;
  }
}

// Generate static paths for all products at build time
export async function generateStaticParams() {
  try {
    const response = await fetch(`${STRAPI_API_URL}/api/products`);
    const result = await response.json();
    return result.data.map((product) => ({
      slug: product.attributes.slug,
    }));
  } catch (error) {
    console.error("Failed to generate static params:", error);
    return [];
  }
}

// Generate dynamic metadata for each product page
export async function generateMetadata({ params }) {
  const product = await getProductBySlug(params.slug);
  if (!product) {
    return { title: 'محصول یافت نشد' };
  }
  return {
    title: `${product.title} | فروشگاه آنلاین`,
    description: product.shortDescription,
  };
}


// The main page component
export default async function ProductPage({ params }) {
  const { slug } = params;
  const product = await getProductBySlug(slug);

  // If product is not found, show the 404 page
  if (!product) {
    notFound();
  }

  return (
    <main className={styles.productPage}>
      <div className="container">
        <div className={styles.layoutGrid}>
          {/* Column 1: Product Gallery (Placeholder for now) */}
          <div className={styles.gallery}>
            <Image 
              src={product.image.url} 
              alt={product.image.alt} 
              width={500} 
              height={500} 
              className={styles.mainImage}
            />
            {/* Gallery thumbnails will be added later */}
          </div>

          {/* Column 2: Product Details */}
          <div className={styles.details}>
            <h1 className={styles.title}>{product.title}</h1>
            <div className={styles.price}>{product.price.toman.toLocaleString()} تومان</div>
            <p className={styles.description}>{product.shortDescription}</p>
            {/* Add to Cart button will be a client component, added later */}
            <button className="card-button">افزودن به سبد خرید</button>
          </div>
        </div>

        {/* Tabs and Related Products will be added here later */}
      </div>
    </main>
  );
}
4. SCSS (page.module.scss)
Create a responsive two-column grid for the main layout.



.productPage {
  padding: var(--space-section-top-desktop) 0;
}

.layoutGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-gap-desktop);

  // @include respond(md) {
  //   grid-template-columns: 1fr;
  // }
}

.mainImage {
  width: 100%;
  height: auto;
  border-radius: 16px;
}

.details {
  /* Styles for title, price, description etc. */
  .title {
    font-size: var(--font-xl);
    margin-bottom: 1rem;
  }
  .price {
    font-size: var(--font-lg);
    color: var(--color-text-primary);
    margin-bottom: 1.5rem;
  }
  .description {
    line-height: var(--line-height-lg);
    margin-bottom: 2rem;
  }
}