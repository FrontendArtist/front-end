'use client';

/**
 * RelatedProducts — Client Component
 *
 * نمایش اسلایدر محصولات هم‌دسته‌بندی با استثنا کردن محصول جاری.
 *
 * این کامپوننت به صورت Client Component تعریف شده زیرا BaseSlider
 * یک Client Component است. داده‌ها از page.js (Server) fetch شده
 * و به صورت prop پاس می‌شوند — هیچ fetch سمت کلاینت انجام نمی‌شود.
 *
 * @param {{ products: Array<object> }} props
 */

import BaseSlider from '@/components/layout/BaseSlider/BaseSlider';
import ProductCard from '@/components/cards/ProductCard/ProductCard';
import styles from './RelatedProducts.module.scss';

export default function RelatedProducts({ products }) {
  // اگر محصولی وجود نداشت، بخش را رندر نکن
  if (!products || products.length === 0) {
    return null;
  }

  /**
   * تابع رندر کارت محصول برای BaseSlider
   * @param {object} product
   */
  const renderProductCard = (product) => <ProductCard product={product} />;

  return (
    <section className={styles.relatedSection} aria-label="محصولات مرتبط">
      {/* عنوان بخش */}
      <header className={styles.header}>
        <h2 className={styles.sectionTitle}>محصولات مرتبط</h2>
        <p className={styles.sectionSubtitle}>محصولاتی که ممکن است به آن‌ها علاقه‌مند باشید</p>
      </header>

      {/* اسلایدر محصولات */}
      <div className={styles.sliderWrapper}>
        <BaseSlider
          items={products}
          renderItem={renderProductCard}
          slidesPerView={3}
          loop={products.length > 3}
          breakpoints={{
            0: { slidesPerView: 1, spaceBetween: 16 },
            576: { slidesPerView: 2, spaceBetween: 20 },
            900: { slidesPerView: 3, spaceBetween: 24 },
            1200: { slidesPerView: 3, spaceBetween: 28 },
          }}
        />
      </div>
    </section>
  );
}
