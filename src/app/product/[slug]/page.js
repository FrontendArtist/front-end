/**
 * Product Single Page - Dynamic Route
 * 
 * Data fetched via API Layer abstraction (productsApi.js)
 * Implements Server-Side Rendering (SSR) for optimal SEO
 */

import { notFound, redirect } from 'next/navigation';
import ProductGallery from '@/components/products/ProductGallery/ProductGallery';
import { getProductBySlug, getProductCategoryPath } from '@/lib/productsApi';
import styles from './page.module.scss';

/**
 * Generate Dynamic Metadata for SEO
 * Uses API Layer abstraction
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  
  if (!product) {
    return { title: 'محصول یافت نشد' };
  }
  
  return {
    title: `${product.title} | فروشگاه آنلاین`,
    description: product.shortDescription,
  };
}

/**
 * Product Page Component (Server Component)
 * 
 * Architecture:
 * - Uses getProductBySlug() from productsApi.js (no direct fetch)
 * - Follows Repository Pattern for clean separation of concerns
 * - Handles invalid slugs with notFound()
 */
export default async function ProductPage({ params }) {
  const { slug } = await params;
  
  // Data fetched via API Layer abstraction
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  // Redirect to new deep path under /products/[category]/[subcategory]/[slug]
  const pathInfo = await getProductCategoryPath(slug);
  if (pathInfo?.categorySlug) {
    const target = `/products/${pathInfo.categorySlug}${pathInfo.subcategorySlug ? `/${pathInfo.subcategorySlug}` : ''}/${slug}`;
    redirect(target);
  }

  return (
    <main className={styles.productPage}>
      <div className="container">
        <div className={styles.layoutGrid}>
          <div className={styles.gallery}>
            <ProductGallery images={product.images} />
          </div>

          <div className={styles.details}>
            <h1 className={styles.title}>{product.title}</h1>
            <div className={styles.price}>{product.price.toman.toLocaleString()} تومان</div>
            <p className={styles.description}>{product.shortDescription}</p>
            <button className="card-button">افزودن به سبد خرید</button>
          </div>
        </div>
      </div>
    </main>
  );
}



