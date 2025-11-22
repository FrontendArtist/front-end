/**
 * Product Single Page - Dynamic Route
 * 
 * Data fetched via API Layer abstraction (productsApi.js)
 * Implements Server-Side Rendering (SSR) for optimal SEO
 */

import { notFound, permanentRedirect } from 'next/navigation';
import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import ProductGallery from '@/components/products/ProductGallery/ProductGallery';
import { getProductBySlug, getProductCategoryPath } from '@/lib/productsApi';
import styles from './page.module.scss';

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
 * Legacy Product Page - Permanent Redirect Handler
 * 
 * Responsibilities:
 * - Fetch product to ensure slug validity
 * - Resolve canonical nested path
 * - Issue 301 redirect to new URL
 */
export default async function ProductPage({ params }) {
  const { slug } = await params;

  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const pathInfo = await getProductCategoryPath(slug);
  if (pathInfo?.categorySlug) {
    const target = `/products/${pathInfo.categorySlug}${
      pathInfo.subcategorySlug ? `/${pathInfo.subcategorySlug}` : ''
    }/${slug}`;

    permanentRedirect(target);
  }

  const breadcrumbItems = [
    { label: 'خانه', href: '/' },
    { label: 'محصولات', href: '/products' },
    { label: product.title, active: true },
  ];

  return (
    <main className={styles.productPage}>
      <div className="container">
        <Breadcrumb items={breadcrumbItems} />
        <div className={styles.layoutGrid}>
          <div className={styles.gallery}>
            <ProductGallery images={product.images} />
          </div>

          <div className={styles.details}>
            <h1 className={styles.detailsTitle}>{product.title}</h1>
            <div className={styles.detailsPrice}>{product.price.toman.toLocaleString()} تومان</div>
            <p className={styles.detailsDescription}>{product.shortDescription}</p>
            <button className="card-button">افزودن به سبد خرید</button>
          </div>
        </div>
      </div>
    </main>
  );
}



