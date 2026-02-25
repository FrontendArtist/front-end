/**
 * ProductDetails Component
 * Reusable component for rendering product details page UI
 * 
 * Used in:
 * - /products/[category]/[subcategory]/[slug] (Deep route)
 * - /product/[slug] (Hybrid route)
 */

import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import ProductGallery from '@/components/products/ProductGallery/ProductGallery';
import styles from './ProductDetails.module.scss';

export default function ProductDetails({ product, breadcrumbItems }) {
  return (
    <main className={styles.productPage}>
      <div className="container">
        <Breadcrumb items={breadcrumbItems} />
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

